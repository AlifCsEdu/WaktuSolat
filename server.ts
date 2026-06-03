import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

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
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(
          "Invalid JSON from upstream. Route:",
          url,
          "Status:",
          response.status,
        );
        throw new Error(
          "Invalid response from upstream API. The API returned HTML instead of JSON.",
        );
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

  app.listen(PORT, "0.0.0.0" as any, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
