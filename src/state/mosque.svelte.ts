import { PrayerKey } from '../types';
import { appSettings } from './settings.svelte';
import { activePrayerState } from './activePrayer.svelte';
import { notificationsState } from './notifications.svelte';
import { currentTimeState } from './time.svelte';

class MosqueState {
  manuallyDismissedAzanAlert = $state<string | null>(null);
  manuallyExitedSolatPrayer = $state<string | null>(null);
  mockAzanAlert = $state<{ prayerName: string; style: string; remainingSeconds: number } | null>(null);
  
  iqamahModifier = $state<Record<string, number>>({});
  iqamahPausedState = $state<Record<string, { paused: boolean; remainingSecs: number }>>({});

  private mockAlertInterval: any;
  private lastActivePrayer: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      $effect.root(() => {
        // Reset states on prayer time change
        $effect(() => {
          const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
          if (prevPrayerKey && prevPrayerKey !== this.lastActivePrayer) {
            this.manuallyDismissedAzanAlert = null;
            this.manuallyExitedSolatPrayer = null;
            
            this.iqamahModifier = { ...this.iqamahModifier, [prevPrayerKey]: 0 };
            this.iqamahPausedState = {
              ...this.iqamahPausedState,
              [prevPrayerKey]: { paused: false, remainingSecs: 0 },
            };
            
            this.lastActivePrayer = prevPrayerKey;
          }
        });

        // Mock Azan alert ticker
        $effect(() => {
          if (this.mockAzanAlert) {
            if (this.mockAlertInterval) clearInterval(this.mockAlertInterval);
            this.mockAlertInterval = setInterval(() => {
              if (this.mockAzanAlert) {
                if (this.mockAzanAlert.remainingSeconds <= 1) {
                  clearInterval(this.mockAlertInterval);
                  this.mockAzanAlert = null;
                } else {
                  this.mockAzanAlert.remainingSeconds -= 1;
                }
              }
            }, 1000);
          } else {
            if (this.mockAlertInterval) clearInterval(this.mockAlertInterval);
          }
        });
      });
    }
  }

  handleIqamahTogglePause() {
    const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
    const prevPrayerTime = activePrayerState.computedPrayers.prevPrayerTime;
    if (!prevPrayerKey || !prevPrayerTime) return;

    const isPaused = !!this.iqamahPausedState[prevPrayerKey]?.paused;
    const pref = notificationsState.preferences[prevPrayerKey as PrayerKey];
    
    if (isPaused) {
      const remainingSecs = this.iqamahPausedState[prevPrayerKey]?.remainingSecs || 0;
      const baseOffset = pref?.iqamahOffset ?? 0;
      
      const newIqamahEndTime = new Date(Date.now() + remainingSecs * 1000);
      const newModifier = (newIqamahEndTime.getTime() - prevPrayerTime.getTime()) / 60000 - baseOffset;
      
      this.iqamahModifier = { ...this.iqamahModifier, [prevPrayerKey]: newModifier };
      this.iqamahPausedState = {
        ...this.iqamahPausedState,
        [prevPrayerKey]: { paused: false, remainingSecs: 0 },
      };
    } else {
      const activeModifier = this.iqamahModifier[prevPrayerKey] || 0;
      const iqamahOffsetMinutes = (pref?.iqamahOffset ?? 0) + activeModifier;
      const iqamahEndTime = new Date(prevPrayerTime.getTime() + iqamahOffsetMinutes * 60 * 1000);
      const currentRemaining = Math.max(0, Math.floor((iqamahEndTime.getTime() - Date.now()) / 1000));
      
      this.iqamahPausedState = {
        ...this.iqamahPausedState,
        [prevPrayerKey]: { paused: true, remainingSecs: currentRemaining },
      };
    }
  }

  handleIqamahAddMinute() {
    const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
    if (!prevPrayerKey) return;
    
    this.iqamahModifier = {
      ...this.iqamahModifier,
      [prevPrayerKey]: (this.iqamahModifier[prevPrayerKey] || 0) + 1,
    };
    
    if (this.iqamahPausedState[prevPrayerKey]?.paused) {
      this.iqamahPausedState = {
        ...this.iqamahPausedState,
        [prevPrayerKey]: {
          paused: true,
          remainingSecs: (this.iqamahPausedState[prevPrayerKey]?.remainingSecs || 0) + 60,
        },
      };
    }
  }

  handleIqamahSubMinute() {
    const prevPrayerKey = activePrayerState.computedPrayers.prevPrayerKey;
    if (!prevPrayerKey) return;
    
    this.iqamahModifier = {
      ...this.iqamahModifier,
      [prevPrayerKey]: (this.iqamahModifier[prevPrayerKey] || 0) - 1,
    };
    
    if (this.iqamahPausedState[prevPrayerKey]?.paused) {
      this.iqamahPausedState = {
        ...this.iqamahPausedState,
        [prevPrayerKey]: {
          paused: true,
          remainingSecs: Math.max(0, (this.iqamahPausedState[prevPrayerKey]?.remainingSecs || 0) - 60),
        },
      };
    }
  }

  computedState = $derived.by(() => {
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

    const { prevPrayerKey, prevPrayerTime, prevPrayerName } = activePrayerState.computedPrayers;
    const todayData = activePrayerState.todayData;
    const currentTime = currentTimeState.value;

    if (prevPrayerKey && prevPrayerTime && todayData) {
      const validKeys: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      
      if (validKeys.includes(prevPrayerKey as PrayerKey)) {
        const pref = notificationsState.preferences[prevPrayerKey as PrayerKey];
        const activeModifier = this.iqamahModifier[prevPrayerKey] || 0;
        const iqamahOffsetMinutes = appSettings.settings.showIqamah ? ((pref?.iqamahOffset ?? 0) + activeModifier) : 0;
        
        const solatDurations = appSettings.settings.solatModeDuration ?? { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 };
        const solatDurationMinutes = solatDurations[prevPrayerKey] ?? 10;
        
        const iqamahEndTime = new Date(prevPrayerTime.getTime() + iqamahOffsetMinutes * 60 * 1000);
        const solatEndTime = new Date(iqamahEndTime.getTime() + solatDurationMinutes * 60 * 1000);
        const duaDurationMinutes = appSettings.settings.solatModeDuaDuration ?? 0;
        const duaEndTime = new Date(solatEndTime.getTime() + duaDurationMinutes * 60 * 1000);
        
        if (appSettings.settings.azanAlertStyle && appSettings.settings.azanAlertStyle !== 'none' && this.manuallyDismissedAzanAlert !== prevPrayerKey) {
          const alertDurationSeconds = appSettings.settings.azanAlertDuration ?? 20;
          const alertEndTime = new Date(prevPrayerTime.getTime() + alertDurationSeconds * 1000);
          
          if (currentTime >= prevPrayerTime && currentTime < alertEndTime) {
            azanAlertActive = true;
            azanAlertRemainingSeconds = Math.max(0, Math.floor((alertEndTime.getTime() - currentTime.getTime()) / 1000));
            azanAlertPrayerName = prevPrayerName;
          }
        }
        
        if (appSettings.settings.showIqamah && iqamahOffsetMinutes > 0 && !azanAlertActive) {
          const isPaused = !!this.iqamahPausedState[prevPrayerKey]?.paused;
          const pausedSecs = this.iqamahPausedState[prevPrayerKey]?.remainingSecs || 0;
          
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
        
        if (appSettings.settings.solatModeEnabled && this.manuallyExitedSolatPrayer !== prevPrayerKey && !this.iqamahPausedState[prevPrayerKey]?.paused) {
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
  });
}

export const mosqueState = new MosqueState();
