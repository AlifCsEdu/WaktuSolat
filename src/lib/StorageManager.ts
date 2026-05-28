import { GeneralSettings, DEFAULT_GENERAL_SETTINGS, PrayerData } from "../types";
import { VisualStyle, ThemeShape } from "../hooks/useVisualStyle";

/**
 * A type-safe centralized storage service wrapper for localStorage.
 * Automatically catches and logs errors (like storage quota exceeded or disabled cookies).
 */
export const StorageManager = {
  /**
   * Helper to write item safely to localStorage
   */
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`Storage Service: failed to write key "${key}" to localStorage:`, e);
      return false;
    }
  },

  /**
   * Helper to read item safely from localStorage
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage Service: failed to read key "${key}" from localStorage:`, e);
      return null;
    }
  },

  /**
   * Helper to remove item safely from localStorage
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Storage Service: failed to remove key "${key}" from localStorage:`, e);
      return false;
    }
  },

  /**
   * Safe accessors for Zone selection
   */
  getZone(): string {
    return this.getItem("waktu-solat-zone") || "";
  },

  setZone(zone: string): void {
    this.setItem("waktu-solat-zone", zone);
  },

  /**
   * Safe accessors for Recent Zones list
   */
  getRecentZones(): string[] {
    const cached = this.getItem("waktu-solat-recent-zones");
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Storage Service: failed to parse recent zones JSON");
      return [];
    }
  },

  saveRecentZone(zone: string): void {
    if (!zone) return;
    try {
      const recent = this.getRecentZones();
      const updated = [zone, ...recent.filter((z) => z !== zone)].slice(0, 5);
      this.setItem("waktu-solat-recent-zones", JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage Service: failed to save recent zone:", e);
    }
  },

  /**
   * Safe accessors for cached Prayer Data from JAKIM per zone
   */
  getCachedPrayerData(zone: string): PrayerData[] {
    if (!zone) return [];
    const cached = this.getItem(`waktu-solat-data-${zone}`);
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn(`Storage Service: failed to parse cached prayer times for zone "${zone}"`);
      return [];
    }
  },

  setCachedPrayerData(zone: string, data: PrayerData[]): void {
    if (!zone || !data) return;
    this.setItem(`waktu-solat-data-${zone}`, JSON.stringify(data));
  },

  clearAllCachedPrayerData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("waktu-solat-data-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => this.removeItem(key));
    } catch (e) {
      console.warn("Storage Service: failed to clear cached prayer data:", e);
    }
  },

  /**
   * Safe accessors for cached Weather Data per zone
   */
  getCachedWeather(zone: string): any | null {
    if (!zone) return null;
    const cached = this.getItem(`weather-${zone}`);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn(`Storage Service: failed to parse weather cache for zone "${zone}"`);
      return null;
    }
  },

  setCachedWeather(zone: string, data: any): void {
    if (!zone || !data) return;
    this.setItem(`weather-${zone}`, JSON.stringify(data));
  },

  /**
   * Safe accessors for General Settings
   */
  getSettings(): GeneralSettings {
    const saved = this.getItem("waktu-solat-settings");
    if (!saved) return DEFAULT_GENERAL_SETTINGS;
    try {
      return { ...DEFAULT_GENERAL_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn("Storage Service: failed to parse general settings JSON");
      return DEFAULT_GENERAL_SETTINGS;
    }
  },

  setSettings(settings: GeneralSettings): void {
    this.setItem("waktu-solat-settings", JSON.stringify(settings));
  },

  /**
   * Onboarding Flow state tracking
   */
  getHasCompletedOnboarding(): boolean {
    return this.getItem("waktu-solat-onboarding-completed") === "true";
  },

  setHasCompletedOnboarding(completed: boolean): void {
    this.setItem("waktu-solat-onboarding-completed", completed ? "true" : "false");
  },

  /**
   * Theme Visual Style
   */
  getVisualStyle(): VisualStyle | null {
    return this.getItem("theme_visual_style") as VisualStyle | null;
  },

  setVisualStyle(style: VisualStyle): void {
    this.setItem("theme_visual_style", style);
  },

  /**
   * Theme Shape
   */
  getThemeShape(): ThemeShape | null {
    return this.getItem("theme_shape") as ThemeShape | null;
  },

  setThemeShape(shape: ThemeShape): void {
    this.setItem("theme_shape", shape);
  }
};
