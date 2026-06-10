import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as adhan from 'adhan';
import { ZONE_COORDINATES } from '../../../../lib/zoneCoordinates';
import { calculateLocalFallback } from '../../../../lib/server/solat';

export const GET: RequestHandler = async ({ params, url, fetch }) => {
  try {
    if (!params.zone) {
      return json({ error: 'Missing zone' }, { status: 400 });
    }

    const zone = params.zone.toUpperCase();
    if (!ZONE_COORDINATES[zone]) {
      return json({ error: 'Invalid zone' }, { status: 400 });
    }

    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    
    const d = new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth() + 1;
    
    let reqYear = currentYear;
    let reqMonth = currentMonth;

    if (yearParam !== null) {
      if (!/^\d+$/.test(yearParam)) {
        return json({ error: 'Invalid year' }, { status: 400 });
      }
      reqYear = parseInt(yearParam, 10);
      if (isNaN(reqYear) || reqYear <= 0) {
        return json({ error: 'Invalid year' }, { status: 400 });
      }
    }

    if (monthParam !== null) {
      if (!/^\d+$/.test(monthParam)) {
        return json({ error: 'Invalid month' }, { status: 400 });
      }
      reqMonth = parseInt(monthParam, 10);
      if (isNaN(reqMonth) || reqMonth < 1 || reqMonth > 12) {
        return json({ error: 'Invalid month' }, { status: 400 });
      }
    }
    
    let data = null;

    // Method 1: Try api.waktusolat.app first
    try {
      let fetchUrl = `https://api.waktusolat.app/solat/${zone}`;
      const queryParams = new URLSearchParams();
      if (yearParam !== null) queryParams.append("year", String(reqYear));
      if (monthParam !== null) queryParams.append("month", String(reqMonth));
      if (queryParams.toString() !== "") {
        fetchUrl += `?${queryParams.toString()}`;
      }

      const response = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WaktuSolatApp/1.0)",
        },
        signal: AbortSignal.timeout(4000)
      });

      if (response.ok) {
        const jsonResult = await response.json();
        if (jsonResult && Array.isArray(jsonResult.prayerTime)) {
          data = jsonResult;
        }
      } else {
        console.warn(`Upstream api.waktusolat.app returned ${response.status} for zone ${zone}`);
      }
    } catch (err) {
      console.warn(`Failed fetching from api.waktusolat.app:`, err);
    }

    // Method 2: Fall back to official www.esolat.gov.my API for current month/year
    if (!data && reqYear === currentYear && reqMonth === currentMonth) {
      try {
        console.log(`Attempting fallback to official www.esolat.gov.my API for zone ${zone}`);
        const esolatUrl = `https://www.esolat.gov.my/index.php?r=esolatApi/takwinsolat&zone=${zone}&period=month`;
        const response = await fetch(esolatUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WaktuSolatApp/1.0)",
          },
          signal: AbortSignal.timeout(4000)
        });

        if (response.ok) {
          const rawData = await response.json();
          if (rawData && Array.isArray(rawData.prayerTime)) {
            data = {
              prayerTime: rawData.prayerTime.map((pt: any) => ({
                hijri: pt.hijri || "",
                date: pt.date || "",
                day: pt.day || "",
                imsak: pt.imsak || "",
                fajr: pt.fajr || "",
                syuruk: pt.syuruk || "",
                dhuhr: pt.dhuhr || "",
                asr: pt.asr || "",
                maghrib: pt.maghrib || "",
                isha: pt.isha || ""
              })),
              status: "OK",
              zone: zone,
              periodType: "month"
            };
          }
        } else {
          console.warn(`Upstream esolat.gov.my returned ${response.status}`);
        }
      } catch (err) {
        console.warn(`Failed fetching from esolat.gov.my:`, err);
      }
    }

    // Method 3: Fall back to local calculation if both failed
    if (!data) {
      console.log(`All remote APIs failed for zone ${zone}. Running local Adhan fallback calculation.`);
      const calculatedPrayers = calculateLocalFallback(zone, reqYear, reqMonth);
      data = {
        prayerTime: calculatedPrayers,
        status: "OK",
        zone: zone,
        periodType: "month",
        isFallback: true
      };
    }

    // Ensure all prayer times items contain the imsak time (calculate 10 minutes before Fajr if missing)
    if (data && data.prayerTime && Array.isArray(data.prayerTime)) {
      data.prayerTime = data.prayerTime.map((pt: any) => {
        if ((!pt.imsak || pt.imsak === "") && pt.fajr) {
          const parts = pt.fajr.split(":");
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          if (!isNaN(hours) && !isNaN(minutes)) {
            let totalMins = hours * 60 + minutes - 10;
            if (totalMins < 0) totalMins += 24 * 60;
            const iH = Math.floor(totalMins / 60)
              .toString()
              .padStart(2, "0");
            const iM = (totalMins % 60).toString().padStart(2, "0");
            const iS = parts[2] || "00";
            return { ...pt, imsak: `${iH}:${iM}:${iS}` };
          }
        }
        return pt;
      });
    }

    return json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error("Error fetching solat time:", error);
    return json({ error: "Failed to fetch prayer times" }, { status: 500 });
  }
};
