import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { JAKIM_ZONES } from '../../../../lib/zones';

export const GET: RequestHandler = async ({ params, fetch }) => {
  try {
    if (!params.zone) {
      return json({ error: 'Missing zone' }, { status: 400 });
    }

    const zoneCode = params.zone.toUpperCase();
    
    // Find state and zone label
    let zoneLabel = '';
    let stateName = '';
    for (const stateObj of JAKIM_ZONES) {
      const found = stateObj.zones.find(z => z.v === zoneCode);
      if (found) {
        zoneLabel = found.l;
        stateName = stateObj.state;
        break;
      }
    }

    if (!zoneLabel) {
      return json({ error: 'Invalid zone' }, { status: 400 });
    }

    // Fetch from internal /api/solat/[zone]
    let solatRes;
    try {
      solatRes = await fetch(`/api/solat/${zoneCode}`);
    } catch (fetchErr) {
      console.error("Internal fetch error in OG endpoint:", fetchErr);
      return json({ error: 'Failed to fetch prayer times' }, { status: 500 });
    }

    if (!solatRes.ok) {
      return json({ error: 'Failed to fetch prayer times' }, { status: solatRes.status });
    }

    const data = await solatRes.json();
    if (!data || !data.prayerTime || !Array.isArray(data.prayerTime)) {
      return json({ error: 'Invalid prayer times data format' }, { status: 500 });
    }

    // Get current date formatted in Asia/Kuala_Lumpur (DD-MMM-YYYY)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "numeric",
      year: "numeric"
    });
    const parts = formatter.formatToParts(now);
    const dayVal = parseInt(parts.find(p => p.type === "day")?.value || "1", 10);
    const monthVal = parseInt(parts.find(p => p.type === "month")?.value || "1", 10);
    const yearVal = parts.find(p => p.type === "year")?.value || "2026";
    const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedToday = `${String(dayVal).padStart(2, "0")}-${monthsNames[monthVal - 1]}-${yearVal}`;

    // Filter today's prayer times
    const todayPrayer = data.prayerTime.find((pt: any) => pt.date === formattedToday) || data.prayerTime[0];
    if (!todayPrayer) {
      return json({ error: 'No prayer times found for today' }, { status: 500 });
    }

    const formatTimeHHMM = (timeStr: string) => {
      if (!timeStr) return '--:--';
      const tParts = timeStr.split(':');
      if (tParts.length >= 2) {
        return `${tParts[0]}:${tParts[1]}`;
      }
      return timeStr;
    };

    const prayers = [
      { name: 'Subuh', time: formatTimeHHMM(todayPrayer.fajr) },
      { name: 'Syuruk', time: formatTimeHHMM(todayPrayer.syuruk) },
      { name: 'Zohor', time: formatTimeHHMM(todayPrayer.dhuhr) },
      { name: 'Asar', time: formatTimeHHMM(todayPrayer.asr) },
      { name: 'Maghrib', time: formatTimeHHMM(todayPrayer.maghrib) },
      { name: 'Isyak', time: formatTimeHHMM(todayPrayer.isha) }
    ];

    const gregorianDate = (todayPrayer.date || '').replace(/-/g, ' ');
    const dayName = todayPrayer.day || '';
    const hijriDate = (todayPrayer.hijri || '').replace(/-/g, ' ');
    const dateSubtitle = hijriDate ? `${dayName} • ${hijriDate}` : dayName;

    const cardWidth = 160;
    const cardHeight = 240;
    const startX = 80;
    const gap = 16;
    const startY = 290;

    let cardsSvg = '';
    prayers.forEach((p, idx) => {
      const x = startX + idx * (cardWidth + gap);
      cardsSvg += `
      <g transform="translate(${x}, ${startY})">
        <!-- Card Glass Background -->
        <rect width="${cardWidth}" height="${cardHeight}" rx="24" fill="url(#card-grad)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" />
        
        <!-- Accent Line -->
        <line x1="24" y1="36" x2="48" y2="36" stroke="#4bdf95" stroke-width="3" stroke-linecap="round" opacity="0.8" />
        
        <!-- Prayer Name -->
        <text x="24" y="80" fill="#bfc9c3" font-size="18" font-weight="600" class="text-body">${p.name}</text>
        
        <!-- Prayer Time -->
        <text x="24" y="160" fill="#ffffff" font-size="36" font-weight="800" class="text-title">${p.time}</text>
      </g>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <!-- Gradients -->
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0e1512" />
        <stop offset="100%" stop-color="#050807" />
      </linearGradient>
      <linearGradient id="card-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.07)" />
        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
      </linearGradient>
      <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4bdf95" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#006c54" stop-opacity="0" />
      </linearGradient>
      <style>
        .text-title { font-family: 'Plus Jakarta Sans', 'Google Sans', system-ui, sans-serif; font-weight: 800; }
        .text-body { font-family: 'Plus Jakarta Sans', 'Google Sans', system-ui, sans-serif; font-weight: 500; }
      </style>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg-grad)" />
    
    <!-- Decorative Background Glow -->
    <circle cx="200" cy="150" r="300" fill="url(#glow-grad)" filter="blur(80px)" />
    <circle cx="1000" cy="450" r="300" fill="url(#glow-grad)" filter="blur(80px)" />

    <!-- Outer Glassmorphic Border Frame -->
    <rect x="30" y="30" width="1140" height="570" rx="36" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />

    <!-- Branding / Header -->
    <g transform="translate(80, 80)">
      <rect width="48" height="48" rx="14" fill="#4bdf95" opacity="0.2" />
      <path d="M16 24 L24 16 L32 24 L24 32 Z" stroke="#4bdf95" stroke-width="3" fill="none" stroke-linejoin="round" />
      <circle cx="24" cy="24" r="3" fill="#4bdf95" />
      
      <text x="64" y="32" fill="#4bdf95" font-size="20" font-weight="900" letter-spacing="4" class="text-title">WAKTU SOLAT</text>
    </g>

    <!-- Zone & State Info -->
    <g transform="translate(80, 185)">
      <text x="0" y="0" fill="#ffffff" font-size="44" font-weight="800" class="text-title">${stateName}</text>
      <text x="0" y="40" fill="#bfc9c3" font-size="20" font-weight="500" class="text-body">${zoneLabel} (${zoneCode})</text>
    </g>

    <!-- Dates -->
    <g transform="translate(1120, 100)" text-anchor="end">
      <text x="0" y="0" fill="#ffffff" font-size="24" font-weight="700" class="text-body">${gregorianDate}</text>
      <text x="0" y="32" fill="#4bdf95" font-size="18" font-weight="600" class="text-body">${dateSubtitle}</text>
    </g>

    <!-- Divider Line -->
    <line x1="80" y1="260" x2="1120" y2="260" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />

    <!-- 6 Prayer Cards -->
    ${cardsSvg}
  </svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error) {
    console.error("Error generating OG image SVG:", error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
