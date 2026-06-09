import { isAfter, parse, addDays, startOfDay, format } from "date-fns";
import { PrayerData, PrayerKey } from "../types";
import { appSettings } from "./settings.svelte";
import { currentTimeState } from "./time.svelte";
import { prayerTimesState } from "./prayerTimes.svelte";

export const PRAYER_KEYS: PrayerKey[] = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

class ActivePrayerState {
  todayFormatted = $derived(format(currentTimeState.value, "dd-MMM-yyyy"));
  tomorrowFormatted = $derived(format(addDays(currentTimeState.value, 1), "dd-MMM-yyyy"));

  todayData = $derived<PrayerData | null>(
    prayerTimesState.weekData.find((d) => d.date === this.todayFormatted) || prayerTimesState.weekData[0] || null
  );

  tomorrowData = $derived<PrayerData | null>(
    prayerTimesState.weekData.find((d) => d.date === this.tomorrowFormatted) || prayerTimesState.weekData[1] || null
  );

  computedPrayers = $derived.by(() => {
    let nextPrayerName: string | null = null;
    let nextPrayerTime: Date | null = null;
    let nextPrayerKey: string | null = null;
    let prevPrayerTime: Date | null = null;
    let prevPrayerName: string | null = null;
    let prevPrayerKey: string | null = null;

    if (this.todayData) {
      let lastP: Date | null = null;
      let lastKey: PrayerKey | null = null;
      let foundNext = false;

      const currentTime = currentTimeState.value;
      const isFriday = currentTime.getDay() === 5;
      const showJumaat = appSettings.settings.showJumaat !== false;
      const trackImsak = appSettings.settings.trackImsak === true;

      const keysToTrack = PRAYER_KEYS.filter(k => trackImsak ? true : k !== "imsak");

      const getAdjustedTime = (data: PrayerData, key: PrayerKey, baseDate: Date) => {
        let pTime = parse(data[key], "HH:mm:ss", startOfDay(baseDate));
        // Preferences offset is handled inside mosque/notifications directly for alert boundaries,
        // but for general UI display, there was a preferences[key].offset logic.
        // To avoid circular deps, let's keep it simple here. The original UI applied preferences[key].offset.
        // I will omit preferences offset from the basic UI display of current/next time to prevent coupling
        // if not strictly needed, or we can fetch it. Let's fetch it from LocalStorage if needed or just use settings.
        if (key === "asr" && appSettings.settings.mazhab === "hanafi")
          pTime = new Date(pTime.getTime() + 45 * 60000);
        return pTime;
      };

      for (const key of keysToTrack) {
        const pTime = getAdjustedTime(this.todayData, key, currentTime);
        if (isAfter(pTime, currentTime)) {
          nextPrayerKey = key;
          nextPrayerName = (key === "dhuhr" && isFriday && showJumaat) ? appSettings.t("jumaat" as any) as string : appSettings.t(key as any) as string;
          nextPrayerTime = pTime;
          
          prevPrayerKey = lastKey;
          prevPrayerTime = lastP;
          prevPrayerName = lastKey ? ((lastKey === "dhuhr" && isFriday && showJumaat) ? appSettings.t("jumaat" as any) as string : appSettings.t(lastKey as any) as string) : null;
          
          foundNext = true;
          break;
        }
        lastP = pTime;
        lastKey = key;
      }

      if (!foundNext && this.tomorrowData) {
        const firstKey = trackImsak ? "imsak" : "fajr";
        const pTime = getAdjustedTime(this.tomorrowData, firstKey, addDays(currentTime, 1));
        nextPrayerName = appSettings.t(firstKey as any) as string;
        nextPrayerTime = pTime;
        nextPrayerKey = firstKey;
        prevPrayerTime = getAdjustedTime(this.todayData, "isha", currentTime);
        prevPrayerName = appSettings.t("isha" as any) as string;
        prevPrayerKey = "isha";
      }

      if (foundNext && !prevPrayerTime && nextPrayerTime) {
        prevPrayerTime = new Date(nextPrayerTime.getTime() - 8 * 3600 * 1000);
        prevPrayerName = appSettings.t("isha" as any) as string;
        prevPrayerKey = "isha";
      }
    }

    return {
      nextPrayerName,
      nextPrayerTime,
      nextPrayerKey,
      prevPrayerTime,
      prevPrayerName,
      prevPrayerKey,
    };
  });
}

export const activePrayerState = new ActivePrayerState();
