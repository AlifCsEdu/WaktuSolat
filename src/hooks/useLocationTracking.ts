import { useEffect, useState, useRef } from "react";

export function useLocationTracking(
  selectedZone: string,
  setSelectedZone: (zone: string) => void,
  locationMode: 'auto' | 'manual',
) {
  const [promptZone, setPromptZone] = useState<string | null>(null);
  const [promptLocationName, setPromptLocationName] = useState<string | null>(null);
  const [autoUpdatedZone, setAutoUpdatedZone] = useState<string | null>(null);
  const [autoUpdatedLocationName, setAutoUpdatedLocationName] = useState<string | null>(null);
  
  // Expose current detected name for UI
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);

  const lastCheckTime = useRef<number>(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const checkLocation = () => {
      // Avoid checking too often (e.g., limit to once every 5 mins)
      const now = Date.now();
      if (now - lastCheckTime.current < 5 * 60 * 1000) return;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          lastCheckTime.current = Date.now();
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `/api/geocode?lat=${latitude}&lng=${longitude}`,
            );
            if (!res.ok) return;

            let data;
            try {
              data = await res.json();
            } catch (e) {
              return;
            }

            const stateName = data.principalSubdivision || data.city;
            const locName = data.locality || data.city || data.principalSubdivision || "Kawasan Semasa";
            setCurrentLocationName(locName);

            let foundZone = "";

            if (stateName) {
              const s = stateName.toLowerCase();
              if (s.includes("johor")) foundZone = "JHR02";
              else if (s.includes("kedah")) foundZone = "KDH01";
              else if (s.includes("kelantan")) foundZone = "KTN01";
              else if (s.includes("melaka") || s.includes("malacca")) foundZone = "MLK01";
              else if (s.includes("negeri sembilan")) foundZone = "NGS02";
              else if (s.includes("pahang")) foundZone = "PHG02";
              else if (s.includes("perak")) foundZone = "PRK02";
              else if (s.includes("perlis")) foundZone = "PLS01";
              else if (s.includes("pulau pinang") || s.includes("penang")) foundZone = "PNG01";
              else if (s.includes("sabah")) foundZone = "SBH07";
              else if (s.includes("sarawak")) foundZone = "SWK08";
              else if (s.includes("selangor")) foundZone = "SGR01";
              else if (s.includes("terengganu")) foundZone = "TRG01";
              else if (
                s.includes("kuala lumpur") ||
                s.includes("putrajaya") ||
                s.includes("federal territory")
              )
                foundZone = "WLY01";
              else if (s.includes("labuan")) foundZone = "WLY02";
            }

            if (foundZone && foundZone !== selectedZone) {
              if (locationMode === 'auto') {
                setSelectedZone(foundZone);
                setAutoUpdatedZone(foundZone);
                setAutoUpdatedLocationName(locName);
                setTimeout(() => {
                  setAutoUpdatedZone(null);
                  setAutoUpdatedLocationName(null);
                }, 5000);
              } else if (locationMode === 'manual') {
                setPromptZone(foundZone);
                setPromptLocationName(locName);
              }
            }
          } catch (err) {
            // Ignore
          }
        },
        () => {
          // Ignore
        },
        { timeout: 10000, maximumAge: 60000 },
      );
    };

    // Check immediately if auto, otherwise delay a bit
    checkLocation();

    // Check periodically
    const intervalId = setInterval(checkLocation, 5 * 60 * 1000);
    
    // Also listen to visibility change to check when user returns to app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLocation();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedZone, locationMode, setSelectedZone]);

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

  return { promptZone, promptLocationName, autoUpdatedZone, autoUpdatedLocationName, currentLocationName, acceptPrompt, dismissPrompt };
}
