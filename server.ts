import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import adhan from "adhan";

const ZONE_COORDINATES: Record<string, [number, number]> = {
  "JHR01": [2.44, 104.53],
  "JHR02": [1.49, 103.74],
  "JHR03": [2.03, 103.31],
  "JHR04": [1.85, 102.93],
  "KDH01": [6.12, 100.36],
  "KDH02": [5.64, 100.49],
  "KDH03": [6.25, 100.60],
  "KDH04": [5.67, 100.91],
  "KDH05": [5.36, 100.55],
  "KDH06": [6.35, 99.80],
  "KDH07": [5.78, 100.43],
  "KTN01": [6.12, 102.23],
  "KTN02": [4.88, 101.96],
  "MLK01": [2.19, 102.25],
  "NGS01": [2.47, 102.23],
  "NGS02": [2.73, 102.24],
  "NGS03": [2.72, 101.93],
  "PHG01": [2.79, 104.16],
  "PHG02": [3.81, 103.32],
  "PHG03": [3.45, 102.42],
  "PHG04": [3.51, 101.90],
  "PHG05": [3.31, 101.82],
  "PHG06": [4.49, 101.39],
  "PRK01": [3.83, 101.52],
  "PRK02": [4.59, 101.09],
  "PRK03": [5.10, 100.96],
  "PRK04": [5.62, 101.58],
  "PRK05": [4.02, 101.02],
  "PRK06": [4.85, 100.73],
  "PRK07": [4.86, 100.79],
  "PLS01": [6.44, 100.19],
  "PNG01": [5.41, 100.32],
  "SBH01": [5.84, 118.11],
  "SBH02": [5.36, 117.11],
  "SBH03": [5.03, 118.33],
  "SBH04": [4.24, 117.89],
  "SBH05": [6.88, 116.84],
  "SBH06": [6.07, 116.55],
  "SBH07": [5.98, 116.07],
  "SBH08": [5.33, 116.16],
  "SBH09": [5.34, 115.74],
  "SWK01": [4.75, 115.01],
  "SWK02": [4.38, 113.98],
  "SWK03": [3.17, 113.04],
  "SWK04": [2.30, 111.82],
  "SWK05": [2.12, 111.51],
  "SWK06": [1.22, 111.52],
  "SWK07": [1.46, 110.45],
  "SWK08": [1.55, 110.35],
  "SWK09": [1.13, 110.44],
  "SGR01": [3.07, 101.51],
  "SGR02": [3.33, 101.25],
  "SGR03": [3.04, 101.44],
  "TRG01": [5.33, 103.14],
  "TRG02": [5.73, 102.49],
  "TRG03": [5.08, 103.01],
  "TRG04": [4.23, 103.42],
  "WLY01": [3.13, 101.68],
  "WLY02": [5.28, 115.24],
};

function calculateLocalFallback(zone: string, year: number, month: number): any[] {
  const coords = ZONE_COORDINATES[zone];
  if (!coords) return [];
  const [lat, lng] = coords;
  
  const coordinates = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.Singapore();
  params.fajrAngle = 18; // JAKIM 2019 standard
  params.ishaAngle = 18;
  
  const numDays = new Date(year, month, 0).getDate();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const prayerTimesList: any[] = [];
  
  for (let day = 1; day <= numDays; day++) {
    const date = new Date(year, month - 1, day);
    const pTimes = new adhan.PrayerTimes(coordinates, date, params);
    
    const formattedDate = `${String(day).padStart(2, "0")}-${monthsNames[month - 1]}-${year}`;
    const dayName = daysOfWeek[date.getDay()];
    
    const formatTime = (time: Date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(time);
      const h = parts.find(p => p.type === "hour")?.value || "00";
      const m = parts.find(p => p.type === "minute")?.value || "00";
      const s = parts.find(p => p.type === "second")?.value || "00";
      return `${h}:${m}:${s}`;
    };
    
    const fajrTime = formatTime(pTimes.fajr);
    const syurukTime = formatTime(pTimes.sunrise);
    const dhuhrTime = formatTime(pTimes.dhuhr);
    const asrTime = formatTime(pTimes.asr);
    const maghribTime = formatTime(pTimes.maghrib);
    const ishaTime = formatTime(pTimes.isha);
    
    // Imsak is 10 minutes before Fajr
    const [fH, fM] = fajrTime.split(":").map(Number);
    let totalMins = fH * 60 + fM - 10;
    if (totalMins < 0) totalMins += 24 * 60;
    const iH = Math.floor(totalMins / 60).toString().padStart(2, "0");
    const iM = (totalMins % 60).toString().padStart(2, "0");
    const imsakTime = `${iH}:${iM}:00`;
    
    prayerTimesList.push({
      hijri: "",
      date: formattedDate,
      day: dayName,
      imsak: imsakTime,
      fajr: fajrTime,
      syuruk: syurukTime,
      dhuhr: dhuhrTime,
      asr: asrTime,
      maghrib: maghribTime,
      isha: ishaTime
    });
  }
  
  return prayerTimesList;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  // API routes FIRST
  // Simple in-memory geocoding cache
  const geocodeCache = new Map<string, any>();
  const MAX_CACHE_SIZE = 100;

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy route for Geocoding to bypass adblockers
  app.get("/api/geocode", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: "Missing lat or lng" });
      }

      // Round to 2 decimal places (~1.1 km accuracy) for cache-friendliness
      const roundedLat = parseFloat(lat as string).toFixed(2);
      const roundedLng = parseFloat(lng as string).toFixed(2);
      const cacheKey = `${roundedLat},${roundedLng}`;

      if (geocodeCache.has(cacheKey)) {
        return res.json(geocodeCache.get(cacheKey));
      }

      // Fetch Nominatim
      const nominatimPromise = fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${roundedLat}&lon=${roundedLng}&format=jsonv2&accept-language=en`,
        {
          headers: {
            "User-Agent": "WaktuSolatApp/1.0 (Contact: a78477308@gmail.com)",
          },
        },
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // Fetch BigDataCloud as fallback/supplement
      const bdcPromise = fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLng}&localityLanguage=en`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [osmData, bdcData] = await Promise.all([
        nominatimPromise,
        bdcPromise,
      ]);

      if (!osmData && !bdcData) {
        throw new Error(`Geocode APIs failed`);
      }

      const result = { osm: osmData, bdc: bdcData };

      // Manage cache size
      if (geocodeCache.size >= MAX_CACHE_SIZE) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey !== undefined) {
          geocodeCache.delete(firstKey);
        }
      }
      geocodeCache.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error("Error fetching geocode:", error);
      res.status(500).json({ error: "Failed to fetch geocode" });
    }
  });

  // Proxy route for JAKIM e-Solat
  app.get("/api/solat/:zone", async (req, res) => {
    try {
      const { zone } = req.params;
      const { year, month } = req.query;
      
      const d = new Date();
      const currentYear = d.getFullYear();
      const currentMonth = d.getMonth() + 1;
      
      const reqYear = year ? parseInt(year as string, 10) : currentYear;
      const reqMonth = month ? parseInt(month as string, 10) : currentMonth;
      
      let data = null;

      // Method 1: Try api.waktusolat.app first
      try {
        let url = `https://api.waktusolat.app/solat/${zone}`;
        const queryParams = new URLSearchParams();
        if (year) queryParams.append("year", year as string);
        if (month) queryParams.append("month", month as string);
        if (queryParams.toString() !== "") {
          url += `?${queryParams.toString()}`;
        }

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WaktuSolatApp/1.0)",
          },
          signal: AbortSignal.timeout(4000)
        });

        if (response.ok) {
          data = await response.json();
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

      // Inject imsak as 10 minutes before fajr if missing
      if (data && data.prayerTime && Array.isArray(data.prayerTime)) {
        data.prayerTime = data.prayerTime.map((pt: any) => {
          if (!pt.imsak && pt.fajr) {
            const [hours, minutes] = pt.fajr.split(":").map(Number);
            let totalMins = hours * 60 + minutes - 10;
            if (totalMins < 0) totalMins += 24 * 60;
            const iH = Math.floor(totalMins / 60)
              .toString()
              .padStart(2, "0");
            const iM = (totalMins % 60).toString().padStart(2, "0");
            return { ...pt, imsak: `${iH}:${iM}:00` };
          }
          return pt;
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching solat time:", error);
      res.status(500).json({ error: "Failed to fetch prayer times" });
    }
  });

  // Catch unmatched API requests
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In Express v5, get('*') doesn't behave like v4. Use '*all' if v5, else '*'.
    // Usually '*' is fine for standard setup but per instruction using '*'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer();
