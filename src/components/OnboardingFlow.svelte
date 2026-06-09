<script lang="ts">
  import {
    Sparkles,
    MapPin,
    Bell,
    Volume2,
    Compass,
    Play,
    Pause,
    ArrowRight,
    Check
  } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { StorageManager } from "../lib/StorageManager";
  import { JAKIM_ZONES } from "../lib/zones";
  import { sanitizeInput } from "../lib/security";
  import "@material/web/button/filled-button.js";
  import "@material/web/button/outlined-button.js";
  import "@material/web/button/filled-tonal-button.js";
  import "@material/web/icon/icon.js";
  import "@material/web/textfield/filled-text-field.js";
  import "@material/web/ripple/ripple.js";
  import { fade, fly, scale } from "svelte/transition";

  let { onComplete, language } = $props<{
    onComplete: (zone: string) => void;
    language: "ms" | "en";
  }>();

  let currentStep = $state(0);
  let selectedZone = $state("SGR01");
  let gpsLoading = $state(false);
  let gpsError = $state<string | null>(null);
  let gpsSuccess = $state(false);
  let searchQuery = $state("");
  let notificationPermission = $state<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  
  let selectedSound = $state<string>("chime");
  let isPlayingSound = $state<string | null>(null);
  let audioCtx = $state<AudioContext | null>(null);

  let isMalay = $derived(language === "ms");

  let tOnboarding = $derived({
    welcomeTitle: isMalay ? "Selamat Pulang" : "Welcome Home",
    welcomeDesc: isMalay 
      ? "AlurWaktu direka khas untuk menjadi pengalaman waktu solat paling elegan dan premium yang pernah anda rasa." 
      : "AlurWaktu is crafted to be the most elegant and premium prayer times experience you've ever felt.",
    startBtn: isMalay ? "Terokai Sekarang" : "Begin Experience",
    
    locTitle: isMalay ? "Di manakah Anda?" : "Where Are You?",
    locDesc: isMalay 
      ? "Pilih kawasan anda untuk sinkronisasi waktu solat luar talian yang sangat pantas." 
      : "Select your zone for ultra-fast, offline-capable prayer time syncing.",
    gpsBtn: isMalay ? "Kesan Automatik" : "Auto-detect",
    gpsLoading: isMalay ? "Mencari..." : "Detecting...",
    gpsSuccessText: isMalay ? "Selesai Dikesan!" : "Matched!",
    searchPlace: isMalay ? "Cari zon / negeri..." : "Search zone or state...",

    notifTitle: isMalay ? "Makluman Agung" : "Elegant Alerts",
    notifDesc: isMalay 
      ? "Berikan kami keizinan untuk mengingatkan anda melalui notifikasi indah dan visual menawan apabila tiba waktu." 
      : "Grant us permission to gently remind you through beautiful notifications and visual cues when it's time.",
    notifBtn: isMalay ? "Beri Keizinan" : "Grant Access",
    notifGranted: isMalay ? "Keizinan Diberi" : "Access Granted",
    notifSkip: isMalay ? "Mungkin Nanti" : "Maybe Later",

    soundTitle: isMalay ? "Tandatangan Audio" : "Audio Signature",
    soundDesc: isMalay 
      ? "Sentuhan terakhir. Pilih bunyi akustik kegemaran anda untuk peringatan azan." 
      : "The final touch. Pick your favorite acoustic chime for adhan reminders.",
    finishBtn: isMalay ? "Lengkap & Mula" : "Finish & Start",
    backBtn: isMalay ? "Kembali" : "Back",
    nextBtn: isMalay ? "Seterusnya" : "Next"
  });

  let sounds = $derived([
    { id: 'chime', name: isMalay ? "Alunan Loceng Chime" : "Acoustic Chime" },
    { id: 'soft-chime', name: isMalay ? "Genta Lembut" : "Soft Bell" },
    { id: 'ambient-gong', name: isMalay ? "Gong Sufi Kuno" : "Mystical Sufi Gong" },
    { id: 'beep', name: isMalay ? "Isyarat Digital" : "Digital Beep" }
  ]);

  const stepsCount = 4;

  const handleNext = () => {
    if (currentStep < stepsCount - 1) {
      currentStep += 1;
    } else {
      StorageManager.setHasCompletedOnboarding(true);
      onComplete(selectedZone);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      currentStep -= 1;
    }
  };

  const playPreviewSound = (soundType: string) => {
    try {
      if (isPlayingSound) {
        isPlayingSound = null;
        return;
      }
      
      const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtx) audioCtx = ctx;

      isPlayingSound = soundType;
      const startTime = ctx.currentTime;

      const playTone = (freq: number, type: OscillatorType, delay: number, dur: number, vol = 0.15) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime + delay);
        
        gain.gain.setValueAtTime(0, startTime + delay);
        gain.gain.linearRampToValueAtTime(vol, startTime + delay + Math.min(0.05, dur * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.00001, startTime + delay + dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime + delay);
        osc.stop(startTime + delay + dur);
      };

      if (soundType === 'beep') {
        playTone(880, 'sine', 0, 0.4, 0.1);
        playTone(880, 'sine', 0.5, 0.4, 0.1);
      } else if (soundType === 'chime') {
        playTone(523.25, 'sine', 0, 1.0, 0.12);
        playTone(659.25, 'sine', 0.15, 1.0, 0.12);
        playTone(783.99, 'sine', 0.3, 1.5, 0.12);
      } else if (soundType === 'soft-chime') {
        playTone(440, 'triangle', 0, 1.2, 0.08);
        playTone(329.63, 'triangle', 0.4, 1.5, 0.08);
      } else if (soundType === 'ambient-gong') {
        playTone(110.00, 'triangle', 0, 2.5, 0.25);
        playTone(220.00, 'sine', 0.05, 2.0, 0.12);
      }

      setTimeout(() => isPlayingSound = null, 2500);
    } catch (e) {
      console.warn("Audio Context playback failed:", e);
      isPlayingSound = null;
    }
  };

  const handleRequestNotification = async () => {
    if (typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      notificationPermission = permission;
      
      const savedPrefs = StorageManager.getItem('prayer_notifications_v2');
      let parsed = savedPrefs ? JSON.parse(savedPrefs) : {};
      
      const defaultKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      defaultKeys.forEach(k => {
        if (!parsed[k]) {
          parsed[k] = { enabled: true, sound: selectedSound, preAlert: 0, offset: 0, iqamahOffset: 10 };
        } else {
          parsed[k].enabled = true;
        }
      });
      StorageManager.setItem('prayer_notifications_v2', JSON.stringify(parsed));
    }
  };

  const handleGPSDetect = () => {
    if ("geolocation" in navigator) {
      gpsLoading = true;
      gpsError = null;
      gpsSuccess = false;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`);
            if (!res.ok) throw new Error("Gagal mengesan zon");
            const data = await res.json();
            if (data && data.zone) {
              selectedZone = data.zone;
              gpsSuccess = true;
            } else {
              throw new Error("Kawasan tidak disokong");
            }
          } catch (err: any) {
            gpsError = isMalay ? "Gagal memadankan koordinat." : "Failed to map coordinates.";
          } finally {
            gpsLoading = false;
          }
        },
        () => {
          gpsLoading = false;
          gpsError = isMalay ? "Akses GPS tidak dibenarkan." : "GPS access denied.";
        },
        { timeout: 8000 }
      );
    } else {
      gpsError = isMalay ? "Pelayar tidak menyokong GPS." : "No GPS support.";
    }
  };

  let filteredZonesList = $derived(
    JAKIM_ZONES.map((state) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return state;
      const matched = state.zones.filter(z => z.l.toLowerCase().includes(query) || z.v.toLowerCase().includes(query));
      return { ...state, zones: matched };
    }).filter(state => state.zones.length > 0)
  );
</script>

<div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-[var(--sys-spacing-edge)] bg-[var(--md-sys-color-surface-container-lowest)] font-sans text-[var(--md-sys-color-on-surface)] overflow-hidden">
  
  <!-- Heavy contrast solid shapes - Pure M3 Expressive Editorial -->
  <div 
    in:scale={{ start: 0.8, opacity: 0, duration: 400 }}
    class="absolute -top-[20%] -left-[10%] w-[60vh] h-[60vh] rounded-full bg-[var(--md-sys-color-primary-container)] select-none pointer-events-none" 
  ></div>
  
  <!-- Main Massive Pill-Shaped Form Factor -->
  <div 
    in:fly={{ y: 100, duration: 400, opacity: 0 }}
    class="relative z-10 w-full max-w-lg min-h-[600px] h-full max-h-[85vh] p-8 sm:p-12 rounded-[48px] sm:rounded-[64px] bg-[var(--md-sys-color-surface-container-highest)] shadow-2xl flex flex-col justify-between overflow-hidden ring-1 ring-[var(--md-sys-color-outline-variant)]/40"
  >
    <!-- Step Indicator Top Right -->
    <div class="absolute top-8 right-10 flex gap-2">
      {#each Array(stepsCount) as _, idx}
        <div 
          class="h-2 rounded-full transition-all duration-300"
          style="width: {idx === currentStep ? 32 : 8}px; background-color: {idx === currentStep ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'};"
        ></div>
      {/each}
    </div>

    <!-- Carousel slide contents -->
    <div class="flex-1 grid grid-cols-1 grid-rows-1 items-center h-full w-full py-8 mt-4">
      {#if currentStep === 0}
        <div
          in:fly={{ y: 40, duration: 400, delay: 300 }}
          out:fly={{ y: -20, duration: 300 }}
          class="col-start-1 row-start-1 flex flex-col items-start justify-center h-full space-y-10"
        >
          <div in:scale={{ delay: 400, duration: 400 }} class="w-28 h-28 rounded-[40px] bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-xl">
            <Compass class="w-14 h-14" strokeWidth={1.5} />
          </div>

          <div in:fly={{ y: 20, delay: 500, duration: 400 }} class="space-y-4 max-w-sm">
            <h1 class="md3-display-large font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.05]">
              {tOnboarding.welcomeTitle}
            </h1>
            <p class="md3-body-large text-[var(--md-sys-color-on-surface-variant)] font-medium leading-relaxed">
              {tOnboarding.welcomeDesc}
            </p>
          </div>
          
          <div in:fly={{ y: 20, delay: 600, duration: 400 }} class="pt-6 w-full">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-button onclick={handleNext} style="--md-filled-button-container-shape: 999px; width: 100%; height: 64px;">
              <span class="text-lg font-bold">{tOnboarding.startBtn}</span>
              <ArrowRight class="w-6 h-6 ml-4" />
            </md-filled-button>
          </div>
        </div>
      {:else if currentStep === 1}
        <div
          in:fly={{ y: 40, duration: 400, delay: 300 }}
          out:fly={{ y: -20, duration: 300 }}
          class="col-start-1 row-start-1 flex flex-col h-full space-y-6 overflow-hidden"
        >
          <div in:fly={{ y: 20, delay: 400, duration: 400 }} class="space-y-2">
            <h2 class="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.1]">
              {tOnboarding.locTitle}
            </h2>
            <p class="md3-body-medium text-[var(--md-sys-color-on-surface-variant)] font-medium">
              {tOnboarding.locDesc}
            </p>
          </div>

          <div in:fly={{ y: 20, delay: 500, duration: 400 }} class="w-full">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-tonal-button onclick={handleGPSDetect} disabled={gpsLoading} style="--md-filled-tonal-button-container-shape: 24px; width: 100%; height: 56px;">
              <MapPin class="w-5 h-5 mr-3" />
              <span class="font-bold">{gpsLoading ? tOnboarding.gpsLoading : tOnboarding.gpsBtn}</span>
            </md-filled-tonal-button>
            {#if gpsSuccess}
              <div class="text-center text-sm mt-3 font-bold text-[var(--md-sys-color-primary)]">{tOnboarding.gpsSuccessText} <span class="underline">{selectedZone}</span></div>
            {/if}
            {#if gpsError}
              <div class="text-center text-sm mt-3 font-bold text-[var(--md-sys-color-error)]">{gpsError}</div>
            {/if}
          </div>

          <div in:fly={{ y: 20, delay: 600, duration: 400 }} class="flex-1 flex flex-col min-h-0 bg-[var(--md-sys-color-surface)] rounded-[32px] overflow-hidden shadow-sm border border-[var(--md-sys-color-outline-variant)]">
            <div class="p-2 pb-0">
              <md-filled-text-field
                type="text" 
                placeholder={tOnboarding.searchPlace}
                value={searchQuery}
                oninput={(e: Event) => searchQuery = sanitizeInput((e.target as HTMLInputElement).value)}
                style="width: 100%; --md-filled-text-field-container-shape: 24px; --md-filled-text-field-active-indicator-height: 0px; --md-filled-text-field-hover-active-indicator-height: 0px; --md-filled-text-field-focus-active-indicator-height: 0px; --md-sys-color-surface-variant: var(--md-sys-color-surface-container-low);"
              ></md-filled-text-field>
            </div>
            <div class="flex-1 overflow-y-auto p-2 scrollbar-none">
              {#each filteredZonesList as state (state.state)}
                <div class="mb-4">
                  <div class="px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] opacity-80 sticky top-0 bg-[var(--md-sys-color-surface)] z-10">
                    {state.state}
                  </div>
                  {#each state.zones as z (z.v)}
                    <button
                      onclick={() => { selectedZone = z.v; gpsSuccess = false; }}
                      class={cn(
                        "w-full text-left px-5 py-3 mb-1 rounded-[20px] transition-all relative overflow-hidden flex justify-between items-center active:scale-95 hover:scale-[0.98]",
                        z.v === selectedZone 
                          ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-sm"
                          : "hover:bg-[var(--md-sys-color-surface-container-highest)]"
                      )}
                    >
                      <span class="truncate pr-4">{z.l}</span>
                      <span class="font-mono text-xs opacity-60">{z.v}</span>
                    </button>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else if currentStep === 2}
        <div
          in:fly={{ y: 40, duration: 400, delay: 300 }}
          out:fly={{ y: -20, duration: 300 }}
          class="col-start-1 row-start-1 flex flex-col items-start justify-center h-full space-y-8"
        >
          <div in:scale={{ delay: 400, duration: 400 }} class="w-24 h-24 rounded-[36px] bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] flex items-center justify-center">
            <Bell class="w-10 h-10" strokeWidth={1.5} />
          </div>

          <div in:fly={{ y: 20, delay: 500, duration: 400 }} class="space-y-4 max-w-sm">
            <h2 class="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.05]">
              {tOnboarding.notifTitle}
            </h2>
            <p class="md3-body-large text-[var(--md-sys-color-on-surface-variant)] font-medium leading-relaxed">
              {tOnboarding.notifDesc}
            </p>
          </div>

          <div in:fly={{ y: 20, delay: 600, duration: 400 }} class="flex flex-col gap-4 w-full pt-6">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-button
              onclick={handleRequestNotification}
              style="--md-filled-button-container-shape: 999px; height: 64px; {notificationPermission === 'granted' ? '--md-filled-button-container-color: var(--md-sys-color-primary); --md-filled-button-label-text-color: var(--md-sys-color-on-primary);' : ''}"
            >
              <span class="text-lg font-bold">{notificationPermission === 'granted' ? tOnboarding.notifGranted : tOnboarding.notifBtn}</span>
              {#if notificationPermission === 'granted'}
                <Check class="w-6 h-6 ml-3" />
              {/if}
            </md-filled-button>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-outlined-button onclick={handleNext} style="--md-outlined-button-container-shape: 999px; height: 64px;">
              <span class="text-lg font-bold">{tOnboarding.notifSkip}</span>
            </md-outlined-button>
          </div>
        </div>
      {:else if currentStep === 3}
        <div
          in:fly={{ y: 40, duration: 400, delay: 300 }}
          out:fly={{ y: -20, duration: 300 }}
          class="col-start-1 row-start-1 flex flex-col h-full space-y-6"
        >
          <div in:fly={{ y: 20, delay: 400, duration: 400 }} class="space-y-2">
            <h2 class="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.1]">
              {tOnboarding.soundTitle}
            </h2>
            <p class="md3-body-medium text-[var(--md-sys-color-on-surface-variant)] font-medium">
              {tOnboarding.soundDesc}
            </p>
          </div>

          <div in:fly={{ y: 20, delay: 500, duration: 400 }} class="grid grid-cols-1 gap-3 w-full py-4">
            {#each sounds as snd (snd.id)}
              <div 
                onclick={() => selectedSound = snd.id}
                class={cn(
                  "p-5 rounded-[28px] border-2 transition-all cursor-pointer flex items-center justify-between active:scale-95 hover:scale-[0.98]",
                  selectedSound === snd.id 
                    ? "bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]" 
                    : "bg-[var(--md-sys-color-surface)] border-transparent hover:border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]"
                )}
                onkeydown={(e) => e.key === 'Enter' && (selectedSound = snd.id)}
                role="button"
                tabindex="0"
              >
                <span class="text-lg font-bold">{snd.name}</span>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <md-icon-button
                  onclick={(e: Event) => { e.stopPropagation(); playPreviewSound(snd.id); }}
                  style="--md-icon-button-state-layer-color: var(--md-sys-color-{isPlayingSound === snd.id ? 'on-primary-container' : 'primary'}); --md-icon-button-icon-color: var(--md-sys-color-{isPlayingSound === snd.id ? 'on-primary-container' : 'primary'});"
                >
                  {#if isPlayingSound === snd.id}
                    <Pause size={24} />
                  {:else}
                    <Play size={24} />
                  {/if}
                </md-icon-button>
              </div>
            {/each}
          </div>
          
          <div in:fly={{ y: 20, delay: 600, duration: 400 }} class="mt-auto pt-8">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-button onclick={handleNext} style="--md-filled-button-container-shape: 999px; width: 100%; height: 64px;">
              <span class="text-xl font-bold">{tOnboarding.finishBtn}</span>
              <Sparkles class="w-6 h-6 ml-3" />
            </md-filled-button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Global Footer Navigation Buttons (Only visible on Step 1, 2) -->
    {#if currentStep > 0 && currentStep < stepsCount - 1}
      <div 
        in:fly={{ y: 20, duration: 300, delay: 200 }}
        out:fly={{ y: 20, duration: 200 }}
        class="absolute bottom-6 left-6 right-6 flex items-center justify-between"
      >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-outlined-button onclick={handleBack} style="--md-outlined-button-container-shape: 999px; height: 48px;">
          <span class="font-bold">{tOnboarding.backBtn}</span>
        </md-outlined-button>
        
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-filled-button onclick={handleNext} style="--md-filled-button-container-shape: 999px; height: 48px;">
          <span class="font-bold">{tOnboarding.nextBtn}</span>
        </md-filled-button>
      </div>
    {/if}
  </div>
</div>