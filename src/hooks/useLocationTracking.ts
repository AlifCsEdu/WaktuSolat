import { useEffect, useState, useRef, useCallback } from "react";
import {
  fetchReverseGeocode,
  extractLocalityName,
  extractStateName,
  mapStateToZone
} from "../lib/geocoding";
import { analytics } from "../lib/analytics";

export function useLocationTracking(
  selectedZone: string,
  setSelectedZone: (zone: string) => void,
  locationMode: 'auto' | 'manual',
) {
  const [promptZone, setPromptZone] = useState<string | null>(null);
  const [promptLocationName, setPromptLocationName] = useState<string | null>(null);
  const [autoUpdatedZone, setAutoUpdatedZone] = useState<string | null>(null);
  const [autoUpdatedLocationName, setAutoUpdatedLocationName] = useState<string | null>(null);
  
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const lastCheckTime = useRef<number>(0);
  
  // Use refs for dependencies to prevent infinite re-render loops inside checkLocation
  const selectedZoneRef = useRef(selectedZone);
  const locationModeRef = useRef(locationMode);

  useEffect(() => {
    selectedZoneRef.current = selectedZone;
    locationModeRef.current = locationMode;
  }, [selectedZone, locationMode]);

  const checkLocation = useCallback((force = false) => {
    if (!("geolocation" in navigator)) return;

    const now = Date.now();
    // If not forced, throttle checks to once every 5 minutes
    if (!force && now - lastCheckTime.current < 5 * 60 * 1000) return;
    
    setIsDetecting(true);
    
    // If forcing, bust the GPS cache by setting maximumAge to 0
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        lastCheckTime.current = Date.now();
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const data = await fetchReverseGeocode(latitude, longitude);
          
          const stateName = extractStateName(data);
          const locName = extractLocalityName(data);
          
          setCurrentLocationName(locName);

          const foundZone = mapStateToZone(stateName);

          if (foundZone) {
            if (locationModeRef.current === 'auto') {
              // In Auto mode, ALWAYS set the zone to the detected one when forced
              if (force || foundZone !== selectedZoneRef.current) {
                setSelectedZone(foundZone);
                
                // Show the toast
                setAutoUpdatedZone(foundZone);
                setAutoUpdatedLocationName(locName);
                setTimeout(() => {
                  setAutoUpdatedZone(null);
                  setAutoUpdatedLocationName(null);
                }, 5000);
              }
            } else if (locationModeRef.current === 'manual') {
              if (foundZone !== selectedZoneRef.current) {
                setPromptZone(foundZone);
                setPromptLocationName(locName);
              }
            }
          }
        } catch (err: any) {
          analytics.logError(err, { context: "locationTracking", coords: { latitude, longitude } });
        } finally {
          setIsDetecting(false);
        }
      },
      (geoError) => {
        analytics.logError(geoError, { context: "geolocation_getCurrentPosition" });
        setIsDetecting(false);
      },
      { timeout: 10000, maximumAge: force ? 0 : 60000 },
    );
  }, [setSelectedZone]);

  // When locationMode changes to 'auto', FORCE a cache-busting check immediately
  const prevMode = useRef(locationMode);
  useEffect(() => {
    const changedToAuto = prevMode.current !== 'auto' && locationMode === 'auto';
    prevMode.current = locationMode;
    
    if (changedToAuto) {
      lastCheckTime.current = 0;
      checkLocation(true);
    }
  }, [locationMode, checkLocation]);

  // Periodic background checking
  useEffect(() => {
    const intervalId = setInterval(() => checkLocation(false), 5 * 60 * 1000);

    // Initial check on mount
    if (locationModeRef.current === 'auto') {
      lastCheckTime.current = 0;
      checkLocation(true);
    } else {
      checkLocation(false);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [checkLocation]);

  const acceptPrompt = () => {
    if (promptZone) {
      setSelectedZone(promptZone);
      setPromptZone(null);
      setPromptLocationName(null);
    }
  };

  const dismissPrompt = () => {
    setPromptZone(null);
    setPromptLocationName(null);
  };

  return { promptZone, promptLocationName, autoUpdatedZone, autoUpdatedLocationName, currentLocationName, isDetecting, acceptPrompt, dismissPrompt, userCoords };
}
export default useLocationTracking;
