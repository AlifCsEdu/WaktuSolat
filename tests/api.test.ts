import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateLocalFallback } from '../src/lib/server/solat';
import { GET as healthGET } from '../src/routes/api/health/+server';
import { GET as geocodeGET } from '../src/routes/api/geocode/+server';
import { GET as solatGET } from '../src/routes/api/solat/[zone]/+server';

describe('Local Solat Fallback Calculation', () => {
  it('should calculate prayer times for WLY01 for June 2026', () => {
    const results = calculateLocalFallback('WLY01', 2026, 6);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(30); // June has 30 days
    
    const firstDay = results[0];
    expect(firstDay.date).toBe('01-Jun-2026');
    expect(firstDay.day).toBe('Monday');
    expect(firstDay.fajr).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(firstDay.imsak).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    
    // Test that imsak is exactly 10 minutes before fajr
    const [fH, fM] = firstDay.fajr.split(':').map(Number);
    const [iH, iM] = firstDay.imsak.split(':').map(Number);
    
    let fTotal = fH * 60 + fM;
    let iTotal = iH * 60 + iM;
    if (fTotal < iTotal) fTotal += 24 * 60; // handle midnight wrap
    
    expect(fTotal - iTotal).toBe(10);
  });

  it('should return empty array for an invalid zone', () => {
    const results = calculateLocalFallback('INVALID', 2026, 6);
    expect(results).toEqual([]);
  });
});

describe('API Health Endpoint', () => {
  it('should return status ok and no-cache headers', async () => {
    const event = {} as any;
    const response = await healthGET(event);
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });
});

describe('API Geocode Endpoint', () => {
  it('should reject requests with missing parameters', async () => {
    const mockUrl = new URL('http://localhost/api/geocode');
    const response = await geocodeGET({ url: mockUrl } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing lat or lng');
  });

  it('should reject requests with invalid float parameters', async () => {
    const mockUrl = new URL('http://localhost/api/geocode?lat=abc&lng=101.5');
    const response = await geocodeGET({ url: mockUrl } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid lat or lng');
  });

  it('should reject requests with out of bounds coordinates', async () => {
    const mockUrlLatHigh = new URL('http://localhost/api/geocode?lat=90.1&lng=101.5');
    const resLatHigh = await geocodeGET({ url: mockUrlLatHigh } as any);
    expect(resLatHigh.status).toBe(400);
    expect((await resLatHigh.json()).error).toBe('Latitude or longitude out of bounds');

    const mockUrlLatLow = new URL('http://localhost/api/geocode?lat=-90.1&lng=101.5');
    const resLatLow = await geocodeGET({ url: mockUrlLatLow } as any);
    expect(resLatLow.status).toBe(400);
    expect((await resLatLow.json()).error).toBe('Latitude or longitude out of bounds');

    const mockUrlLngHigh = new URL('http://localhost/api/geocode?lat=3.13&lng=180.1');
    const resLngHigh = await geocodeGET({ url: mockUrlLngHigh } as any);
    expect(resLngHigh.status).toBe(400);
    expect((await resLngHigh.json()).error).toBe('Latitude or longitude out of bounds');

    const mockUrlLngLow = new URL('http://localhost/api/geocode?lat=3.13&lng=-180.1');
    const resLngLow = await geocodeGET({ url: mockUrlLngLow } as any);
    expect(resLngLow.status).toBe(400);
    expect((await resLngLow.json()).error).toBe('Latitude or longitude out of bounds');
  });

  it('should fetch geocode from OSM and BDC and set cache-control header', async () => {
    const mockUrl = new URL('http://localhost/api/geocode?lat=3.13&lng=101.68');
    
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('nominatim')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ display_name: 'Kuala Lumpur' })
        });
      }
      if (url.includes('bigdatacloud')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ locality: 'Kuala Lumpur Locality' })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const response = await geocodeGET({ url: mockUrl, fetch: mockFetch } as any);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');

    const body = await response.json();
    expect(body.osm).toEqual({ display_name: 'Kuala Lumpur' });
    expect(body.bdc).toEqual({ locality: 'Kuala Lumpur Locality' });
  });

  it('should hit the in-memory cache on subsequent requests', async () => {
    // 3.135 and 101.684 both round to 3.14 and 101.68
    const mockUrl1 = new URL('http://localhost/api/geocode?lat=3.135&lng=101.684');
    const mockUrl2 = new URL('http://localhost/api/geocode?lat=3.141&lng=101.682');
    
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'fresh' })
      });
    });

    const res1 = await geocodeGET({ url: mockUrl1, fetch: mockFetch } as any);
    expect(res1.status).toBe(200);
    
    const res2 = await geocodeGET({ url: mockUrl2, fetch: mockFetch } as any);
    expect(res2.status).toBe(200);

    // Fetch should only be called twice (once for osm, once for bdc) on the first request.
    // The second request should be cached.
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('API Solat Endpoint', () => {
  it('should validate and normalize zone parameters', async () => {
    const mockUrl = new URL('http://localhost/api/solat/wly01');
    const response = await solatGET({
      params: { zone: 'wly01' },
      url: mockUrl,
      fetch: vi.fn()
    } as any);
    
    // Should NOT be 400 invalid zone because wly01 gets normalized to WLY01
    expect(response.status).not.toBe(400);
  });

  it('should reject invalid zones', async () => {
    const mockUrl = new URL('http://localhost/api/solat/invalid');
    const response = await solatGET({
      params: { zone: 'invalid' },
      url: mockUrl,
      fetch: vi.fn()
    } as any);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid zone');
  });

  it('should reject invalid year or month formats', async () => {
    const mockUrlInvalidYear = new URL('http://localhost/api/solat/WLY01?year=abc');
    const response1 = await solatGET({
      params: { zone: 'WLY01' },
      url: mockUrlInvalidYear,
      fetch: vi.fn()
    } as any);
    expect(response1.status).toBe(400);

    const mockUrlInvalidMonth = new URL('http://localhost/api/solat/WLY01?month=13');
    const response2 = await solatGET({
      params: { zone: 'WLY01' },
      url: mockUrlInvalidMonth,
      fetch: vi.fn()
    } as any);
    expect(response2.status).toBe(400);
  });

  it('should fall back to local calculation if upstream APIs fail', async () => {
    const mockUrl = new URL('http://localhost/api/solat/WLY01?year=2026&month=6');
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error('Network failure'));
    });

    const response = await solatGET({
      params: { zone: 'WLY01' },
      url: mockUrl,
      fetch: mockFetch
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const body = await response.json();
    expect(body.isFallback).toBe(true);
    expect(body.prayerTime.length).toBe(30);
  });

  it('should inject imsak time if it is missing from upstream API response', async () => {
    const mockUrl = new URL('http://localhost/api/solat/WLY01?year=2026&month=6');
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'OK',
          zone: 'WLY01',
          prayerTime: [
            {
              date: '01-Jun-2026',
              day: 'Monday',
              fajr: '05:45:00',
              dhuhr: '13:00:00'
              // imsak is missing
            }
          ]
        })
      });
    });

    const response = await solatGET({
      params: { zone: 'WLY01' },
      url: mockUrl,
      fetch: mockFetch
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.prayerTime[0].imsak).toBe('05:35:00');
  });
});
