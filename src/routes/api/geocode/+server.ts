import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const geocodeCache = new Map<string, any>();
const MAX_CACHE_SIZE = 100;

export const GET: RequestHandler = async ({ url, fetch }) => {
  try {
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    if (!lat || !lng) {
      return json({ error: 'Missing lat or lng' }, { status: 400 });
    }

    const latFloat = parseFloat(lat);
    const lngFloat = parseFloat(lng);

    if (isNaN(latFloat) || isNaN(lngFloat)) {
      return json({ error: 'Invalid lat or lng' }, { status: 400 });
    }

    if (latFloat < -90 || latFloat > 90 || lngFloat < -180 || lngFloat > 180) {
      return json({ error: 'Latitude or longitude out of bounds' }, { status: 400 });
    }

    // Round to 2 decimal places (~1.1 km accuracy) for cache-friendliness
    const roundedLat = latFloat.toFixed(2);
    const roundedLng = lngFloat.toFixed(2);
    const cacheKey = `${roundedLat},${roundedLng}`;

    if (geocodeCache.has(cacheKey)) {
      return json(geocodeCache.get(cacheKey), {
        headers: {
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Fetch Nominatim with SvelteKit's contextual fetch
    const nominatimPromise = fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${roundedLat}&lon=${roundedLng}&format=jsonv2&accept-language=en`,
      {
        headers: {
          'User-Agent': 'WaktuSolatApp/1.0 (Contact: a78477308@gmail.com)'
        },
        signal: AbortSignal.timeout(4000)
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    // Fetch BigDataCloud as fallback/supplement with SvelteKit's contextual fetch
    const bdcPromise = fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLng}&localityLanguage=en`,
      {
        signal: AbortSignal.timeout(4000)
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [osmData, bdcData] = await Promise.all([nominatimPromise, bdcPromise]);

    if (!osmData && !bdcData) {
      throw new Error(`Geocode APIs failed`);
    }

    const result = { osm: osmData, bdc: bdcData };

    // Manage cache size (FIFO eviction)
    if (geocodeCache.size >= MAX_CACHE_SIZE) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey !== undefined) {
        geocodeCache.delete(firstKey);
      }
    }
    geocodeCache.set(cacheKey, result);

    return json(result, {
      headers: {
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching geocode:', error);
    return json({ error: 'Failed to fetch geocode' }, { status: 500 });
  }
};
