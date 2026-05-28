import { useState, useEffect, useCallback, useRef } from "react";
import { PrayerData, JakimResponse } from "../types";
import { StorageManager } from "../lib/StorageManager";
import { getOfflinePrayers, saveOfflinePrayers } from "../lib/db";
import { fetchWithRetry } from "../lib/api";
import { analytics } from "../lib/analytics";

export function usePrayerTimes(
  selectedZone: string,
  setSelectedZone: (zone: string) => void,
  settings: any,
  updateSettings: (newSettings: any) => void,
  t: any
) {
  const [weekData, setWeekData] = useState<PrayerData[]>(() => {
    if (selectedZone) {
      return StorageManager.getCachedPrayerData(selectedZone);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!selectedZone) return true;
    const cached = StorageManager.getCachedPrayerData(selectedZone);
    return cached.length === 0;
  });

  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineModeActive, setIsOfflineModeActive] = useState(false);
  const [showOnlineSyncToast, setShowOnlineSyncToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Slow connections skeleton throttle
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowSkeleton(true), 200);
    } else {
      setShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Synchronise offline cache with backend when connection resumes
  const triggerSilentSync = useCallback(async () => {
    if (!selectedZone) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      let url = `/api/solat/${selectedZone}`;
      if (settings.offlineCachedRange === 'month') {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1);
        url = `/api/solat/${selectedZone}?year=${year}&month=${month}`;
      } else if (settings.offlineCachedRange === 'year') {
        const d = new Date();
        const year = d.getFullYear();
        url = `/api/solat/${selectedZone}?year=${year}`;
      }

      const res = await fetchWithRetry(url);
      if (!res.ok) throw new Error("Silent sync API failure");
      const data = await res.json();
      
      if (data && data.prayerTime && Array.isArray(data.prayerTime) && data.prayerTime.length > 0) {
        await saveOfflinePrayers(selectedZone, data.prayerTime, settings.offlineCachedRange || 'month');
        updateSettings({
          offlineCachedAt: Date.now()
        });
        setWeekData(data.prayerTime);
        StorageManager.setCachedPrayerData(selectedZone, data.prayerTime);
        setIsOfflineModeActive(false);
        setSyncStatus('success');
        
        setTimeout(() => {
          setShowOnlineSyncToast(false);
          setSyncStatus('idle');
        }, 3000);
      }
    } catch (e: any) {
      analytics.logError(e, { context: "triggerSilentSync", zone: selectedZone });
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedZone, settings.offlineCachedRange, updateSettings]);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      if (settings.autoSyncOffline) {
        triggerSilentSync();
      } else {
        setShowOnlineSyncToast(true);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [settings.autoSyncOffline, triggerSilentSync]);

  // Fetch prayer data from proxy or cached falls
  useEffect(() => {
    if (!selectedZone) return;

    StorageManager.setZone(selectedZone);
    let isMounted = true;

    const fetchSolat = async () => {
      setIsLoading(true);

      const loadFromCache = async () => {
        try {
          const cached = await getOfflinePrayers(selectedZone);
          if (cached && cached.prayerTime && Array.isArray(cached.prayerTime) && cached.prayerTime.length > 0) {
            if (isMounted) {
              setWeekData(cached.prayerTime);
              StorageManager.setCachedPrayerData(selectedZone, cached.prayerTime);
              setIsOfflineModeActive(true);
              setError(null);
              return true;
            }
          }
        } catch (e: any) {
          analytics.logError(e, { context: "loadFromCache", zone: selectedZone });
        }
        return false;
      };

      if (!navigator.onLine) {
        const loaded = await loadFromCache();
        if (loaded) {
          setIsLoading(false);
          return;
        }
      }

      fetchWithRetry(`/api/solat/${selectedZone}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Prayer times server request failed");
          try {
            return await res.json();
          } catch (e) {
            throw new Error("Invalid prayer data JSON");
          }
        })
        .then((data: JakimResponse) => {
          if (isMounted) {
            if (data && data.prayerTime) {
              setWeekData(data.prayerTime);
              setIsOfflineModeActive(false);
              StorageManager.setCachedPrayerData(selectedZone, data.prayerTime);
            }
            setError(null);
          }
        })
        .catch(async (err) => {
          analytics.logError(err, { context: "fetchSolatFallback", zone: selectedZone });
          if (isMounted) {
            const loaded = await loadFromCache();
            if (!loaded) {
              setError(t("failedToLoadSolat"));
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    };

    fetchSolat();
    const intervalId = setInterval(fetchSolat, 60 * 60 * 1000); // 1 hour refresh

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedZone, t]);

  return {
    weekData,
    isLoading,
    showSkeleton,
    error,
    isOfflineModeActive,
    showOnlineSyncToast,
    setShowOnlineSyncToast,
    isSyncing,
    syncStatus,
    triggerSilentSync,
  };
}
