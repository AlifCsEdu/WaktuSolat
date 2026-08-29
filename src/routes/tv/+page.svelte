<script lang="ts">
  import TvModeView from '../../components/TvModeView.svelte';
  import { appSettings } from '../../state/settings.svelte';
  import { activePrayerState } from '../../state/activePrayer.svelte';
  import { locationState } from '../../state/location.svelte';
  import { mosqueState } from '../../state/mosque.svelte';
  import { currentTimeState } from '../../state/time.svelte';
  import { themeState } from '../../state/theme.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let computedPrayers = $derived(activePrayerState.computedPrayers);
  let mosque = $derived(mosqueState.computedState);
  let todayData = $derived(activePrayerState.todayData);
  let currentTime = $derived(currentTimeState.value);
  let activeWallpaperUrl = $derived(themeState.activeWallpaperUrl);
  let computedWallpaperDim = $derived(themeState.computedWallpaperDim);

  onMount(() => {
    // Ensure TV mode setting is active
    if (!appSettings.settings.tvModeEnabled) {
      appSettings.updateSettings({ tvModeEnabled: true });
    }
  });

  function handleClose() {
    appSettings.updateSettings({ tvModeEnabled: false });
    goto('/');
  }
</script>

<div class="fixed inset-0 z-50 overflow-hidden bg-[var(--md-sys-color-surface)]">
  <TvModeView
    {currentTime}
    {todayData}
    nextPrayerName={computedPrayers.nextPrayerName}
    nextPrayerTime={computedPrayers.nextPrayerTime}
    prevPrayerName={computedPrayers.prevPrayerKey}
    prevPrayerTime={computedPrayers.prevPrayerTime}
    selectedZone={locationState.selectedZone}
    currentLocationName={locationState.currentLocationName}
    t={(k: any) => appSettings.t(k as any)}
    settings={appSettings.settings}
    onClose={handleClose}
    iqamahCountdownActive={mosque.iqamahCountdownActive}
    iqamahRemainingSeconds={mosque.iqamahRemainingSeconds}
    iqamahTotalSeconds={mosque.iqamahTotalSeconds}
    {activeWallpaperUrl}
    {computedWallpaperDim}
    userCoords={locationState.userCoords}
    iqamahPaused={computedPrayers.prevPrayerKey ? !!mosqueState.iqamahPausedState[computedPrayers.prevPrayerKey]?.paused : false}
    onIqamahTogglePause={() => mosqueState.handleIqamahTogglePause()}
    onIqamahAddMinute={() => mosqueState.handleIqamahAddMinute()}
    onIqamahSubMinute={() => mosqueState.handleIqamahSubMinute()}
    onSettingsClick={() => goto('/settings')}
  />
</div>
