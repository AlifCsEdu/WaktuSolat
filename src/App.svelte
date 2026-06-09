<script lang="ts">
  import "@material/web/button/filled-tonal-button.js";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { CalendarRange, Wifi, RefreshCw, Tv } from "lucide-svelte";
  
  import ZoneSelector from "./components/ZoneSelector.svelte";
  import ThemeControl from "./components/ThemeControl.svelte";
  import FullScreenToggle from "./components/FullScreenToggle.svelte";
  import ClockPanel from "./components/ClockPanel.svelte";
  import PrayerSchedule from "./components/PrayerSchedule.svelte";
  import FullCalendar from "./components/FullCalendar.svelte";
  import SettingsModal from "./components/SettingsModal.svelte";
  import WeatherWidget from "./components/WeatherWidget.svelte";
  import LocationToast from "./components/LocationToast.svelte";
  import AzanAlert from "./components/AzanAlert.svelte";
  import SolatMode from "./components/SolatMode.svelte";
  import SharePanel from "./components/SharePanel.svelte";
  import OnboardingFlow from "./components/OnboardingFlow.svelte";
  import TvModeView from "./components/TvModeView.svelte";
  import NotificationPrePrompt from "./components/NotificationPrePrompt.svelte";

  import type { PrayerKey } from "./types";
  import { cn } from "./lib/utils";
  import { StorageManager } from "./lib/StorageManager";

  import { appSettings } from "./state/settings.svelte";
  import { locationState } from "./state/location.svelte";
  import { prayerTimesState } from "./state/prayerTimes.svelte";
  import { activePrayerState } from "./state/activePrayer.svelte";
  import { notificationsState } from "./state/notifications.svelte";
  import { mosqueState } from "./state/mosque.svelte";
  import { themeState } from "./state/theme.svelte";
  import { currentTimeState } from "./state/time.svelte";

  let hasCompletedOnboarding = $state(StorageManager.getHasCompletedOnboarding());

  let showCalendar = $state(false);
  let showSharePanel = $state(false);
  let showNotificationSettings = $state(false);
  let showPrePrompt = $state(false);
  let pendingPermissionAction = $state<(() => void) | null>(null);

  let isTvMode = $derived(!!appSettings.settings.tvModeEnabled);
  
  function setIsTvMode(val: boolean) {
    appSettings.updateSettings({ tvModeEnabled: val });
  }

  function handleManualZoneSelect(zone: string) {
    locationState.setZone(zone, false);
  }

  const requestPermission = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      showPrePrompt = true;
      pendingPermissionAction = async () => {
        await notificationsState.requestPermission();
      };
    } else {
      await notificationsState.requestPermission();
    }
  };

  const togglePreference = async (key: PrayerKey) => {
    if (typeof Notification !== "undefined" && Notification.permission === "default" && !notificationsState.preferences[key].enabled) {
      showPrePrompt = true;
      pendingPermissionAction = async () => {
        await notificationsState.requestPermission();
        await notificationsState.togglePreference(key);
      };
    } else {
      await notificationsState.togglePreference(key);
    }
  };

  const handlePrePromptConfirm = async () => {
    showPrePrompt = false;
    if (pendingPermissionAction) {
      await pendingPermissionAction();
      pendingPermissionAction = null;
    } else {
      await notificationsState.requestPermission();
    }
  };

  const handlePrePromptClose = () => {
    showPrePrompt = false;
    pendingPermissionAction = null;
  };

  let computedPrayers = $derived(activePrayerState.computedPrayers);
  let mosque = $derived(mosqueState.computedState);
  let todayData = $derived(activePrayerState.todayData);
  let tomorrowData = $derived(activePrayerState.tomorrowData);
  let currentTime = $derived(currentTimeState.value);

  let visualStyle = $derived(appSettings.settings.visualStyle);
  let activeWallpaperUrl = $derived(themeState.activeWallpaperUrl);
  let computedWallpaperDim = $derived(themeState.computedWallpaperDim);
</script>

{#if !prayerTimesState.weekData.length && prayerTimesState.isLoading && !prayerTimesState.showSkeleton}
  <div class="min-h-[100dvh] bg-[var(--md-sys-color-background)]"></div>
{:else if !prayerTimesState.weekData.length && prayerTimesState.showSkeleton}
  <div class="min-h-[100dvh] lg:h-[100dvh] flex flex-col w-full font-sans text-[var(--md-sys-color-on-background)] lg:overflow-hidden relative bg-[var(--md-sys-color-background)]">
    <main class="flex-1 w-full max-w-[1920px] mx-auto relative z-10 flex flex-col lg:flex-row px-3 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-3 lg:py-4 gap-4 sm:gap-6 lg:gap-8 xl:gap-12 lg:overflow-hidden min-h-0">
      <section class="flex flex-col w-full lg:w-[50%] xl:w-[55%] lg:overflow-visible pb-2 lg:pb-0 min-h-0 relative z-20">
        <header class="relative flex items-center gap-3 z-[60] mb-2 flex-wrap shrink-0">
          <div class="w-48 h-12 bg-[var(--md-sys-color-surface-container)] rounded-[1.25rem] animate-pulse"></div>
          <div class="w-32 h-12 bg-[var(--md-sys-color-surface-container-high)] rounded-[1.25rem] animate-pulse ml-auto sm:ml-0 hidden sm:block"></div>
          <div class="w-12 h-12 bg-[var(--md-sys-color-surface-container-highest)] rounded-full animate-pulse ml-auto sm:ml-0"></div>
          <div class="w-12 h-12 bg-[var(--md-sys-color-surface-container)] rounded-full animate-pulse"></div>
        </header>
        <div class="flex-1 flex flex-col justify-center lg:justify-start xl:justify-center min-h-0 lg:overflow-y-auto no-scrollbar pt-1">
          <div class="flex-1 flex flex-col justify-between h-full">
            <div>
              <div class="relative w-full mb-4 lg:mb-6 bg-[var(--md-sys-color-surface-container-low)] rounded-3xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 shadow-sm animate-pulse h-[110px] lg:h-[130px]"></div>
              <div class="flex flex-col items-center sm:items-start text-center sm:text-left z-10 w-full mt-4 sm:mt-6 py-1 sm:py-2 pl-2 sm:pl-4 gap-4">
                <div class="w-64 h-16 sm:h-20 lg:h-24 bg-[var(--md-sys-color-surface-container-high)] rounded-2xl animate-pulse"></div>
                <div class="w-48 h-6 sm:h-8 bg-[var(--md-sys-color-surface-container-highest)] rounded-xl animate-pulse"></div>
                <div class="w-36 h-4 sm:h-5 bg-[var(--md-sys-color-surface-container)] rounded-lg animate-pulse mb-8"></div>
              </div>
            </div>
            <div class="flex flex-row gap-3 mt-auto w-full shrink-0">
              <div class="bg-[var(--md-sys-color-surface-container-high)] rounded-[1.5rem] lg:rounded-[2rem] flex-1 min-h-[100px] lg:min-h-[120px] animate-pulse"></div>
              <div class="bg-[var(--md-sys-color-surface-container)] rounded-[1.5rem] lg:rounded-[2rem] flex-1 min-h-[100px] lg:min-h-[120px] animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>
      <section class="w-full lg:w-[50%] xl:w-[45%] lg:pl-6 xl:pl-8 lg:border-l-4 border-[var(--md-sys-color-surface-variant)] flex flex-col lg:overflow-hidden min-h-0 relative z-10 pt-4 lg:pt-0">
        <div class="flex-1 overflow-y-auto lg:overflow-hidden pr-2 pb-6 lg:pb-0 no-scrollbar min-h-0 flex flex-col">
          <div class="flex flex-col gap-2 min-h-full lg:flex-1 lg:min-h-0">
            <div class="flex w-full items-center justify-between bg-[var(--md-sys-color-surface-container-low)] rounded-[1.5rem] p-3 sm:p-4 lg:p-3 xl:p-4 shrink-0 animate-pulse h-[70px] sm:h-[80px]"></div>
            <div class="flex-1 w-full flex flex-col min-h-0 animate-pulse mt-2">
              <div class="flex justify-between items-center mb-1 lg:mb-2 pl-3 pr-1 shrink-0 h-[40px]">
                <div class="w-32 h-8 bg-[var(--md-sys-color-surface-container-highest)] rounded-xl"></div>
                <div class="w-10 h-10 bg-[var(--md-sys-color-surface-container-highest)] rounded-[1rem]"></div>
              </div>
              <div class="flex px-1 sm:px-2 gap-2 mb-2 lg:mb-3 pt-1 shrink-0">
                <div class="w-16 h-8 bg-[var(--md-sys-color-surface-container-high)] rounded-full"></div>
                <div class="w-20 h-8 bg-[var(--md-sys-color-surface-container)] rounded-full"></div>
                <div class="w-20 h-8 bg-[var(--md-sys-color-surface-container)] rounded-full"></div>
              </div>
              <div class="flex flex-col gap-1.5 sm:gap-2 flex-1 justify-between px-1 sm:px-2 pb-2 lg:pb-0 min-h-0">
                {#each Array(6) as _, i}
                  <div class="flex-1 min-h-[50px] lg:min-h-[60px] bg-[var(--md-sys-color-surface-container-low)] rounded-[1.25rem] sm:rounded-[1.5rem] w-full"></div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
{:else}
  <div class={cn(
      "min-h-[100dvh] lg:h-[100dvh] flex flex-col w-full font-sans text-[var(--md-sys-color-on-background)] lg:overflow-hidden relative",
      !(appSettings.settings.wallpaperEnabled && activeWallpaperUrl) && "bg-[var(--md-sys-color-background)]",
      !(appSettings.settings.wallpaperEnabled && activeWallpaperUrl) && visualStyle === 'glass' && "bg-gradient-to-br from-[var(--md-sys-color-background)] via-[var(--md-sys-color-surface-variant)] to-[var(--md-sys-color-primary-container)]",
      appSettings.settings.wallpaperEnabled && activeWallpaperUrl && appSettings.settings.wallpaperTextGlow && "text-glow-boost"
    )}>
    
    {#if appSettings.settings.wallpaperEnabled && activeWallpaperUrl}
      <div class="app-wallpaper-layer">
        <img
          src={activeWallpaperUrl}
          alt=""
          class="app-wallpaper-image"
          style="filter: blur({appSettings.settings.wallpaperBlur ?? 10}px)"
        />
        {#if appSettings.settings.wallpaperVignette}
          <div class="app-wallpaper-vignette"></div>
        {/if}
        <div
          class="app-wallpaper-overlay"
          style="background-color: {appSettings.settings.wallpaperOverlayStyle === 'dark' ? '#0f172a' : appSettings.settings.wallpaperOverlayStyle === 'light' ? '#ffffff' : 'var(--md-sys-color-background)'}; opacity: {computedWallpaperDim}"
        ></div>
      </div>
    {/if}

    {#if showCalendar}
      <FullCalendar
        isOpen={showCalendar}
        initialMonthData={prayerTimesState.weekData}
        selectedZone={locationState.selectedZone}
        onClose={() => showCalendar = false}
      />
    {/if}
    
    <SettingsModal
      isOpen={showNotificationSettings && !mosqueState.mockAzanAlert}
      onClose={() => showNotificationSettings = false}
      preferences={notificationsState.preferences}
      onUpdatePreference={(k: any, u: any) => notificationsState.updatePreference(k, u)}
      onResetPreferences={() => notificationsState.resetPreferences()}
      permission={notificationsState.permission}
      onRequestPermission={requestPermission}
      onTestSound={(s: any, m: any) => notificationsState.playSound(s, m)}
      selectedZone={locationState.selectedZone}
      onPreviewAzanAlert={(style: any) => {
        mosqueState.mockAzanAlert = {
          prayerName: computedPrayers.prevPrayerName || appSettings.t("fajr"),
          style,
          remainingSeconds: appSettings.settings.azanAlertDuration ?? 20
        };
      }}
    />

    {#if (mosque.azanAlertActive || mosqueState.mockAzanAlert) && (mosque.azanAlertPrayerName || mosqueState.mockAzanAlert?.prayerName)}
      <AzanAlert
        prayerName={mosqueState.mockAzanAlert ? mosqueState.mockAzanAlert.prayerName : (mosque.azanAlertPrayerName || "")}
        prayerTime={mosqueState.mockAzanAlert ? new Date() : (computedPrayers.prevPrayerTime || new Date())}
        remainingSeconds={mosqueState.mockAzanAlert ? mosqueState.mockAzanAlert.remainingSeconds : mosque.azanAlertRemainingSeconds}
        style={(mosqueState.mockAzanAlert ? mosqueState.mockAzanAlert.style : appSettings.settings.azanAlertStyle || 'standard') as any}
        onDismiss={() => {
          if (mosqueState.mockAzanAlert) {
            mosqueState.mockAzanAlert = null;
          } else if (computedPrayers.prevPrayerKey) {
            mosqueState.manuallyDismissedAzanAlert = computedPrayers.prevPrayerKey;
          }
        }}
      />
    {/if}

    {#if mosque.solatModeActive && mosque.solatPrayerName}
      <SolatMode
        prayerName={mosque.solatPrayerName}
        remainingSeconds={mosque.solatRemainingSeconds}
        showClock={appSettings.settings.solatModeShowClock}
        showQibla={appSettings.settings.solatModeShowQibla}
        isDuaStage={mosque.isSolatDuaStage}
        {isTvMode}
        onExit={() => {
          if (computedPrayers.prevPrayerKey) mosqueState.manuallyExitedSolatPrayer = computedPrayers.prevPrayerKey;
        }}
      />
    {/if}

    <main
      in:fade={{ duration: 300 }}
      class={cn(
        "flex-1 w-full max-w-[2560px] mx-auto relative z-10 flex flex-col lg:flex-row px-[var(--sys-spacing-edge)] py-[var(--sys-spacing-edge)] gap-[var(--sys-spacing-section)] lg:overflow-hidden min-h-0",
        !(appSettings.settings.wallpaperEnabled && activeWallpaperUrl) && "bg-[var(--md-sys-color-background)]",
        !(appSettings.settings.wallpaperEnabled && activeWallpaperUrl) && visualStyle === 'glass' && "bg-gradient-to-br from-[var(--md-sys-color-background)] via-[var(--md-sys-color-surface-variant)] to-[var(--md-sys-color-primary-container)]",
        appSettings.settings.wallpaperEnabled && activeWallpaperUrl && appSettings.settings.wallpaperTextGlow && "text-glow-boost"
      )}
    >
      <LocationToast 
        promptZone={locationState.promptZone}
        promptLocationName={locationState.promptLocationName}
        autoUpdatedZone={locationState.autoUpdatedZone}
        autoUpdatedLocationName={locationState.autoUpdatedLocationName}
        onAccept={() => locationState.acceptPrompt()}
        onDismiss={() => locationState.dismissPrompt()}
      />

      <section
        in:fly={{ y: 15, duration: 400 }}
        class="flex flex-col w-full lg:w-[50%] xl:w-[55%] lg:overflow-hidden pb-2 lg:pb-0 min-h-0 relative z-20"
      >
        <header
          in:fly={{ y: -10, duration: 400 }}
          class="relative flex items-center gap-2 sm:gap-3 z-[60] mb-6 p-2 bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/50 rounded-[24px] sm:rounded-full shadow-md shrink-0 flex-wrap lg:w-full"
        >
          <ZoneSelector
            selectedZone={locationState.selectedZone}
            onZoneSelect={handleManualZoneSelect}
            isAutoDetecting={locationState.isDetecting}
            currentLocationName={locationState.currentLocationName}
          />
          <div
            class="ml-auto sm:ml-2 shrink-0 inline-flex w-12 h-12 lg:w-[48px] lg:h-[48px] transition-transform hover:scale-105 active:scale-95"
          >
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-tonal-icon-button
              onclick={() => showCalendar = true}
              title={appSettings.t("calendarLabel")}
              aria-label={appSettings.t("calendarLabel")}
              style="--md-filled-tonal-icon-button-container-shape: 999px; width: 100%; height: 100%;"
            >
              <CalendarRange class="w-5 h-5 lg:w-[20px] lg:h-[20px] stroke-[2.5]" />
            </md-filled-tonal-icon-button>
          </div>
          <div class="flex gap-2 shrink-0 ml-auto sm:ml-0 bg-[var(--md-sys-color-surface-container-highest)] p-1.5 rounded-full">
            {#if appSettings.settings.showTvShortcut}
              <div
                class="inline-flex shrink-0 w-12 h-12 lg:w-[56px] lg:h-[56px] transition-transform hover:scale-105 active:scale-95"
              >
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <md-filled-tonal-icon-button
                  onclick={() => setIsTvMode(true)}
                  title={appSettings.settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode"}
                  aria-label={appSettings.settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode"}
                  style="--md-filled-tonal-icon-button-container-shape: 24px; width: 100%; height: 100%;"
                >
                  <Tv size={24} class="stroke-[2.5]" />
                </md-filled-tonal-icon-button>
              </div>
            {/if}
            <ThemeControl />
            <FullScreenToggle />
          </div>
        </header>

        <div class="flex-1 flex flex-col justify-center lg:justify-start xl:justify-center min-h-0 lg:overflow-y-visible no-scrollbar pt-1">
          <ClockPanel
            {currentTime}
            nextPrayerName={computedPrayers.nextPrayerName}
            nextPrayerTime={computedPrayers.nextPrayerTime}
            prevPrayerTime={computedPrayers.prevPrayerTime}
            prevPrayerName={computedPrayers.prevPrayerName}
            todayHijri={todayData?.hijri}
            syurukTime={todayData?.syuruk ? todayData.syuruk.slice(0, 5) : null}
            {todayData}
            onCalendarClick={() => showCalendar = true}
            iqamahCountdownActive={mosque.iqamahCountdownActive}
            iqamahRemainingSeconds={mosque.iqamahRemainingSeconds}
            iqamahTotalSeconds={mosque.iqamahTotalSeconds}
            currentPrayerNameForIqamah={mosque.currentPrayerNameForIqamah}
            iqamahPaused={computedPrayers.prevPrayerKey ? !!mosqueState.iqamahPausedState[computedPrayers.prevPrayerKey]?.paused : false}
            onIqamahTogglePause={() => mosqueState.handleIqamahTogglePause()}
            onIqamahAddMinute={() => mosqueState.handleIqamahAddMinute()}
          />
        </div>
      </section>

      <section
        in:fly={{ x: 15, duration: 400 }}
        class="m3e-panel-right"
      >
        {#if prayerTimesState.error}
          <div class="bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] p-4 rounded-4xl mb-6 shrink-0 shadow-sm">
            {prayerTimesState.error}
          </div>
        {/if}

        <div class="m3e-panel-right-scrollable">
          <div class="flex flex-col gap-2 min-h-full lg:flex-1 lg:min-h-0">
            <WeatherWidget selectedZone={locationState.selectedZone} userCoords={locationState.userCoords} currentLocationName={locationState.currentLocationName} />
            <PrayerSchedule
              {todayData}
              {tomorrowData}
              nextPrayerKey={computedPrayers.nextPrayerKey}
              currentPrayerKey={computedPrayers.prevPrayerKey}
              preferences={notificationsState.preferences}
              onTogglePreference={togglePreference}
              notificationPermission={notificationsState.permission}
              onRequestPermission={requestPermission}
              onSettingsClick={() => showNotificationSettings = true}
              onShareClick={() => showSharePanel = true}
              {currentTime}
            />
          </div>
        </div>
      </section>
    </main>

    <SharePanel
      isOpen={showSharePanel}
      onClose={() => showSharePanel = false}
      currentZone={locationState.selectedZone}
      currentZoneData={todayData}
    />

    {#if prayerTimesState.showOnlineSyncToast}
      <div
        in:fly={{ y: 50, duration: 300 }}
        out:fly={{ y: 20, duration: 200 }}
        class={cn(
          "fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md z-[80] flex items-center justify-between gap-4 p-5 rounded-3xl shadow-xl border cursor-default bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline)]/20 shadow-black/30",
          visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]",
          visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[12px] border border-[var(--glass-border)]",
          visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
        )}
      >
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] mt-0.5">
            <Wifi class="w-5 h-5" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-sm text-[var(--md-sys-color-on-surface)]">
              {prayerTimesState.syncStatus === 'success' ? appSettings.t("syncSuccess") : prayerTimesState.syncStatus === 'error' ? appSettings.t("syncFailed") : appSettings.t("backOnline")}
            </span>
            <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-normal">
              {prayerTimesState.syncStatus === 'success' 
                ? (appSettings.settings.language === "ms" ? "Waktu solat dikemaskini!" : "Prayer times synchronized!") 
                : prayerTimesState.syncStatus === 'error'
                ? (appSettings.settings.language === "ms" ? "Gagal mengemaskini waktu solat." : "Failed to sync prayer times.")
                : appSettings.t("backOnlineToastDesc")}
            </p>
          </div>
        </div>
        
        <div class="flex gap-2 shrink-0">
          {#if prayerTimesState.syncStatus === 'idle'}
            <button
              onclick={() => prayerTimesState.showOnlineSyncToast = false}
              class="px-3 py-2 text-xs font-bold rounded-full text-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-variant)]/50 transition-transform hover:scale-105 active:scale-95"
            >
              {appSettings.t("close")}
            </button>
            <button
              disabled={prayerTimesState.isSyncing}
              onclick={() => prayerTimesState.triggerSilentSync()}
              class="px-4 py-2 text-xs font-bold rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:opacity-95 flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            >
              {#if prayerTimesState.isSyncing}
                <RefreshCw size={12} class="animate-spin" />
              {/if}
              {appSettings.t("syncNow")}
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <NotificationPrePrompt
      isOpen={showPrePrompt}
      onClose={handlePrePromptClose}
      onConfirm={handlePrePromptConfirm}
      language={appSettings.settings.language || "ms"}
    />

    {#if !hasCompletedOnboarding}
      <OnboardingFlow 
        language={appSettings.settings.language || "ms"} 
        onComplete={(zone) => {
          StorageManager.saveRecentZone(zone);
          locationState.setZone(zone, false);
          hasCompletedOnboarding = true;
          StorageManager.setHasCompletedOnboarding(true);
        }}
      />
    {/if}

    {#if isTvMode}
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
        onClose={() => setIsTvMode(false)}
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
        onSettingsClick={() => showNotificationSettings = true}
      />
    {/if}
  </div>
{/if}
