<script lang="ts">
  import { Volume2, X, Bell } from "lucide-svelte";
  import { appSettings } from "../state/settings.svelte.ts";
  import { format } from "date-fns";
  import { fade, fly } from "svelte/transition";
  import { backOut, cubicOut } from "svelte/easing";

  let {
    prayerName,
    prayerTime,
    remainingSeconds,
    style = "standard",
    onDismiss,
  } = $props<{
    prayerName: string;
    prayerTime: Date;
    remainingSeconds: number;
    style?: "dramatic" | "standard" | "modern" | "subtle" | "minimal";
    onDismiss: () => void;
  }>();

  const settings = $derived(appSettings.settings);
  const t = (key: any, params?: any) => appSettings.t(key, params);
  let dismissTapCount = $state(0);

  $effect(() => {
    if (dismissTapCount > 0) {
      const tId = setTimeout(() => {
        dismissTapCount = 0;
      }, 2000);
      return () => clearTimeout(tId);
    }
  });

  function handleDismiss() {
    if (dismissTapCount < 1) {
      dismissTapCount = 1;
    } else {
      onDismiss();
      dismissTapCount = 0;
    }
  }

  let formattedTime = $derived(
    format(prayerTime, settings.timeFormat === "12h" ? "hh:mm a" : "HH:mm")
  );

  let durationLimit = $derived(settings.azanAlertDuration ?? 20);
  let progressPercent = $derived(
    Math.max(0, Math.min(100, (remainingSeconds / durationLimit) * 100))
  );
</script>

{#if style === "subtle"}
  <div
    in:fly={{ y: 35, duration: 400, easing: backOut }}
    out:fly={{ y: 20, duration: 300, easing: cubicOut }}
    class="fixed bottom-6 right-6 z-[300] w-[90%] max-w-sm"
  >
    <div class="bg-[var(--md-sys-color-surface-container-highest)]/85 backdrop-blur-2xl border border-[var(--md-sys-color-primary)]/20 shadow-[0_20px_50px_rgba(0,0,0,0.35)] rounded-[28px] p-5 flex items-center justify-between gap-4 relative overflow-hidden ring-1 ring-black/5">
      <div class="flex items-center gap-4 relative z-10">
        <!-- Pulsing visualizer bell icon -->
        <div class="relative shrink-0 flex items-center justify-center">
          <span class="absolute w-10 h-10 rounded-full bg-[var(--md-sys-color-primary)]/20 animate-pulse-circle"></span>
          <div class="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 shadow-md relative group">
            <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div class="animate-ring-subtle">
              <Bell size={18} class="stroke-[2.5]" />
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-black text-[var(--md-sys-color-on-surface)] text-sm tracking-tight leading-tight">
            {t("azanAlertTitle", { prayer: prayerName })}
          </h4>
          <p class="text-[var(--md-sys-color-on-surface-variant)]/90 text-[11px] font-bold mt-1">
            {formattedTime} • {t("closeInSeconds" as any, { seconds: remainingSeconds })}
          </p>
        </div>
      </div>
      
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <md-icon-button onclick={onDismiss}>
        <md-icon>close</md-icon>
      </md-icon-button>

      <!-- Glowing slide timeline at the bottom -->
      <div class="absolute bottom-0 inset-x-0 h-1 bg-[var(--md-sys-color-primary)]/10 dark:bg-white/5">
        <div
          class="h-full bg-[var(--md-sys-color-primary)] shadow-[0_-1px_8px_var(--md-sys-color-primary)] progress-bar-transition"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>
  </div>

{:else if style === "modern"}
  <div
    in:fly={{ y: -60, duration: 400, easing: backOut }}
    out:fly={{ y: -30, duration: 300, easing: cubicOut }}
    class="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-md"
  >
    <div class="bg-[var(--md-sys-color-surface-container-highest)]/90 backdrop-blur-3xl border border-[var(--md-sys-color-primary)]/30 shadow-[0_24px_50px_rgba(0,0,0,0.45)] rounded-[30px] p-4 pl-5 flex items-center justify-between gap-4 ring-1 ring-black/5 relative overflow-hidden">
      <!-- Subtle slow pulsing glow inside background -->
      <div class="absolute inset-0 bg-gradient-to-r from-[var(--md-sys-color-primary)]/5 via-transparent to-[var(--md-sys-color-primary)]/5 animate-pulse"></div>
      
      <div class="flex items-center gap-4 relative z-10 min-w-0 flex-1">
        <!-- Animated ringing bell with physical dual acoustic halo -->
        <div class="relative shrink-0 flex items-center justify-center">
          <span class="absolute w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary)]/20 pointer-events-none animate-pulse-circle-mod1"></span>
          <span class="absolute w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary)]/10 pointer-events-none animate-pulse-circle-mod2"></span>
          <div class="w-11 h-11 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-lg relative overflow-hidden group z-10 border border-white/10">
            <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div class="animate-ring-modern">
              <Bell size={20} class="stroke-[2.5] relative z-10" />
            </div>
          </div>
        </div>
        
        <div class="min-w-0 flex-1">
          <span class="text-[9px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] opacity-95 block mb-0.5">
            {t("enteringPrayerTime" as any)}
          </span>
          <h4 class="font-black text-[var(--md-sys-color-on-surface)] text-base tracking-tight leading-none truncate">
            {prayerName} • <span class="text-[var(--md-sys-color-on-surface-variant)] font-bold font-mono text-sm">{formattedTime}</span>
          </h4>
          
          <!-- Dynamic visual remaining timeline -->
          <div class="w-full h-1 bg-white/10 rounded-full mt-2.5 overflow-hidden">
            <div 
              class="h-full bg-[var(--md-sys-color-primary)] shadow-[0_0_8px_var(--md-sys-color-primary)] progress-bar-transition"
              style="width: {progressPercent}%"
            ></div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 relative z-10 shrink-0 pr-1">
        <span class="text-[10px] font-mono font-black text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/12 px-2.5 py-1.5 rounded-xl border border-[var(--md-sys-color-primary)]/15 tabular-nums">
          {remainingSeconds}s
        </span>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-icon-button onclick={onDismiss}>
          <md-icon>close</md-icon>
        </md-icon-button>
      </div>
    </div>
  </div>

{:else if style === "minimal"}
  <div
    in:fly={{ y: -30, duration: 400, easing: backOut }}
    out:fly={{ y: -20, duration: 300, easing: cubicOut }}
    class="fixed top-6 right-6 z-[300]"
  >
    <div class="bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] backdrop-blur-xl border border-[var(--md-sys-color-outline)]/20 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3.5 select-none ring-1 ring-black/10">
      <!-- Active pulsing emerald/primary ring -->
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)]"></span>
      </span>
      
      <span class="text-[11px] font-black tracking-tight flex items-center gap-2 whitespace-nowrap">
        <span class="text-[var(--md-sys-color-inverse-on-surface)]">{prayerName}</span> 
        <span class="opacity-60 font-bold font-mono">{formattedTime}</span>
        <span class="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-inverse-primary)]/10 text-[9px] font-black font-mono text-[var(--md-sys-color-inverse-primary)]/90 tabular-nums">
          {remainingSeconds}s
        </span>
      </span>
      
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <md-icon-button onclick={onDismiss} style="--md-icon-button-state-layer-size: 24px; --md-icon-button-icon-size: 16px;">
        <md-icon>close</md-icon>
      </md-icon-button>
    </div>
  </div>

{:else if style === "standard"}
  <div
    in:fly={{ y: -100, duration: 400, easing: backOut }}
    out:fly={{ y: -50, duration: 300, easing: cubicOut }}
    class="fixed top-0 inset-x-0 z-[300] w-full p-4 sm:p-6"
  >
    <div class="max-w-4xl mx-auto bg-gradient-to-r from-[var(--md-sys-color-surface-container-highest)]/90 via-[var(--md-sys-color-surface-container-highest)]/95 to-[var(--md-sys-color-surface-container-high)]/90 border border-[var(--md-sys-color-primary)]/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] rounded-[32px] p-6 sm:p-7 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-3xl ring-1 ring-black/5">
      <!-- Animated decorative concentric ring halos -->
      <div class="absolute -left-10 -bottom-10 w-40 h-40 rounded-full border-[6px] border-[var(--md-sys-color-primary)]/8 animate-ping pointer-events-none"></div>
      <div class="absolute right-10 -top-10 w-32 h-32 rounded-full border-2 border-[var(--md-sys-color-primary)]/8 animate-pulse pointer-events-none"></div>
      
      <div class="flex items-center gap-5 relative z-10 flex-col sm:flex-row text-center sm:text-left">
        <div class="w-16 h-16 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
          <Volume2 size={32} class="stroke-[2.5] animate-pulse" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10 px-3.5 py-1 rounded-full border border-[var(--md-sys-color-primary)]/15">
            {t("enteringPrayerTime" as any)}
          </span>
          <h2 class="text-2xl sm:text-3xl font-black text-[var(--md-sys-color-on-surface)] tracking-tight mt-3 leading-none">
            {t("prepareForAzan" as any, { prayer: prayerName })}
          </h2>
          <p class="text-[var(--md-sys-color-on-surface-variant)]/90 text-sm mt-2.5 font-bold">
            {t("azanTimePrefix" as any)}: {formattedTime} • {t("closeInSeconds" as any, { seconds: remainingSeconds })}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 relative z-10 shrink-0">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-filled-button onclick={handleDismiss}>
          <div slot="icon"><X size={16} class="stroke-[2.5]" /></div>
          {dismissTapCount > 0 ? t("doubleTapExit") : t("dismissAlert")}
        </md-filled-button>
      </div>

      <!-- Dynamic sliding indicator at bottom of banner -->
      <div class="absolute bottom-0 inset-x-0 h-1.5 bg-[var(--md-sys-color-primary)]/10 dark:bg-white/5">
        <div
          class="h-full bg-[var(--md-sys-color-primary)] shadow-[0_-2px_10px_var(--md-sys-color-primary)] progress-bar-transition"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>
  </div>

{:else if style === "dramatic"}
  <div
    in:fade={{ duration: 300 }}
    out:fade={{ duration: 300 }}
    class="fixed inset-0 z-[400] bg-gradient-to-br from-[var(--md-sys-color-background)] via-[var(--md-sys-color-surface-container-highest)] to-[var(--md-sys-color-primary-container)]/30 flex flex-col items-center justify-between p-8 sm:p-12 text-[var(--md-sys-color-on-background)] overflow-hidden select-none"
  >
    <!-- Calm ambient organic breathing backdrop blobs -->
    <div class="absolute w-[95vw] h-[95vw] sm:w-[65vw] sm:h-[65vw] rounded-full bg-[var(--md-sys-color-primary)]/20 blur-[130px] pointer-events-none top-1/4 left-1/4 animate-blob-1"></div>
    <div class="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full bg-[var(--md-sys-color-secondary)]/15 blur-[110px] pointer-events-none bottom-1/4 right-1/4 animate-blob-2"></div>

    <!-- Top linear progress bar -->
    <div class="absolute top-0 left-0 right-0 h-1.5 bg-[var(--md-sys-color-primary)]/10 z-50">
      <div 
        class="h-full bg-[var(--md-sys-color-primary)] shadow-[0_0_12px_var(--md-sys-color-primary)] progress-bar-transition"
        style="width: {progressPercent}%"
      ></div>
    </div>

    <!-- Concentric pulsing background ripples (Audio Visualizer Rings) -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.16] z-0">
      <div class="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border-2 border-[var(--md-sys-color-primary)] animate-vis-1"></div>
      <div class="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border border-[var(--md-sys-color-primary)] animate-vis-2"></div>
      <div class="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border-4 border-[var(--md-sys-color-primary)] animate-vis-3"></div>
    </div>

    <!-- Elegant Mosque silhouette background -->
    <div class="absolute bottom-0 inset-x-0 h-[26vh] pointer-events-none z-0 flex items-end">
      <svg viewBox="0 0 1200 220" class="w-full h-full text-[var(--md-sys-color-primary)] opacity-[0.06]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,220 L1200,220 L1200,180 L1150,180 L1150,120 L1140,105 L1140,50 L1130,50 L1130,35 L1120,50 L1110,50 L1110,105 L1100,120 L1100,180 L920,180 L920,150 C920,120 870,105 850,105 C830,105 780,120 780,150 L780,180 L100,180 L100,120 L90,105 L90,50 L80,50 L80,35 L70,50 L60,50 L60,105 L50,120 L50,180 L0,180 Z" />
      </svg>
    </div>

    <!-- Top section: Mode tag & info -->
    <div class="flex justify-between items-center w-full z-10 relative">
      <div class="flex items-center gap-2.5 text-[var(--md-sys-color-primary)] font-black tracking-widest text-[10px] sm:text-xs uppercase bg-[var(--md-sys-color-primary-container)] border border-[var(--md-sys-color-primary)]/20 px-4 py-2.5 rounded-full shadow-sm">
        <span class="w-2.5 h-2.5 rounded-full bg-[var(--md-sys-color-primary)] animate-ping"></span>
        {t("mosqueDisplayMode" as any)}
      </div>
      <div class="text-[var(--md-sys-color-on-background)]/85 text-xs sm:text-sm font-black bg-black/20 border border-white/5 rounded-full px-4 py-1.5 backdrop-blur-md">
        {t("closeInSeconds" as any, { seconds: remainingSeconds })}
      </div>
    </div>

    <!-- Center: Glowing Adhan details -->
    <div class="flex flex-col items-center text-center z-10 gap-8 my-auto relative">
      <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[var(--md-sys-color-primary-container)]/80 backdrop-blur-md border-4 border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] flex items-center justify-center shadow-[0_0_60px_rgba(var(--md-sys-color-primary-rgb),0.35)] relative group animate-dram-icon-pulse">
        <Volume2 size={48} class="stroke-[2.5]" />
        <div class="absolute -inset-4 rounded-full border-2 border-[var(--md-sys-color-primary)] pointer-events-none animate-dram-icon-ring"></div>
      </div>

      <div class="flex flex-col gap-4">
        <span class="text-[var(--md-sys-color-primary)] font-black uppercase tracking-[0.3em] text-xs sm:text-sm">
          {t("enteringPrayerTime" as any)}
        </span>
        <h1 class="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-[var(--md-sys-color-on-background)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.15)] leading-tight">
          {prayerName}
        </h1>
        <p class="text-xl sm:text-2xl text-[var(--md-sys-color-on-surface-variant)] font-black tracking-wide mt-1.5 bg-[var(--md-sys-color-surface-container-highest)]/50 px-6 py-2 rounded-2xl border border-[var(--md-sys-color-outline)]/20 inline-block mx-auto">
          {t("azanTimePrefix" as any)}: {formattedTime}
        </p>
      </div>

      <p class="text-[var(--md-sys-color-on-background)]/85 text-xs sm:text-sm max-w-md font-bold tracking-wide leading-relaxed animate-pulse">
        {t("dramaticInstruction" as any)}
      </p>
    </div>

    <!-- Bottom: Close Button with Accidental Dismiss Protection -->
    <div class="z-10 w-full max-w-xs relative flex flex-col items-center gap-3">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <md-filled-button onclick={handleDismiss} class="w-full" style="--md-filled-button-container-shape: 16px;">
        <div slot="icon"><X size={20} class="stroke-[2.5]" /></div>
        {dismissTapCount > 0 ? t("doubleTapExit") : t("dismissAlert")}
      </md-filled-button>
      {#if dismissTapCount > 0}
        <span 
          in:fly={{ y: 5, duration: 300, easing: backOut }}
          out:fade={{ duration: 200 }}
          class="text-[var(--md-sys-color-primary)] text-xs font-black bg-[var(--md-sys-color-primary-container)] border border-[var(--md-sys-color-primary)]/15 px-4 py-1.5 rounded-full shadow-md"
        >
          {t("doubleTapExit")}
        </span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .animate-ring-subtle {
    animation: ringSubtle 2s ease-in-out infinite;
  }
  @keyframes ringSubtle {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(15deg); }
    40% { transform: rotate(-15deg); }
    60% { transform: rotate(10deg); }
    80% { transform: rotate(-10deg); }
  }

  .animate-pulse-circle {
    animation: pulseCircle 2s ease-out infinite;
  }
  @keyframes pulseCircle {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  .animate-pulse-circle-mod1 {
    animation: pulseCircleMod1 2s ease-out infinite;
  }
  @keyframes pulseCircleMod1 {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .animate-pulse-circle-mod2 {
    animation: pulseCircleMod2 2s ease-out infinite 0.6s;
  }
  @keyframes pulseCircleMod2 {
    0% { transform: scale(1); opacity: 0.3; }
    100% { transform: scale(2.1); opacity: 0; }
  }

  .animate-ring-modern {
    animation: ringModern 1.8s ease-in-out infinite;
  }
  @keyframes ringModern {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(18deg); }
    40% { transform: rotate(-18deg); }
    60% { transform: rotate(12deg); }
    80% { transform: rotate(-12deg); }
  }

  .animate-blob-1 {
    animation: blob1 12s ease-in-out infinite;
  }
  @keyframes blob1 {
    0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.15; }
    25% { transform: scale(1.2) translate(40px, -30px); opacity: 0.28; }
    50% { transform: scale(0.95) translate(-30px, 40px); opacity: 0.18; }
    75% { transform: scale(1) translate(0, 0); opacity: 0.15; }
  }

  .animate-blob-2 {
    animation: blob2 15s ease-in-out infinite 2s;
  }
  @keyframes blob2 {
    0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.1; }
    33% { transform: scale(0.9) translate(-50px, 40px); opacity: 0.22; }
    66% { transform: scale(1.15) translate(30px, -30px); opacity: 0.14; }
  }

  .animate-vis-1 {
    animation: vis1 4.8s ease-in-out infinite;
  }
  @keyframes vis1 {
    0%, 100% { transform: scale(1); opacity: 0.1; }
    50% { transform: scale(1.9); opacity: 0.38; }
  }

  .animate-vis-2 {
    animation: vis2 5.8s ease-in-out infinite 1.2s;
  }
  @keyframes vis2 {
    0%, 100% { transform: scale(1.2); opacity: 0.05; }
    50% { transform: scale(2.3); opacity: 0.24; }
  }

  .animate-vis-3 {
    animation: vis3 4.2s ease-in-out infinite 0.6s;
  }
  @keyframes vis3 {
    0%, 100% { transform: scale(0.85); opacity: 0.18; }
    50% { transform: scale(1.45); opacity: 0.48; }
  }

  .animate-dram-icon-ring {
    animation: dramIconRing 1.6s ease-out infinite;
  }
  @keyframes dramIconRing {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  .animate-dram-icon-pulse {
    animation: dramIconPulse 3.2s ease-in-out infinite;
  }
  @keyframes dramIconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  .progress-bar-transition {
    transition: width 1s linear;
  }
</style>
