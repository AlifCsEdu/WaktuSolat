import { PrayerData, PrayerKey, Preferences, PrayerPreference, NotificationSound, PreAlertTime } from '../types';
import { appSettings } from './settings.svelte';
import { StorageManager } from '../lib/StorageManager';
import { activePrayerState } from './activePrayer.svelte';
import { currentTimeState } from './time.svelte';
import { audioSynthesizer } from '../lib/audio';

const DEFAULT_PREFS: Preferences = {
  imsak: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 10 },
  fajr: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 10 },
  syuruk: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 0 },
  dhuhr: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 10 },
  asr: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 10 },
  maghrib: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 5 },
  isha: { enabled: false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: 10 }
};

class NotificationsState {
  preferences = $state<Preferences>(DEFAULT_PREFS);
  permission = $state<NotificationPermission>("default");

  private notifiedRef: Record<string, boolean> = {};
  private prevDateRef: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.permission = Notification.permission;
      
      const savedV2 = StorageManager.getItem('prayer_notifications_v2');
      if (savedV2) {
        try {
          this.preferences = { ...DEFAULT_PREFS, ...JSON.parse(savedV2) };
        } catch (e) {}
      } else {
        const savedV1 = StorageManager.getItem('prayer_notifications');
        if (savedV1) {
          try {
            const oldPref = JSON.parse(savedV1);
            const newPref: Partial<Preferences> = {};
            for (const k in DEFAULT_PREFS) {
              const key = k as PrayerKey;
              newPref[key] = { enabled: oldPref[key] || false, sound: 'default', preAlert: 0, offset: 0, iqamahOffset: DEFAULT_PREFS[key].iqamahOffset };
            }
            this.preferences = { ...DEFAULT_PREFS, ...newPref } as Preferences;
          } catch (e) {}
        }
      }

      $effect.root(() => {
        $effect(() => {
          StorageManager.setItem('prayer_notifications_v2', JSON.stringify(this.preferences));
        });

        $effect(() => {
          this.checkNotifications(currentTimeState.value, activePrayerState.todayData);
        });
      });
    }
  }

  async requestPermission() {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      this.permission = p;
    }
  }

  async togglePreference(key: PrayerKey) {
    let p = this.permission;
    if (p === 'default' && !this.preferences[key].enabled) {
      if (typeof Notification !== "undefined") {
        p = await Notification.requestPermission();
        this.permission = p;
      }
    }
    
    this.preferences[key] = { ...this.preferences[key], enabled: !this.preferences[key].enabled };
  }

  updatePreference(key: PrayerKey, updates: Partial<PrayerPreference>) {
    this.preferences[key] = { ...this.preferences[key], ...updates };
  }

  resetPreferences() {
    this.preferences = DEFAULT_PREFS;
  }

  playSound(sound: NotificationSound, message: string) {
    const volumeMultiplier = (appSettings.settings.soundVolume ?? 80) / 100;
    
    if (sound === 'voice') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = appSettings.t("language") === "ms" ? 'ms-MY' : 'en-US';
        utterance.volume = volumeMultiplier;
        window.speechSynthesis.speak(utterance);
      }
      return;
    } 
    
    if (sound === 'azan1' || sound === 'azan2') {
      if (typeof window !== 'undefined') {
        const file = sound === 'azan1' ? '/audio/azan-makkah.mp3' : '/audio/azan-madinah.mp3';
        const audio = new Audio(file);
        audio.volume = volumeMultiplier * 0.5;
        audio.play().catch(() => {
          audioSynthesizer.play(sound === 'azan1' ? 'chime' : 'soft-chime', volumeMultiplier);
        });
      }
      return;
    }

    audioSynthesizer.play(sound, volumeMultiplier);
  }

  private checkNotifications(currentTime: Date, todayData: PrayerData | null) {
    const permission = typeof Notification !== 'undefined' ? Notification.permission : this.permission;
    console.log('[checkNotifications] CALLED:', {
      currentTimeStr: currentTime.toISOString(),
      currentTimeLocal: currentTime.toLocaleString(),
      todayDataDate: todayData ? todayData.date : null,
      permission
    });
    if (!todayData || permission !== 'granted') return;
    console.log('[checkNotifications] todayData contents:', JSON.stringify(todayData));

    if (this.prevDateRef !== todayData.date) {
      this.notifiedRef = {};
      this.prevDateRef = todayData.date;
    }

    const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    console.log('[checkNotifications] timeString:', timeString, 'prefs:', JSON.stringify(this.preferences));
    
    Object.keys(this.preferences).forEach((key) => {
      const pKey = key as PrayerKey;
      const pref = this.preferences[pKey];
      console.log('[checkNotifications] loop key:', pKey, 'enabled:', pref.enabled, 'todayValue:', todayData[pKey as keyof PrayerData]);
      
      if (pref.enabled && todayData[pKey as keyof PrayerData]) {
        const pTimeStr = (todayData[pKey as keyof PrayerData] as string).substring(0, 5);
        let triggerTimeStr = pTimeStr;
        if (pref.offset && pref.offset !== 0) {
          const [h, m] = pTimeStr.split(':').map(Number);
          const pDataDate = new Date();
          pDataDate.setHours(h, m, 0, 0);
          pDataDate.setMinutes(pDataDate.getMinutes() + pref.offset);
          triggerTimeStr = `${pDataDate.getHours().toString().padStart(2, '0')}:${pDataDate.getMinutes().toString().padStart(2, '0')}`;
        }
        console.log('[checkNotifications] match evaluation:', { pKey, pTimeStr, triggerTimeStr, timeString });
        
        const notificationKey = `${todayData.date}-${pKey}-main`;
        if (triggerTimeStr === timeString && !this.notifiedRef[notificationKey]) {
          this.notifiedRef[notificationKey] = true;
          
          const prayerName = appSettings.t(pKey) as string;
          const body = (appSettings.t("prayerTimeNow") as string).replace("{prayer}", prayerName);
          const title = (appSettings.t("prayerNotification") as string).replace("{prayer}", prayerName);
          
          try {
            console.log('[checkNotifications] creating main notification:', title, body);
            new Notification(title, { body, requireInteraction: true });
            console.log('[checkNotifications] main notification created successfully');
            this.playSound(pref.sound, body);
          } catch (e: any) {
            console.error('[checkNotifications] main notification failed:', e.message, e.stack);
          }
        }
        
        if (pref.preAlert > 0) {
          const [h, m] = triggerTimeStr.split(':').map(Number);
          const pDataDate = new Date();
          pDataDate.setHours(h, m, 0, 0);
          pDataDate.setMinutes(pDataDate.getMinutes() - pref.preAlert);
          const preAlertStr = `${pDataDate.getHours().toString().padStart(2, '0')}:${pDataDate.getMinutes().toString().padStart(2, '0')}`;
          
          const preAlertKey = `${todayData.date}-${pKey}-pre`;
          
          if (preAlertStr === timeString && !this.notifiedRef[preAlertKey]) {
            this.notifiedRef[preAlertKey] = true;
            
            const prayerName = appSettings.t(pKey) as string;
            const preBody = (appSettings.t("preAlertMessage") as string).replace("{minutes}", pref.preAlert.toString()).replace("{prayer}", prayerName);
            const preTitle = (appSettings.t("preAlertNotification") as string).replace("{prayer}", prayerName);
            
            try {
              console.log('[checkNotifications] creating pre-alert notification:', preTitle, preBody);
              new Notification(preTitle, { body: preBody, requireInteraction: true });
              console.log('[checkNotifications] pre-alert notification created successfully');
              if (pref.sound !== 'default') {
                 this.playSound(pref.sound, preBody);
              }
            } catch (e: any) {
              console.error('[checkNotifications] pre-alert notification failed:', e.message, e.stack);
            }
          }
        }
      }
    });
  }
}

export const notificationsState = new NotificationsState();
