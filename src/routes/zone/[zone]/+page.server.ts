import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { JAKIM_ZONES } from '../../../lib/zones';
import { ZONE_COORDINATES } from '../../../lib/zoneCoordinates';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const zone = params.zone.toUpperCase();
  
  // Find zone details
  let zoneLabel = '';
  let stateName = '';
  for (const s of JAKIM_ZONES) {
    const found = s.zones.find(z => z.v === zone);
    if (found) {
      zoneLabel = found.l;
      stateName = s.state;
      break;
    }
  }

  if (!zoneLabel || !ZONE_COORDINATES[zone]) {
    throw error(404, `Zone ${zone} not found`);
  }

  // Fetch from the internal endpoint
  const res = await fetch(`/api/solat/${zone}`);
  if (!res.ok) {
    throw error(res.status, `Failed to fetch prayer times for zone ${zone}`);
  }

  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.prayerTime)) {
    throw error(500, 'Invalid prayer times data structure');
  }

  // Today's date in Asia/Kuala_Lumpur format DD-MMM-YYYY (e.g. 10-Jun-2026)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "numeric",
    year: "numeric"
  });
  
  const now = new Date();
  const parts = formatter.formatToParts(now);
  const dayVal = parseInt(parts.find(p => p.type === "day")?.value || "1", 10);
  const monthVal = parseInt(parts.find(p => p.type === "month")?.value || "1", 10);
  const yearVal = parts.find(p => p.type === "year")?.value || "2026";
  const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedToday = `${String(dayVal).padStart(2, "0")}-${monthsNames[monthVal - 1]}-${yearVal}`;

  // Filter prayer times list to find today's date
  const todayPrayers = data.prayerTime.find((p: any) => p.date === formattedToday);
  if (!todayPrayers) {
    throw error(500, `Could not find prayer times for date ${formattedToday}`);
  }

  return {
    zone,
    zoneLabel,
    stateName,
    todayPrayers,
    gregorianDate: todayPrayers.date,
    hijriDate: todayPrayers.hijri,
    dayName: todayPrayers.day
  };
};
