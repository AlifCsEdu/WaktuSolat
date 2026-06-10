import { describe, it, expect, beforeEach, vi } from 'vitest';
import { locationState } from '../src/state/location.svelte';
import { StorageManager } from '../src/lib/StorageManager';
import { load } from '../src/routes/zone/[zone]/+page.server';

// Mock global localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

global.window = global as any;

describe('Location default zone setting and reactive updates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should update selectedZone directly without altering defaultZone or localStorage', () => {
    StorageManager.setZone('SGR01');
    locationState.defaultZone = 'SGR01';
    locationState.selectedZone = 'SGR01';
    
    // Assign selectedZone directly (as done on dynamic route load)
    locationState.selectedZone = 'JHR02';
    
    expect(locationState.selectedZone).toBe('JHR02');
    expect(locationState.defaultZone).toBe('SGR01');
    expect(StorageManager.getZone()).toBe('SGR01');
  });

  it('should update defaultZone and localStorage when saveAsDefault() is called', () => {
    StorageManager.setZone('SGR01');
    locationState.defaultZone = 'SGR01';
    locationState.selectedZone = 'JHR02';
    
    locationState.saveAsDefault();
    
    expect(locationState.defaultZone).toBe('JHR02');
    expect(StorageManager.getZone()).toBe('JHR02');
    expect(StorageManager.getRecentZones()).toContain('JHR02');
  });
});

describe('Zone Dashboard Server Loader', () => {
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

  const mockPrayerData = {
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

  it('should load prayer times successfully for a valid zone', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/solat/WLY01')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockPrayerData)
        } as any);
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    const result = (await load({
      params: { zone: 'wly01' },
      fetch: mockFetch
    } as any)) as any;

    expect(result).toBeDefined();
    expect(result.zone).toBe('WLY01');
    expect(result.zoneLabel).toBe('Kuala Lumpur, Putrajaya');
    expect(result.stateName).toBe('Wilayah Persekutuan');
    expect(result.todayPrayers).toBeDefined();
    expect(result.todayPrayers.fajr).toBe('05:45:00');
    expect(result.gregorianDate).toBe(formattedToday);
  });

  it('should throw 404 HttpError for an invalid zone code', async () => {
    const mockFetch = vi.fn();
    
    try {
      await load({
        params: { zone: 'INVALID' },
        fetch: mockFetch
      } as any);
      expect(true).toBe(false); // fail if it doesn't throw
    } catch (err: any) {
      expect(err).toBeDefined();
      expect(err.status).toBe(404);
      expect(err.body?.message).toContain('Zone INVALID not found');
    }
  });

  it('should throw HTTP status error when upstream fetch fails', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 502
      } as any);
    });

    try {
      await load({
        params: { zone: 'WLY01' },
        fetch: mockFetch
      } as any);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeDefined();
      expect(err.status).toBe(502);
      expect(err.body?.message).toContain('Failed to fetch prayer times for zone WLY01');
    }
  });
});
