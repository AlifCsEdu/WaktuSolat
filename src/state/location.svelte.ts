import { fetchReverseGeocode, extractLocalityName, extractStateName, mapStateToZone } from "../lib/geocoding";
import { appSettings } from "./settings.svelte";
import { StorageManager } from "../lib/StorageManager";
import { analytics } from "../lib/analytics";

class LocationState {
  selectedZone = $state(StorageManager.getZone() || "SGR01");
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
    StorageManager.setZone(zone);
    if (!isAuto) {
      StorageManager.saveRecentZone(zone);
    }
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
          const data = await fetchReverseGeocode(latitude, longitude);
          const stateName = extractStateName(data);
          const locName = extractLocalityName(data);
          
          this.currentLocationName = locName;

          const foundZone = mapStateToZone(stateName);

          if (foundZone) {
            if (appSettings.settings.locationMode === 'auto') {
              if (force || foundZone !== this.selectedZone) {
                this.setZone(foundZone, true);
                this.autoUpdatedZone = foundZone;
                this.autoUpdatedLocationName = locName;
                setTimeout(() => {
                  this.autoUpdatedZone = null;
                  this.autoUpdatedLocationName = null;
                }, 5000);
              }
            } else if (appSettings.settings.locationMode === 'manual') {
              if (foundZone !== this.selectedZone) {
                this.promptZone = foundZone;
                this.promptLocationName = locName;
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
        analytics.logError(geoError, { context: "geolocation_getCurrentPosition" });
        this.isDetecting = false;
      },
      { timeout: 10000, maximumAge: force ? 0 : 60000 },
    );
  }

  acceptPrompt() {
    if (this.promptZone) {
      this.setZone(this.promptZone, false);
      this.promptZone = null;
      this.promptLocationName = null;
    }
  }

  dismissPrompt() {
    this.promptZone = null;
    this.promptLocationName = null;
  }
}

export const locationState = new LocationState();
