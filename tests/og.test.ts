import { describe, it, expect, vi } from 'vitest';
import { GET as ogGET } from '../src/routes/api/og/[zone]/+server';

describe('API OG Image Generation Endpoint', () => {
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

  const mockSolatData = {
    status: 'OK',
    zone: 'WLY01',
    prayerTime: [
      {
        date: formattedToday,
        hijri: '24-Zulhijjah-1447',
        day: 'Wednesday',
        imsak: '05:35:00',
        fajr: '05:45:00',
        syuruk: '07:05:00',
        dhuhr: '13:15:00',
        asr: '16:40:00',
        maghrib: '19:25:00',
        isha: '20:40:00'
      }
    ]
  };

  it('should return 200 with SVG for a valid zone', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/solat/WLY01')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSolatData)
        } as any);
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    const response = await ogGET({
      params: { zone: 'WLY01' },
      fetch: mockFetch
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    
    // Caching headers check
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600');

    const bodyText = await response.text();
    expect(bodyText).toContain('<svg');
    expect(bodyText).toContain('WLY01');
    expect(bodyText).toContain('Subuh');
    expect(bodyText).toContain('Isyak');
    expect(bodyText).toContain('05:45');
    expect(bodyText).toContain('20:40');
    expect(bodyText).toContain('Kuala Lumpur');
  });

  it('should return 400 for a missing zone parameter', async () => {
    const response = await ogGET({
      params: {} as any,
      fetch: vi.fn()
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing zone');
  });

  it('should return 400 for an invalid zone parameter', async () => {
    const response = await ogGET({
      params: { zone: 'INVALID' },
      fetch: vi.fn()
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid zone');
  });

  it('should forward API fetch failure errors', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: 'Bad Gateway' })
      } as any);
    });

    const response = await ogGET({
      params: { zone: 'WLY01' },
      fetch: mockFetch
    } as any);

    expect(response.status).toBe(502);
  });

  it('should return 500 when fetch throws an exception', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error('Network connection failed'));
    });

    const response = await ogGET({
      params: { zone: 'WLY01' },
      fetch: mockFetch
    } as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch prayer times');
  });
});
