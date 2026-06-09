import { isAfter } from "date-fns";
import { getWallpaperBlob } from "../lib/db";
import { applyThemeFromHex, applyThemeFromImage, PRAYER_COLORS } from "../lib/theme";
import { appSettings } from "./settings.svelte";
import { activePrayerState } from "./activePrayer.svelte";
import { mosqueState } from "./mosque.svelte";
import { currentTimeState } from "./time.svelte";

class ThemeState {
  dbWallpaperUrl = $state<string | null>(null);
  systemDark = $state(false);

  constructor() {
    if (typeof window !== "undefined") {
      this.systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      $effect.root(() => {
        // Handle IndexedDB Wallpaper loading
        $effect(() => {
          if (appSettings.settings.wallpaperEnabled && appSettings.settings.wallpaperSource === 'upload') {
            // Re-runs if wallpaperLastUpdated changes
            const _trigger = appSettings.settings.wallpaperLastUpdated; 
            getWallpaperBlob().then((blob) => {
              if (blob) {
                if (this.dbWallpaperUrl) URL.revokeObjectURL(this.dbWallpaperUrl);
                this.dbWallpaperUrl = URL.createObjectURL(blob);
              }
            });
          } else {
            if (this.dbWallpaperUrl) {
              URL.revokeObjectURL(this.dbWallpaperUrl);
              this.dbWallpaperUrl = null;
            }
          }
        });

        // Handle System Dark Mode changes
        $effect(() => {
          if (appSettings.settings.darkThemeMode !== "system") return;
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          const handler = (e: MediaQueryListEvent) => this.systemDark = e.matches;
          mediaQuery.addEventListener("change", handler);
          return () => mediaQuery.removeEventListener("change", handler);
        });

        // Apply Theme automatically whenever properties change
        $effect(() => {
          this.applyDomTheme();
        });
      });
    }
  }

  activeWallpaperUrl = $derived.by(() => {
    if (!appSettings.settings.wallpaperEnabled) return null;
    if (appSettings.settings.wallpaperSource === 'upload') {
      return this.dbWallpaperUrl;
    }
    return appSettings.settings.wallpaperUrl || null;
  });

  solarDark = $derived.by(() => {
    const todayData = activePrayerState.todayData;
    const currentTime = currentTimeState.value;
    if (!todayData) return false;
    try {
      const getAdjustedTimeLocal = (data: any, key: 'syuruk' | 'maghrib') => {
        const [h, m, s] = data[key].split(":").map(Number);
        const d = new Date(currentTime);
        d.setHours(h, m, s || 0, 0);
        return d;
      };
      const sunriseTime = getAdjustedTimeLocal(todayData, "syuruk");
      const sunsetTime = getAdjustedTimeLocal(todayData, "maghrib");
      return isAfter(currentTime, sunsetTime) || !isAfter(currentTime, sunriseTime);
    } catch (e) {
      return false;
    }
  });

  activeDark = $derived.by(() => {
    const mode = appSettings.settings.darkThemeMode;
    const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
    if (mode === "system") {
      return this.systemDark;
    } else if (mode === "solar") {
      return this.solarDark;
    } else if (mode === "prayer") {
      if (!prevPrayerKey) return false;
      const key = prevPrayerKey.toLowerCase();
      return ["fajr", "maghrib", "isha", "imsak"].includes(key);
    }
    return !!appSettings.settings.themeDark;
  });

  activeColor = $derived.by(() => {
    const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
    if (appSettings.settings.colorThemeMode === "prayer" && prevPrayerKey) {
      const key = prevPrayerKey.toLowerCase();
      const colorKey = key in PRAYER_COLORS ? key : "fajr";
      return PRAYER_COLORS[colorKey as keyof typeof PRAYER_COLORS] || appSettings.settings.themeColor || "#006C54";
    }
    return appSettings.settings.themeColor || "#006C54";
  });

  computedWallpaperDim = $derived.by(() => {
    let dim = appSettings.settings.wallpaperDim ?? 40;
    if (appSettings.settings.wallpaperMosqueAutoDim && mosqueState.computedState.isMosqueActive) {
      dim = Math.min(95, dim + 25);
    }
    return dim / 100;
  });

  private applyDomTheme() {
    if (typeof document === 'undefined') return;

    const settings = appSettings.settings;

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
      settings.wallpaperEnabled && this.activeWallpaperUrl ? "true" : "false"
    );

    const variant = settings.themeVariant || "tonal_spot";
    const contrast = settings.themeContrast !== undefined ? settings.themeContrast : 0.0;

    const activeColor = this.activeColor;
    const activeDark = this.activeDark;
    const activeWallpaperUrl = this.activeWallpaperUrl;

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

    document.documentElement.classList.add("theme-transitioning");
    applyM3Theme();
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 600);
  }
}

export const themeState = new ThemeState();
