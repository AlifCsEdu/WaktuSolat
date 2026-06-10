import { JakimResponse, PrayerData } from "../types";
import { StorageManager } from "../lib/StorageManager";
import { getOfflinePrayers, saveOfflinePrayers } from "../lib/db";
import { fetchWithRetry } from "../lib/api";
import { analytics } from "../lib/analytics";
import { locationState } from "./location.svelte";
import { appSettings } from "./settings.svelte";
import { untrack } from "svelte";

class PrayerTimesState {
  weekData = $state<PrayerData[]>([]);
  isLoading = $state(true);
  showSkeleton = $state(true);
  error = $state<string | null>(null);
  isOfflineModeActive = $state(false);
  showOnlineSyncToast = $state(false);
  isSyncing = $state(false);
  syncStatus = $state<'idle' | 'success' | 'error'>('idle');

  private intervalId: any;
  private currentZone: string | null = null;
  private skeletonTimer: any;

  init() {
    if (typeof window === "undefined") return;

    $effect.root(() => {
      $effect(() => {
        const zone = locationState.selectedZone;
        untrack(() => {
          if (zone && zone !== this.currentZone) {
            this.currentZone = zone;
            this.weekData = StorageManager.getCachedPrayerData(zone);
            this.isLoading = this.weekData.length === 0;
            this.fetchSolat(zone);
          }
        });
      });
      
      $effect(() => {
        if (this.isLoading) {
          this.skeletonTimer = setTimeout(() => this.showSkeleton = true, 200);
        } else {
          clearTimeout(this.skeletonTimer);
          this.showSkeleton = false;
        }
      });
    });

    let debounceTimer: any;
    const handleOnline = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (appSettings.settings.autoSyncOffline) {
          this.triggerSilentSync();
        } else {
          this.showOnlineSyncToast = true;
        }
      }, 300);
    };
    window.addEventListener("online", handleOnline);

    this.intervalId = setInterval(() => {
      if (this.currentZone) this.fetchSolat(this.currentZone);
    }, 60 * 60 * 1000);
  }

  async triggerSilentSync() {
    const zone = this.currentZone;
    if (!zone) return;
    this.isSyncing = true;
    this.syncStatus = 'idle';
    this.showOnlineSyncToast = true;
    try {
      let url = `/api/solat/${zone}`;
      const range = appSettings.settings.offlineCachedRange;
      if (range === 'month') {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1);
        url = `/api/solat/${zone}?year=${year}&month=${month}`;
      } else if (range === 'year') {
        const d = new Date();
        const year = d.getFullYear();
        url = `/api/solat/${zone}?year=${year}`;
      }

      const res = await fetchWithRetry(url);
      if (!res.ok) throw new Error("Silent sync API failure");
      const data = await res.json();
      
      if (data && data.prayerTime && Array.isArray(data.prayerTime) && data.prayerTime.length > 0) {
        await saveOfflinePrayers(zone, data.prayerTime, range || 'month');
        appSettings.updateSettings({
          offlineCachedAt: Date.now()
        });
        this.weekData = data.prayerTime;
        StorageManager.setCachedPrayerData(zone, data.prayerTime);
        this.isOfflineModeActive = false;
        this.syncStatus = 'success';
        
        setTimeout(() => {
          this.showOnlineSyncToast = false;
          this.syncStatus = 'idle';
        }, 3000);
      }
    } catch (e: any) {
      analytics.logError(e, { context: "triggerSilentSync", zone });
      this.syncStatus = 'error';
    } finally {
      this.isSyncing = false;
    }
  }

  async fetchSolat(zone: string) {
    console.log('[fetchSolat] CALLED:', { zone, onLine: navigator.onLine });
    this.isLoading = true;

    const loadFromCache = async () => {
      try {
        console.log('[loadFromCache] attempting database read for zone:', zone);
        const cached = await getOfflinePrayers(zone);
        console.log('[loadFromCache] cached data retrieved:', JSON.stringify(cached));
        if (cached && cached.prayerTime && Array.isArray(cached.prayerTime) && cached.prayerTime.length > 0) {
          this.weekData = cached.prayerTime;
          StorageManager.setCachedPrayerData(zone, cached.prayerTime);
          this.isOfflineModeActive = true;
          this.error = null;
          console.log('[loadFromCache] successfully loaded from IndexedDB cache');
          return true;
        } else {
          console.log('[loadFromCache] no valid cached data found in IndexedDB');
        }
      } catch (e: any) {
        console.error('[loadFromCache] error:', e.message, e.stack);
        analytics.logError(e, { context: "loadFromCache", zone });
      }
      return false;
    };

    if (!navigator.onLine) {
      const loaded = await loadFromCache();
      if (loaded) {
        this.isLoading = false;
        return;
      }
    }

    try {
      const res = await fetchWithRetry(`/api/solat/${zone}`);
      if (!res.ok) throw new Error("Prayer times server request failed");
      const data: JakimResponse = await res.json();
      
      if (data && data.prayerTime) {
        this.weekData = data.prayerTime;
        this.isOfflineModeActive = false;
        StorageManager.setCachedPrayerData(zone, data.prayerTime);
        
        try {
          const range = appSettings.settings.offlineCachedRange || 'month';
          await saveOfflinePrayers(zone, data.prayerTime, range);
          if (!appSettings.settings.offlineCachedRange) {
            appSettings.updateSettings({
              offlineCachedRange: range,
              offlineCachedAt: Date.now()
            });
          }
        } catch (saveErr) {
          console.warn("Auto-save offline prayers failed:", saveErr);
        }
      }
      this.error = null;
    } catch (err: any) {
      analytics.logError(err, { context: "fetchSolatFallback", zone });
      const loaded = await loadFromCache();
      if (!loaded) {
        this.error = appSettings.t("failedToLoadSolat") as string;
      }
    } finally {
      this.isLoading = false;
    }
  }
}

export const prayerTimesState = new PrayerTimesState();
