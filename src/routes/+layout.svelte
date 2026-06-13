<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/stores';
  import { goto, onNavigate } from '$app/navigation';
  import '../index.css';
  import '../m3e-layout.css';
  
  // Custom Web Component registration
  import "@material/web/button/filled-tonal-button.js";
  import "@material/web/slider/slider.js";

  // Transitions
  import { m3Fade as fade, m3Fly as fly } from '../lib/transitions';

  import { overlayManager } from '../state/overlay.svelte';

  // Global State Singletons
  import { appSettings } from '../state/settings.svelte';
  import { locationState } from '../state/location.svelte';
  import { prayerTimesState } from '../state/prayerTimes.svelte';
  import { activePrayerState } from '../state/activePrayer.svelte';
  import { notificationsState } from '../state/notifications.svelte';
  import { mosqueState } from '../state/mosque.svelte';
  import { themeState } from '../state/theme.svelte';
  import { currentTimeState } from '../state/time.svelte';

  // Global Overlay Components
  import LocationToast from '../components/LocationToast.svelte';
  import AzanAlert from '../components/AzanAlert.svelte';
  import SolatMode from '../components/SolatMode.svelte';
  import OnboardingFlow from '../components/OnboardingFlow.svelte';
  import TvModeView from '../components/TvModeView.svelte';
  import NotificationPrePrompt from '../components/NotificationPrePrompt.svelte';
  import UpdateToast from '../components/UpdateToast.svelte';
  import { dev } from '$app/environment';

  import { cn } from '../lib/utils';
  import { StorageManager } from '../lib/StorageManager';
  import { initState } from '../state/init';

  let { children } = $props();

  let hasCompletedOnboarding = $state(false);
  let showPrePrompt = $state(false);
  let pendingPermissionAction = $state<(() => void) | null>(null);
  let showUpdateToast = $state(false);
  let registration = $state<ServiceWorkerRegistration | null>(null);

  function acceptUpdate() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  function dismissUpdate() {
    showUpdateToast = false;
  }

  // Derived layout aesthetics and overlay conditions
  let isTvMode = $derived(!!appSettings.settings.tvModeEnabled && $page.url.pathname === '/');
  let computedPrayers = $derived(activePrayerState.computedPrayers);
  let mosque = $derived(mosqueState.computedState);
  let todayData = $derived(activePrayerState.todayData);
  let currentTime = $derived(currentTimeState.value);
  let visualStyle = $derived(appSettings.settings.visualStyle);
  let activeWallpaperUrl = $derived(themeState.activeWallpaperUrl);
  let computedWallpaperDim = $derived(themeState.computedWallpaperDim);

  function setIsTvMode(val: boolean) {
    appSettings.updateSettings({ tvModeEnabled: val });
  }

  // Permission Context Setup for Child Pages
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

  setContext('layoutActions', {
    triggerPrePrompt(action: () => void) {
      showPrePrompt = true;
      pendingPermissionAction = action;
    },
    requestPermission
  });

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

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  $effect(() => {
    overlayManager.register('solat-mode', !!(mosque.solatModeActive && mosque.solatPrayerName));
  });
  $effect(() => {
    overlayManager.register('azan-alert', !!((mosque.azanAlertActive || mosqueState.mockAzanAlert) && (mosque.azanAlertPrayerName || mosqueState.mockAzanAlert?.prayerName)));
  });
  $effect(() => {
    overlayManager.register('location-toast', !!(locationState.promptZone || locationState.autoUpdatedZone));
  });
  $effect(() => {
    overlayManager.register('update-toast', showUpdateToast);
  });

  onMount(() => {
    if (typeof window !== 'undefined') {
      (window as any).appSettings = appSettings;
      (window as any).mosqueState = mosqueState;
      (window as any).locationState = locationState;
      (window as any).overlayManager = overlayManager;
      (window as any).setUpdateToast = (val: boolean) => {
        showUpdateToast = val;
      };
    }
    initState();
    hasCompletedOnboarding = StorageManager.getHasCompletedOnboarding();
    
    if ('serviceWorker' in navigator) {
      // Unregister legacy sw.js if found
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          const swUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
          if (swUrl.endsWith('/sw.js')) {
            reg.unregister().then(() => {
              console.log('Unregistered legacy sw.js');
            });
          }
        }
      });

      // Register new service worker manually if not in dev mode
      if (!dev) {
        navigator.serviceWorker.register('/service-worker.js').then((reg) => {
          registration = reg;
          console.log('ServiceWorker registered:', reg.scope);

          // Handle updatefound event
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  // Ensure it doesn't trigger on initial install by verifying a controller exists
                  if (navigator.serviceWorker.controller) {
                    showUpdateToast = true;
                  }
                }
              });
            }
          });

          // Check if there is already a waiting service worker (e.g. user refreshed but update is waiting)
          if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdateToast = true;
          }
        }).catch((err) => {
          console.warn('ServiceWorker registration failed:', err);
        });
      }

      // Listen to controllerchange to reload the page when the service worker skips waiting
      let refreshing = false;
      const hasController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasController && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  });
</script>

<!-- Main application wrapper carrying glassmorphic aesthetics -->
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

  {#if overlayManager.shouldRender('azan-alert')}
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

  {#if overlayManager.shouldRender('solat-mode')}
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

  {#if overlayManager.shouldRender('location-toast')}
    <LocationToast 
      promptZone={locationState.promptZone}
      promptLocationName={locationState.promptLocationName}
      autoUpdatedZone={locationState.autoUpdatedZone}
      autoUpdatedLocationName={locationState.autoUpdatedLocationName}
      onAccept={() => locationState.acceptPrompt()}
      onDismiss={() => locationState.dismissPrompt()}
    />
  {/if}

  {#if overlayManager.shouldRender('update-toast')}
    <UpdateToast
      onAccept={acceptUpdate}
      onDismiss={dismissUpdate}
    />
  {/if}

  <!-- Global SVG gooey morph filter definition -->
  <svg style="visibility: hidden; position: absolute; width: 0; height: 0;" xmlns="http://www.w3.org/2000/svg" version="1.1">
    <defs>
      <filter id="app-gooey-morph">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>

  <!-- SvelteKit Page Outlet -->
  {@render children()}

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
      onSettingsClick={() => goto('/settings')}
    />
  {/if}
</div>
