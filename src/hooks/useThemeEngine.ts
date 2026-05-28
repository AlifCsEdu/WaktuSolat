import { useState, useEffect, useMemo } from "react";
import { getWallpaperBlob } from "../lib/db";
import { isAfter } from "date-fns";
import { applyThemeFromHex, applyThemeFromImage, PRAYER_COLORS } from "../lib/theme";
import { PrayerData } from "../types";

export function useThemeEngine(
  settings: any,
  currentTime: Date,
  todayData: PrayerData | null,
  prevPrayerKey: string | null,
  visualStyle: string,
  isMosqueActive: boolean
) {
  // 1. IndexedDB custom wallpaper loader
  const [dbWallpaperUrl, setDbWallpaperUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (settings.wallpaperEnabled && settings.wallpaperSource === 'upload') {
      getWallpaperBlob().then((blob) => {
        if (blob && active) {
          const url = URL.createObjectURL(blob);
          setDbWallpaperUrl(url);
        }
      });
    } else {
      setDbWallpaperUrl(null);
    }
    return () => {
      active = false;
    };
  }, [settings.wallpaperEnabled, settings.wallpaperSource, settings.wallpaperLastUpdated]);

  // Clean up Object URLs to prevent leaks
  useEffect(() => {
    return () => {
      if (dbWallpaperUrl) {
        URL.revokeObjectURL(dbWallpaperUrl);
      }
    };
  }, [dbWallpaperUrl]);

  const activeWallpaperUrl = useMemo(() => {
    if (!settings.wallpaperEnabled) return null;
    if (settings.wallpaperSource === 'upload') {
      return dbWallpaperUrl;
    }
    return settings.wallpaperUrl || null;
  }, [settings.wallpaperEnabled, settings.wallpaperSource, dbWallpaperUrl, settings.wallpaperUrl]);

  // 2. OS Device Settings Dark Mode Listener
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (settings.darkThemeMode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [settings.darkThemeMode]);

  // 3. Solar Sunrise / Sunset Dark Mode Engine
  const solarDark = useMemo(() => {
    if (!todayData) return false;
    try {
      // Helper inside hook scope to map prayer adjustments safely
      const getAdjustedTimeLocal = (data: PrayerData, key: 'syuruk' | 'maghrib') => {
        const parse = (timeStr: string) => {
          const [h, m, s] = timeStr.split(":").map(Number);
          const d = new Date(currentTime);
          d.setHours(h, m, s || 0, 0);
          return d;
        };
        return parse(data[key]);
      };
      
      const sunriseTime = getAdjustedTimeLocal(todayData, "syuruk");
      const sunsetTime = getAdjustedTimeLocal(todayData, "maghrib");
      return isAfter(currentTime, sunsetTime) || !isAfter(currentTime, sunriseTime);
    } catch (e) {
      return false;
    }
  }, [todayData, currentTime]);

  // 4. Resolve Active Dark Mode state
  const activeDark = useMemo(() => {
    if (settings.darkThemeMode === "system") {
      return systemDark;
    } else if (settings.darkThemeMode === "solar") {
      return solarDark;
    } else if (settings.darkThemeMode === "prayer") {
      if (!prevPrayerKey) return false;
      const key = prevPrayerKey.toLowerCase();
      return ["fajr", "maghrib", "isha", "imsak"].includes(key);
    }
    return !!settings.themeDark;
  }, [settings.darkThemeMode, systemDark, solarDark, settings.themeDark, prevPrayerKey]);

  // 5. Dynamic Prayer-Time Colors calculation
  const activeColor = useMemo(() => {
    if (settings.colorThemeMode === "prayer" && prevPrayerKey) {
      const key = prevPrayerKey.toLowerCase();
      const colorKey = key in PRAYER_COLORS ? key : "fajr";
      return PRAYER_COLORS[colorKey as keyof typeof PRAYER_COLORS] || settings.themeColor || "#006C54";
    }
    return settings.themeColor || "#006C54";
  }, [settings.colorThemeMode, prevPrayerKey, settings.themeColor]);

  // 6. Apply themes dynamically to DOM and Material 3 Tonal Spot scheme generator
  useEffect(() => {
    if (settings.themeFont) {
      document.documentElement.style.setProperty("--app-font-sans", settings.themeFont);
      document.documentElement.setAttribute("data-font", settings.themeFont);
    }
    
    if (settings.themeShape) {
      document.documentElement.setAttribute("data-shape", settings.themeShape);
    }
    
    if (settings.visualStyle) {
      document.documentElement.setAttribute("data-style", settings.visualStyle);
    }

    document.documentElement.setAttribute(
      "data-wallpaper",
      settings.wallpaperEnabled && activeWallpaperUrl ? "true" : "false"
    );

    const variant = settings.themeVariant || "tonal_spot";
    const contrast = settings.themeContrast !== undefined ? settings.themeContrast : 0.0;

    const applyM3Theme = () => {
      if (settings.wallpaperEnabled && activeWallpaperUrl) {
        const img = new Image();
        img.src = activeWallpaperUrl;
        img.crossOrigin = "anonymous";
        img.onload = () => {
          applyThemeFromImage(img, activeDark, variant, contrast).catch(() => {
            applyThemeFromHex(activeColor, activeDark, variant, contrast);
          });
        };
        img.onerror = () => {
          applyThemeFromHex(activeColor, activeDark, variant, contrast);
        };
      } else {
        applyThemeFromHex(activeColor, activeDark, variant, contrast);
      }
    };

    // Smooth material transition wrapper
    document.documentElement.classList.add("theme-transitioning");
    applyM3Theme();
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 600);

    return () => clearTimeout(timer);
  }, [
    activeColor,
    activeDark,
    settings.themeVariant,
    settings.themeContrast,
    settings.themeFont,
    settings.themeShape,
    settings.visualStyle,
    settings.wallpaperEnabled,
    activeWallpaperUrl
  ]);

  // Mosque Auto-Dimming calculation for the wallpaper overlay
  const computedWallpaperDim = useMemo(() => {
    let dim = settings.wallpaperDim ?? 40;
    if (settings.wallpaperMosqueAutoDim && isMosqueActive) {
      dim = Math.min(95, dim + 25);
    }
    return dim / 100;
  }, [settings.wallpaperDim, settings.wallpaperMosqueAutoDim, isMosqueActive]);

  return {
    activeWallpaperUrl,
    activeDark,
    activeColor,
    computedWallpaperDim,
  };
}
