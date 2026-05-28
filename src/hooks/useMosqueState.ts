import { useState, useEffect, useRef, useCallback } from "react";
import { PrayerData, PrayerKey } from "../types";

export function useMosqueState(
  currentTime: Date,
  prevPrayerKey: string | null,
  prevPrayerName: string | null,
  prevPrayerTime: Date | null,
  todayData: PrayerData | null,
  settings: any,
  preferences: any,
  t: any
) {
  // State for tracking manually dismissed alerts and manually exited solat mode
  const [manuallyDismissedAzanAlert, setManuallyDismissedAzanAlert] = useState<string | null>(null);
  const [manuallyExitedSolatPrayer, setManuallyExitedSolatPrayer] = useState<string | null>(null);
  
  // State for mock Azan alerts (visual style previews)
  const [mockAzanAlert, setMockAzanAlert] = useState<{ prayerName: string; style: string; remainingSeconds: number } | null>(null);

  // Mosque Mode administrative controls state
  const [iqamahModifier, setIqamahModifier] = useState<Record<string, number>>({});
  const [iqamahPausedState, setIqamahPausedState] = useState<Record<string, { paused: boolean; remainingSecs: number }>>({});

  // Reset states on prayer time change
  const lastActivePrayerRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPrayerKey && prevPrayerKey !== lastActivePrayerRef.current) {
      setManuallyDismissedAzanAlert(null);
      setManuallyExitedSolatPrayer(null);
      
      // Reset Mosque mode admin states for the new prayer
      setIqamahModifier((prev: Record<string, number>) => ({ ...prev, [prevPrayerKey]: 0 }));
      setIqamahPausedState((prev: Record<string, { paused: boolean; remainingSecs: number }>) => ({
        ...prev,
        [prevPrayerKey]: { paused: false, remainingSecs: 0 },
      }));
      
      lastActivePrayerRef.current = prevPrayerKey;
    }
  }, [prevPrayerKey]);

  // Mock Azan alert ticker
  useEffect(() => {
    if (!mockAzanAlert) return;
    
    const interval = setInterval(() => {
      setMockAzanAlert((prev: any) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          clearInterval(interval);
          return null;
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [mockAzanAlert]);

  const handleIqamahTogglePause = useCallback(() => {
    if (!prevPrayerKey || !prevPrayerTime) return;
    const isPaused = !!iqamahPausedState[prevPrayerKey]?.paused;
    
    if (isPaused) {
      // Resuming: adjust the modifier so that iqamahEndTime matches the remaining seconds from now
      const remainingSecs = iqamahPausedState[prevPrayerKey]?.remainingSecs || 0;
      const pref = preferences[prevPrayerKey as PrayerKey];
      const baseOffset = pref?.iqamahOffset ?? 0;
      
      const newIqamahEndTime = new Date(Date.now() + remainingSecs * 1000);
      const newModifier = (newIqamahEndTime.getTime() - prevPrayerTime.getTime()) / 60000 - baseOffset;
      
      setIqamahModifier((prev: Record<string, number>) => ({ ...prev, [prevPrayerKey]: newModifier }));
      setIqamahPausedState((prev: Record<string, { paused: boolean; remainingSecs: number }>) => ({
        ...prev,
        [prevPrayerKey]: { paused: false, remainingSecs: 0 },
      }));
    } else {
      // Pausing: record current remaining seconds
      const pref = preferences[prevPrayerKey as PrayerKey];
      const activeModifier = iqamahModifier[prevPrayerKey] || 0;
      const iqamahOffsetMinutes = (pref?.iqamahOffset ?? 0) + activeModifier;
      const iqamahEndTime = new Date(prevPrayerTime.getTime() + iqamahOffsetMinutes * 60 * 1000);
      const currentRemaining = Math.max(0, Math.floor((iqamahEndTime.getTime() - Date.now()) / 1000));
      
      setIqamahPausedState((prev: Record<string, { paused: boolean; remainingSecs: number }>) => ({
        ...prev,
        [prevPrayerKey]: { paused: true, remainingSecs: currentRemaining },
      }));
    }
  }, [prevPrayerKey, prevPrayerTime, iqamahPausedState, iqamahModifier, preferences]);

  const handleIqamahAddMinute = useCallback(() => {
    if (!prevPrayerKey) return;
    
    // Add 1 minute to the modifier
    setIqamahModifier((prev: Record<string, number>) => ({
      ...prev,
      [prevPrayerKey]: (prev[prevPrayerKey] || 0) + 1,
    }));
    
    // If paused, also add 60 seconds to the frozen remaining seconds
    if (iqamahPausedState[prevPrayerKey]?.paused) {
      setIqamahPausedState((prev: Record<string, { paused: boolean; remainingSecs: number }>) => ({
        ...prev,
        [prevPrayerKey]: {
          paused: true,
          remainingSecs: (prev[prevPrayerKey]?.remainingSecs || 0) + 60,
        },
      }));
    }
  }, [prevPrayerKey, iqamahPausedState]);

  // Compute Active States for Azan Alert, Iqamah Countdown, and Solat Mode
  let azanAlertActive = false;
  let azanAlertRemainingSeconds = 0;
  let azanAlertPrayerName: string | null = null;
  
  let iqamahCountdownActive = false;
  let iqamahRemainingSeconds = 0;
  let iqamahTotalSeconds = 0;
  let currentPrayerNameForIqamah: string | null = null;
  
  let solatModeActive = false;
  let solatRemainingSeconds = 0;
  let solatTotalSeconds = 0;
  let solatPrayerName: string | null = null;
  let isSolatDuaStage = false;

  if (prevPrayerKey && prevPrayerTime && todayData) {
    const validKeys: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    
    if (validKeys.includes(prevPrayerKey as PrayerKey)) {
      const pref = preferences[prevPrayerKey as PrayerKey];
      const activeModifier = iqamahModifier[prevPrayerKey] || 0;
      const iqamahOffsetMinutes = settings.showIqamah ? ((pref?.iqamahOffset ?? 0) + activeModifier) : 0;
      
      const solatDurations = settings.solatModeDuration ?? { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 };
      const solatDurationMinutes = solatDurations[prevPrayerKey] ?? 10;
      
      const iqamahEndTime = new Date(prevPrayerTime.getTime() + iqamahOffsetMinutes * 60 * 1000);
      const solatEndTime = new Date(iqamahEndTime.getTime() + solatDurationMinutes * 60 * 1000);
      const duaDurationMinutes = settings.solatModeDuaDuration ?? 0;
      const duaEndTime = new Date(solatEndTime.getTime() + duaDurationMinutes * 60 * 1000);
      
      // 1. Azan Alert Active Check
      if (settings.azanAlertStyle && settings.azanAlertStyle !== 'none' && manuallyDismissedAzanAlert !== prevPrayerKey) {
        const alertDurationSeconds = settings.azanAlertDuration ?? 20;
        const alertEndTime = new Date(prevPrayerTime.getTime() + alertDurationSeconds * 1000);
        
        if (currentTime >= prevPrayerTime && currentTime < alertEndTime) {
          azanAlertActive = true;
          azanAlertRemainingSeconds = Math.max(0, Math.floor((alertEndTime.getTime() - currentTime.getTime()) / 1000));
          azanAlertPrayerName = prevPrayerName;
        }
      }
      
      // 2. Iqamah Countdown Active Check (only active if Azan alert is finished or dismissed)
      if (settings.showIqamah && iqamahOffsetMinutes > 0 && !azanAlertActive) {
        const isPaused = !!iqamahPausedState[prevPrayerKey]?.paused;
        const pausedSecs = iqamahPausedState[prevPrayerKey]?.remainingSecs || 0;
        
        if ((currentTime >= prevPrayerTime && currentTime < iqamahEndTime) || (isPaused && pausedSecs > 0)) {
          iqamahCountdownActive = true;
          iqamahTotalSeconds = iqamahOffsetMinutes * 60;
          
          if (isPaused) {
            iqamahRemainingSeconds = pausedSecs;
          } else {
            iqamahRemainingSeconds = Math.max(0, Math.floor((iqamahEndTime.getTime() - currentTime.getTime()) / 1000));
          }
          currentPrayerNameForIqamah = prevPrayerName;
        }
      }
      
      // 3. Solat Mode Active Check (active after iqamahEndTime, only if not manually exited and not paused)
      if (settings.solatModeEnabled && manuallyExitedSolatPrayer !== prevPrayerKey && !iqamahPausedState[prevPrayerKey]?.paused) {
        if (currentTime >= iqamahEndTime && currentTime < duaEndTime) {
          solatModeActive = true;
          const isDua = currentTime >= solatEndTime;
          isSolatDuaStage = isDua;
          
          if (isDua) {
            solatTotalSeconds = duaDurationMinutes * 60;
            solatRemainingSeconds = Math.max(0, Math.floor((duaEndTime.getTime() - currentTime.getTime()) / 1000));
          } else {
            solatTotalSeconds = solatDurationMinutes * 60;
            solatRemainingSeconds = Math.max(0, Math.floor((solatEndTime.getTime() - currentTime.getTime()) / 1000));
          }
          solatPrayerName = prevPrayerName;
        }
      }
    }
  }

  const isMosqueActive = azanAlertActive || iqamahCountdownActive || solatModeActive;

  return {
    manuallyDismissedAzanAlert,
    setManuallyDismissedAzanAlert,
    manuallyExitedSolatPrayer,
    setManuallyExitedSolatPrayer,
    mockAzanAlert,
    setMockAzanAlert,
    iqamahModifier,
    iqamahPausedState,
    handleIqamahTogglePause,
    handleIqamahAddMinute,
    azanAlertActive,
    azanAlertRemainingSeconds,
    azanAlertPrayerName,
    iqamahCountdownActive,
    iqamahRemainingSeconds,
    iqamahTotalSeconds,
    currentPrayerNameForIqamah,
    solatModeActive,
    solatRemainingSeconds,
    solatTotalSeconds,
    solatPrayerName,
    isSolatDuaStage,
    isMosqueActive,
  };
}
