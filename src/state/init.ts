import { locationState } from "./location.svelte";
import { prayerTimesState } from "./prayerTimes.svelte";

export function initState() {
  if (typeof window !== "undefined") {
    locationState.init();
    prayerTimesState.init();
  }
}
