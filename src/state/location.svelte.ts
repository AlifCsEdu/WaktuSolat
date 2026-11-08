import { fetchReverseGeocode, extractLocalityName, findNearestZone, matchZoneFromGeocode } from "../lib/geocoding";
import { JAKIM_ZONES } from "../lib/zones";
import { appSettings } from "./settings.svelte";
import { StorageManager } from "../lib/StorageManager";
import { analytics } from "../lib/analytics";

function getZoneDisplayName(zoneCode: string): string {
  for (const state of JAKIM_ZONES) {
    const found = state.zones.find((z) => z.v === zoneCode);
    if (found) return found.l.split(",")[0].trim();
  }
  return zoneCode;
}

class LocationState {
  selectedZone = $state(StorageManager.getZone() || "WLY01");
  defaultZone = $state(StorageManager.getZone() || "WLY01");
  promptZone = $state<string | null>(null);
  promptLocationName = $state<string | null>(null);
  autoUpdatedZone = $state<string | null>(null);
  autoUpdatedLocationName = $state<string | null>(null);
  currentLocationName = $state<string | null>(null);
  isDetecting = $state(false);
  userCoords = $state<{ lat: number; lng: number } | null>(null);

  private lastCheckTime = 0;
  private isAutoZoneChange = false;
  private checkInterval: any;
  private autoDismissTimeout: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlZone = urlParams.get("zone");
      if (urlZone && urlZone.match(/^[A-Z]{3}\d{2}$/)) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        this.setZone(urlZone, false);
      } else {
        StorageManager.setZone(this.selectedZone);
      }
    }
  }

  init() {
    if (typeof window === "undefined") return;
    
    // Initial check
    if (appSettings.settings.locationMode === 'auto') {
      this.lastCheckTime = 0;
      this.checkLocation(true);
    } else {
      this.checkLocation(false);
    }

    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.checkLocation(false), 5 * 60 * 1000);
  }

  setZone(zone: string, isAuto = false) {
    this.isAutoZoneChange = isAuto;
    this.selectedZone = zone;
    this.defaultZone = zone;
    StorageManager.setZone(zone);
    if (!isAuto) {
      StorageManager.saveRecentZone(zone);
    }
  }

  saveAsDefault() {
    this.defaultZone = this.selectedZone;
    StorageManager.setZone(this.selectedZone);
    StorageManager.saveRecentZone(this.selectedZone);
  }

  checkLocation(force = false) {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    const now = Date.now();
    if (!force && now - this.lastCheckTime < 5 * 60 * 1000) return;

    this.isDetecting = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        this.lastCheckTime = Date.now();
        const { latitude, longitude } = position.coords;
        this.userCoords = { lat: latitude, lng: longitude };
        
        try {
          let resolvedZone: string | null = null;
          let resolvedLocName: string | null = null;

          // 1. Try online reverse geocoding if online
          if (typeof navigator === "undefined" || navigator.onLine) {
            try {
              const data = await fetchReverseGeocode(latitude, longitude);
              const match = matchZoneFromGeocode(data);
              if (match && match.zone) {
                resolvedZone = match.zone;
                resolvedLocName = match.detailVal || extractLocalityName(data);
              }
            } catch (geoErr) {
              console.warn("Reverse geocode network request failed, falling back to centroid:", geoErr);
            }
          }

          // 2. Offline GPS Centroid Fallback
          if (!resolvedZone) {
            resolvedZone = findNearestZone(latitude, longitude);
            resolvedLocName = getZoneDisplayName(resolvedZone);
          }

          this.currentLocationName = resolvedLocName;

          // 3. Apply Zone Update
          if (resolvedZone) {
            if (appSettings.settings.locationMode === 'auto') {
              if (force || resolvedZone !== this.selectedZone) {
                this.setZone(resolvedZone, true);
                this.autoUpdatedZone = resolvedZone;
                this.autoUpdatedLocationName = resolvedLocName;
                if (this.autoDismissTimeout) {
                  clearTimeout(this.autoDismissTimeout);
                }
                this.autoDismissTimeout = setTimeout(() => {
                  this.autoUpdatedZone = null;
                  this.autoUpdatedLocationName = null;
                  this.autoDismissTimeout = null;
                }, 5000);
              }
            } else if (appSettings.settings.locationMode === 'manual') {
              if (resolvedZone !== this.selectedZone) {
                this.promptZone = resolvedZone;
                this.promptLocationName = resolvedLocName;
              }
            }
          }
        } catch (err: any) {
          analytics.logError(err, { context: "locationTracking", coords: { latitude, longitude } });
        } finally {
          this.isDetecting = false;
        }
      },
      (geoError) => {
        if (geoError.code === 1 /* PERMISSION_DENIED */) {
          analytics.logEvent("geolocation_permission_denied");
        } else {
          analytics.logError(geoError, { context: "geolocation_getCurrentPosition" });
        }
        this.isDetecting = false;
      },
      { timeout: 10000, maximumAge: force ? 0 : 60000 },
    );
  }

  acceptPrompt() {
    if (this.promptZone) {
      this.setZone(this.promptZone, false);
      this.dismissPrompt();
    }
  }

  dismissPrompt() {
    this.promptZone = null;
    this.promptLocationName = null;
    this.autoUpdatedZone = null;
    this.autoUpdatedLocationName = null;
    if (this.autoDismissTimeout) {
      clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }
  }
}

export const locationState = new LocationState();
