<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { spring } from "svelte/motion";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide, m3Scale as scale } from "../lib/transitions";
  import { format, differenceInSeconds } from "date-fns";
  import { ms as msLocale, enUS } from "date-fns/locale";
  import { Compass, Sunrise, Moon, Calendar, Play, Pause, Plus, Sun, Sparkles } from "lucide-svelte";
  import { appSettings } from "../state/settings.svelte";
  import { themeState } from "../state/theme.svelte";
  import { getDynamicHijriDate, HIJRI_MONTHS, HIJRI_MONTHS_EN } from "../lib/holidays";
  import { cn } from "../lib/utils";
  import type { PrayerData } from "../types";
  import { StorageManager } from "../lib/StorageManager";
  import { playSynthesizedSound } from "../lib/audio";
  import { Button, IconButton } from "$lib/components/ui";
  import { ripple } from "$lib/actions/ripple";

  import DigitalClock from "./clocks/DigitalClock.svelte";
  import AnalogClock from "./clocks/AnalogClock.svelte";
  import AnaDigiClock from "./clocks/AnaDigiClock.svelte";
  import ChronographClock from "./clocks/ChronographClock.svelte";
  import FlipClock from "./clocks/FlipClock.svelte";
  import WordClock from "./clocks/WordClock.svelte";
  import MinimalistClock from "./clocks/MinimalistClock.svelte";
  import OrbitClock from "./clocks/OrbitClock.svelte";
  import TypographicClock from "./clocks/TypographicClock.svelte";
  import PrayerRingClock from "./clocks/PrayerRingClock.svelte";
  import AbstractClock from "./clocks/AbstractClock.svelte";
  import AnalogNumericClock from "./clocks/AnalogNumericClock.svelte";
  import AnalogRomanClock from "./clocks/AnalogRomanClock.svelte";
  import AnalogArabicClock from "./clocks/AnalogArabicClock.svelte";
  import DashboardClock from "./clocks/DashboardClock.svelte";
  import SwissStationClock from "./clocks/SwissStationClock.svelte";
  import BauhausClock from "./clocks/BauhausClock.svelte";
  import LayeredClock from "./clocks/LayeredClock.svelte";

  let {
    currentTime,
    nextPrayerName,
    nextPrayerTime,
    prevPrayerTime = null,
    prevPrayerName = null,
    todayHijri = undefined,
    syurukTime = null,
    todayData = null,
    onCalendarClick = undefined,
    iqamahCountdownActive = false,
    iqamahRemainingSeconds = 0,
    iqamahTotalSeconds = 0,
    currentPrayerNameForIqamah = null,
    iqamahPaused = false,
    onIqamahTogglePause = undefined,
    onIqamahAddMinute = undefined
  }: {
    currentTime: Date;
    nextPrayerName: string | null;
    nextPrayerTime: Date | null;
    prevPrayerTime?: Date | null;
    prevPrayerName?: string | null;
    todayHijri?: string;
    syurukTime?: string | null;
    todayData?: PrayerData | null;
    onCalendarClick?: () => void;
    iqamahCountdownActive?: boolean;
    iqamahRemainingSeconds?: number;
    iqamahTotalSeconds?: number;
    currentPrayerNameForIqamah?: string | null;
    iqamahPaused?: boolean;
    onIqamahTogglePause?: () => void;
    onIqamahAddMinute?: () => void;
  } = $props();

  let visualStyle = $derived(appSettings.settings.visualStyle);
  let themeShape = $derived(appSettings.settings.themeShape);


  let countdownParts = $state({ h: 0, m: 0, s: 0, active: false });
  let progress = $state(0);

  const countdownWidthSpring = spring(0, {
    stiffness: 0.1,
    damping: 0.8
  });

  $effect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      countdownWidthSpring.stiffness = 1.0;
      countdownWidthSpring.damping = 1.0;
    } else {
      countdownWidthSpring.stiffness = 0.1;
      countdownWidthSpring.damping = 0.8;
    }
  });

  $effect(() => {
    if (iqamahCountdownActive && iqamahRemainingSeconds > 0) {
      const pct = (iqamahRemainingSeconds / (iqamahTotalSeconds || 600)) * 100;
      countdownWidthSpring.set(pct);
    } else {
      countdownWidthSpring.set(0);
    }
  });

  $effect(() => {
    if (!nextPrayerTime) {
      countdownParts = { h: 0, m: 0, s: 0, active: false };
      progress = 0;
      return;
    }

    const diffInSecs = differenceInSeconds(nextPrayerTime, currentTime);

    if (diffInSecs <= 0) {
      countdownParts = { h: 0, m: 0, s: 0, active: false };
      progress = 100;
      return;
    }

    const h = Math.floor(diffInSecs / 3600);
    const m = Math.floor((diffInSecs % 3600) / 60);
    const s = diffInSecs % 60;

    countdownParts = { h, m, s, active: true };

    if (prevPrayerTime) {
      const total = nextPrayerTime.getTime() - prevPrayerTime.getTime();
      const current = currentTime.getTime() - prevPrayerTime.getTime();
      if (total > 0 && !isNaN(total) && !isNaN(current)) {
        const calculated = (current / total) * 100;
        progress = !isNaN(calculated) ? Math.max(0, Math.min(100, calculated)) : 50;
      } else {
        progress = 50;
      }
    } else {
      progress = 50;
    }
  });

  // --- Circular Countdown Ring Derivations ---
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~238.761
  let safeProgress = $derived(isNaN(progress) ? 50 : Math.max(0, Math.min(100, progress)));
  let ringDashoffset = $derived(ringCircumference * (1 - safeProgress / 100));
  let ringAngle = $derived((-90 + (safeProgress / 100) * 360) * (Math.PI / 180));
  let ringOrbX = $derived(48 + ringRadius * Math.cos(ringAngle));
  let ringOrbY = $derived(48 + ringRadius * Math.sin(ringAngle));

  // --- Solar Progress Arc Trajectory Derivations ---
  // Solar trajectory: Fajr (0%) -> Syuruk (20%) -> Dhuhr (50% Zenith) -> Asr (72%) -> Maghrib (90%) -> Isha (100%)
  let solarTrajectory = $derived.by(() => {
    if (!todayData) {
      return { progress: 0.5, sunX: 150, sunY: 31, phaseName: 'Zohor (Zenith)' };
    }

    const parseTimeToMins = (tStr?: string | null) => {
      if (!tStr) return 0;
      const [h, m] = tStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const fajrM = parseTimeToMins(todayData.fajr);
    const syurukM = parseTimeToMins(todayData.syuruk);
    const dhuhrM = parseTimeToMins(todayData.dhuhr);
    const asrM = parseTimeToMins(todayData.asr);
    const maghribM = parseTimeToMins(todayData.maghrib);
    const ishaM = parseTimeToMins(todayData.isha);
    const imsakM = Math.max(0, fajrM - 10);

    const nowM = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;

    let p = 0;
    let phaseName = 'Subuh';

    if (nowM < imsakM) {
      p = 1.0;
      phaseName = 'Malam (Tahajjud)';
    } else if (nowM < fajrM) {
      p = 0;
      phaseName = 'Imsak / Subuh';
    } else if (nowM < syurukM) {
      const frac = (nowM - fajrM) / Math.max(1, syurukM - fajrM);
      p = frac * 0.20;
      phaseName = 'Subuh (Fajr)';
    } else if (nowM < dhuhrM) {
      const frac = (nowM - syurukM) / Math.max(1, dhuhrM - syurukM);
      p = 0.20 + frac * 0.30;
      phaseName = 'Syuruk / Dhuha';
    } else if (nowM < asrM) {
      const frac = (nowM - dhuhrM) / Math.max(1, asrM - dhuhrM);
      p = 0.50 + frac * 0.22;
      phaseName = 'Zohor (Zenith)';
    } else if (nowM < maghribM) {
      const frac = (nowM - asrM) / Math.max(1, maghribM - asrM);
      p = 0.72 + frac * 0.18;
      phaseName = 'Asar';
    } else if (nowM < ishaM) {
      const frac = (nowM - maghribM) / Math.max(1, ishaM - maghribM);
      p = 0.90 + frac * 0.10;
      phaseName = 'Maghrib (Sunset)';
    } else {
      p = 1.0;
      phaseName = 'Isyak (Night)';
    }

    // Quadratic Bezier: P0(24, 58), P1(150, 4), P2(276, 58)
    const t = Math.max(0, Math.min(1, p));
    const invT = 1 - t;
    const sunX = invT * invT * 24 + 2 * invT * t * 150 + t * t * 276;
    const sunY = invT * invT * 58 + 2 * invT * t * 4 + t * t * 58;

    return {
      progress: t,
      sunX: Math.round(sunX * 10) / 10,
      sunY: Math.round(sunY * 10) / 10,
      phaseName
    };
  });

  let lastPlayedSecond = -1;

  $effect(() => {
    if (
      iqamahCountdownActive && 
      iqamahRemainingSeconds >= 0 && 
      iqamahRemainingSeconds <= 10 && 
      iqamahRemainingSeconds !== lastPlayedSecond &&
      appSettings.settings.iqamahCountdownSound &&
      appSettings.settings.iqamahCountdownSound !== 'none'
    ) {
      lastPlayedSecond = iqamahRemainingSeconds;
      
      const soundType = appSettings.settings.iqamahCountdownSound;
      if (soundType === 'chime') {
        playSynthesizedSound('chime', (appSettings.settings.soundVolume ?? 80) / 100, 800);
      } else if (soundType === 'tick') {
        playSynthesizedSound('tick', (appSettings.settings.soundVolume ?? 80) / 100);
      }
    }
    
    if (!iqamahCountdownActive) {
      lastPlayedSecond = -1;
    }
  });

  let hijriDayNum = $derived.by(() => {
    const dynamicHijriStr = getDynamicHijriDate(
      todayData?.date || currentTime.toISOString(),
      appSettings.settings.hijriMethod,
      appSettings.settings.hijriAdjustment,
      todayData?.hijri
    );
    if (dynamicHijriStr) {
      const parts = dynamicHijriStr.split("-");
      if (parts.length === 3) {
        return String(parseInt(parts[2], 10));
      }
    }
    return "•";
  });

  let hijriMonthYear = $derived.by(() => {
    const dynamicHijriStr = getDynamicHijriDate(
      todayData?.date || currentTime.toISOString(),
      appSettings.settings.hijriMethod,
      appSettings.settings.hijriAdjustment,
      todayData?.hijri
    );
    if (dynamicHijriStr) {
      const parts = dynamicHijriStr.split("-");
      if (parts.length === 3) {
        const [year, month] = parts;
        const mIndex = parseInt(month, 10) - 1;
        const monthNum = parseInt(month, 10);

        if (appSettings.settings.hijriFormat === "number") {
          return `${monthNum} / ${year}H`;
        } else {
          if (mIndex >= 0 && mIndex < 12) {
            const monthName = appSettings.settings.language === "ms" ? HIJRI_MONTHS[mIndex] : HIJRI_MONTHS_EN[mIndex];
            return `${monthName} ${year}H`;
          } else {
            return `${monthNum} / ${year}H`;
          }
        }
      }
    }
    return "---";
  });

  let hijriLabel = $derived.by(() => {
    const base = appSettings.settings.language === "ms" ? "Hijriah" : "Hijri";
    const dynamicHijriStr = getDynamicHijriDate(
      todayData?.date || currentTime.toISOString(),
      appSettings.settings.hijriMethod,
      appSettings.settings.hijriAdjustment,
      todayData?.hijri
    );
    if (dynamicHijriStr) {
      const parts = dynamicHijriStr.split("-");
      if (parts.length === 3 && (!appSettings.settings.hijriFormat || appSettings.settings.hijriFormat === "both")) {
        const [year, month, day] = parts;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        return `${base} • ${dayNum}/${monthNum}/${year}H`;
      }
    }
    return base;
  });

  let gregorianCardStyle = $derived(
    visualStyle === 'retro' 
      ? "border-radius: 0px;"
      : "border-top-left-radius: var(--md-sys-shape-corner-extra-large); border-bottom-right-radius: var(--md-sys-shape-corner-extra-large); border-top-right-radius: var(--md-sys-shape-corner-medium); border-bottom-left-radius: var(--md-sys-shape-corner-medium);"
  );

  let hijriCardStyle = $derived(
    visualStyle === 'retro'
      ? "border-radius: 0px;"
      : "border-top-right-radius: var(--md-sys-shape-corner-extra-large); border-bottom-left-radius: var(--md-sys-shape-corner-extra-large); border-top-left-radius: var(--md-sys-shape-corner-medium); border-bottom-right-radius: var(--md-sys-shape-corner-medium);"
  );

  let digitalTime = $state(new Date());
  onMount(() => {
    const updateTick = () => {
      const now = new Date();
      now.setMilliseconds(0);
      digitalTime = now;
    };
    updateTick();
    const interval = setInterval(updateTick, 1000);
    return () => clearInterval(interval);
  });

  let timeString = $derived(format(digitalTime, appSettings.settings.timeFormat === '12h' ? "h:mm" : "HH:mm"));
  let ampm = $derived(appSettings.settings.timeFormat === '12h' ? format(digitalTime, "a") : "");

  function blurFly(node: Element, { delay = 0, duration = 300, y = '100%', blur = 4, isOut = false }) {
    const yVal = typeof y === 'string' && y.endsWith('%') ? y : `${y}px`;
    return {
      delay,
      duration,
      css: (t: number, u: number) => `
        transform: translateY(calc(${u} * ${yVal}));
        opacity: ${t};
        filter: blur(${u * blur}px);
        ${isOut ? 'position: absolute;' : ''}
      `
    };
  }
</script>

{#snippet ExternalDigitalComplication()}
  {#if appSettings.settings.showExternalDigitalClock !== false}
    <div class={cn(
      "relative z-10 mt-2 sm:mt-4 lg:mt-0 lg:ml-8",
      "flex flex-col items-center justify-center"
    )}>
      <div class={cn(
        "relative overflow-hidden flex items-baseline justify-center px-6 py-2.5 sm:px-8 sm:py-3 lg:px-10 lg:py-6 rounded-[1.25rem] sm:rounded-[2rem] lg:rounded-[3rem] font-black tracking-tighter text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-[6rem] leading-none",
        "bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm",
        visualStyle === 'retro' && "border-[3px] border-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] lg:shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none ring-0",
        visualStyle === 'glass' && "bg-[var(--glass-bg)]/60 backdrop-blur-2xl border border-[var(--glass-border)] text-[var(--md-sys-color-on-surface)] ring-0 shadow-lg",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-surface-container-lowest)] shadow-[var(--soft-shadow-medium)] border-0 ring-0"
      )}>
        <span class="font-sans drop-shadow-sm tabular-nums">{timeString}</span>
        {#if ampm}
          <span class="ml-1.5 sm:ml-2 lg:ml-4 text-[10px] sm:text-xs md:text-base lg:text-2xl xl:text-3xl opacity-70 font-sans font-extrabold uppercase tracking-widest">{ampm}</span>
        {/if}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet AnimatedNumber(value: number, padZero: boolean)}
  {@const str = padZero ? String(value).padStart(2, "0") : String(value)}
  {@const chars = str.split("")}
  <div class="flex items-baseline">
    {#each chars as char, i (i + '-' + chars.length)}
      <div class="relative inline-flex items-center justify-center overflow-hidden min-w-[0.5em] h-[1em]">
        {#key char}
          <span 
            in:blurFly={{ y: '100%', duration: 300 }} 
            out:blurFly={{ y: '-100%', duration: 300, isOut: true }} 
            class="inline-block leading-none"
          >
            {char}
          </span>
        {/key}
      </div>
    {/each}
  </div>
{/snippet}

<div class="flex flex-col mt-0 sm:mt-1 w-full flex-1 justify-start gap-1.5 sm:gap-2">
  <div class="flex flex-col w-full">
    {#if nextPrayerName}
      <div
        in:fly={{ y: 15, duration: 300 }}
        out:fly={{ duration: 300 , isExit: true}}
        class={cn(
          "relative w-full mb-1.5 lg:mb-2 rounded-[28px] lg:rounded-[32px] overflow-hidden flex flex-col gap-1 sm:gap-0 bg-[var(--md-sys-color-surface-container-highest)]/30",
          visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
          visualStyle === 'glass' && "bg-[var(--glass-bg)]/50 backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]",
          visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border border-white/20"
        )}
      >
        
        <div class="flex flex-col md:flex-row w-full relative z-10 gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-2.5">
          {#if prevPrayerName}
            <div class="bg-[var(--md-sys-color-tertiary-container)]/90 backdrop-blur-md rounded-[20px] lg:rounded-[24px] p-3.5 sm:p-4 md:w-[35%] lg:w-[30%] xl:w-[25%] flex flex-col justify-between border border-white/10 dark:border-white/5 relative overflow-hidden group">
              <div class="absolute -left-8 -bottom-8 w-24 h-24 bg-[var(--md-sys-color-tertiary)]/20 rounded-full blur-2xl group-hover:bg-[var(--md-sys-color-tertiary)]/30 transition-colors duration-1000"></div>
              
              <div class="flex items-center gap-2 mb-3 md:mb-6 relative z-10">
                <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--md-sys-color-tertiary)] animate-pulse shadow-[0_0_8px_var(--md-sys-color-tertiary)]"></div>
                <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[var(--md-sys-color-on-tertiary-container)]/80">
                  {appSettings.t("now")}
                </span>
              </div>
              <div class="flex flex-col relative z-10">
                <span class="text-xl sm:text-2xl md:text-3xl font-black text-[var(--md-sys-color-on-tertiary-container)] leading-none tracking-tight">
                  {prevPrayerName}
                </span>
              </div>
            </div>
          {/if}

          <div class={cn(
            "bg-[var(--md-sys-color-primary-container)]/90 backdrop-blur-md rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 md:p-6 flex-1 flex flex-col justify-between border border-white/10 dark:border-white/5 relative overflow-hidden group min-h-[110px]",
            !prevPrayerName && "w-full"
          )}>
            <!-- Atmospheric dynamic radiant glow harmonizing with the 6 prayer phases -->
            <div
              class="absolute -inset-8 rounded-[48px] opacity-40 dark:opacity-60 blur-3xl pointer-events-none transition-all duration-1000 -z-10"
              style="background: radial-gradient(circle at 80% 20%, {themeState.activeColor}55 0%, transparent 65%), radial-gradient(circle at 20% 80%, {themeState.activeColor}33 0%, transparent 60%);"
            ></div>
            <div
              class="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-50 dark:opacity-75 transition-all duration-1000 pointer-events-none"
              style="background: radial-gradient(circle, {themeState.activeColor}40 0%, transparent 70%);"
            ></div>
            <div
              class="absolute -left-16 -bottom-16 w-64 h-64 rounded-full blur-2xl opacity-35 dark:opacity-50 transition-all duration-1000 pointer-events-none"
              style="background: radial-gradient(circle, {themeState.activeColor}25 0%, transparent 70%);"
            ></div>
            
            <!-- Integrated Gregorian & Hijri Date Badges (M3 Squircle Pills) -->
            <div class="flex items-center gap-2 mb-3.5 flex-wrap relative z-10">
              <button
                type="button"
                use:ripple
                onclick={onCalendarClick}
                class="rounded-full bg-[var(--md-sys-color-surface-container)]/85 hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/40 px-3 py-1 flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                title={appSettings.t("calendarLabel")}
              >
                <Calendar class="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                <span>{format(currentTime, "EEEE, d MMM yyyy", { locale: appSettings.settings.language === "ms" ? msLocale : enUS })}</span>
              </button>

              <div class="rounded-full bg-[var(--md-sys-color-tertiary-container)]/80 text-[var(--md-sys-color-on-tertiary-container)] border border-[var(--md-sys-color-outline-variant)]/30 px-3 py-1 flex items-center gap-1.5 text-xs font-bold shadow-xs">
                <Moon class="w-3.5 h-3.5 text-[var(--md-sys-color-tertiary)]" />
                <span>{hijriDayNum} {hijriMonthYear}</span>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full relative z-10 gap-4 sm:gap-0">
              <div class="flex flex-col w-full sm:w-auto">
                <div class="flex items-center gap-2 mb-1 sm:mb-2">
                  <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                    {appSettings.t("nextPrayer")}
                  </span>
                </div>
                <div class="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <span class="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--md-sys-color-on-primary-container)] tracking-tighter leading-none drop-shadow-sm">
                    {nextPrayerName}
                  </span>
                  {#if nextPrayerTime}
                    <span class="text-sm sm:text-base font-bold text-[var(--md-sys-color-on-primary-container)]/60 tracking-tight">
                      {format(nextPrayerTime, appSettings.settings.timeFormat === "12h" ? "hh:mm a" : "HH:mm")}
                    </span>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <!-- High-Precision Circular Countdown Ring (SVG) -->
                <div class="relative shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 96 96" class="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 drop-shadow-sm">
                    <!-- Background Track Ring -->
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="6.5"
                      transform="rotate(-90 48 48)"
                      class="text-[var(--md-sys-color-on-primary-container)]/15"
                    />
                    <!-- Reactive Progress Ring -->
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      fill="none"
                      stroke="var(--md-sys-color-primary)"
                      stroke-width="6.5"
                      stroke-linecap="round"
                      stroke-dasharray="238.76"
                      stroke-dashoffset={ringDashoffset}
                      transform="rotate(-90 48 48)"
                      class="transition-[stroke-dashoffset] duration-1000 ease-linear"
                    />
                    <!-- Active Tip Orb -->
                    <circle
                      cx={ringOrbX}
                      cy={ringOrbY}
                      r="4.5"
                      fill="var(--md-sys-color-primary)"
                      stroke="white"
                      stroke-width="1.5"
                      class="shadow-sm transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[10px] sm:text-xs font-black tabular-nums text-[var(--md-sys-color-primary)]">
                      {Math.round(safeProgress)}%
                    </span>
                  </div>
                </div>

                <div class="flex flex-col items-start sm:items-end">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--md-sys-color-on-primary-container)]/70 mb-1">
                    {appSettings.t("timeRemaining")}
                  </span>
                  <div class="flex items-baseline font-sans text-[var(--md-sys-color-primary)] text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter drop-shadow-sm">
                    {#if countdownParts.active}
                      {#if countdownParts.h > 0}
                        <div class="flex items-baseline">
                          {@render AnimatedNumber(countdownParts.h, false)}
                          <span class="text-sm sm:text-base md:text-lg opacity-60 ml-0.5 mr-1.5 font-sans font-bold">{appSettings.t("hoursShort")}</span>
                        </div>
                      {/if}
                      {#if countdownParts.m > 0 || countdownParts.h > 0}
                        <div class="flex items-baseline">
                          {@render AnimatedNumber(countdownParts.m, true)}
                          <span class="text-sm sm:text-base md:text-lg opacity-60 ml-0.5 mr-1.5 font-sans font-bold">{appSettings.t("minutesShort")}</span>
                        </div>
                      {/if}
                      <div class="flex items-baseline">
                        {@render AnimatedNumber(countdownParts.s, true)}
                        <span class="text-sm sm:text-base md:text-lg opacity-60 ml-0.5 font-sans font-bold">{appSettings.t("secondsShort")}</span>
                      </div>
                    {:else}
                       <span class="text-3xl sm:text-4xl md:text-5xl font-sans font-black uppercase tracking-widest text-[var(--md-sys-color-error)] animate-pulse">{appSettings.t("now")}</span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="w-full mt-4 sm:mt-5 relative z-10">
              <div class="w-full h-2.5 lg:h-3 bg-[var(--md-sys-color-on-primary-container)]/10 text-[var(--md-sys-color-primary)] rounded-full relative flex items-center">
                <div
                  class="absolute inset-y-0 left-0 bg-current transition-all duration-1000 ease-linear animate-squiggle drop-shadow-[0_2px_4px_var(--md-sys-color-primary)]"
                  style="width: {safeProgress}%; mask-image: url(&quot;data:image/svg+xml,%3Csvg width='40' height='16' viewBox='0 0 40 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 8 Q 10 2 20 8 T 40 8' fill='none' stroke='black' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E&quot;); mask-repeat: repeat-x; -webkit-mask-image: url(&quot;data:image/svg+xml,%3Csvg width='40' height='16' viewBox='0 0 40 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 8 Q 10 2 20 8 T 40 8' fill='none' stroke='black' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E&quot;); -webkit-mask-repeat: repeat-x;"
                ></div>
                <div
                  class="absolute h-3 w-3 lg:h-4 lg:w-4 bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_var(--md-sys-color-primary)] border-[1.5px] border-white z-10"
                  style="left: calc({safeProgress}% - 6px);"
                ></div>
              </div>
            </div>

            <!-- Solar Progress Arc Tracking Day's Solar Trajectory -->
            <div class="w-full mt-3.5 sm:mt-4 pt-2.5 border-t border-[var(--md-sys-color-outline-variant)]/20 relative z-10 flex flex-col gap-1">
              <div class="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-primary-container)]/75">
                <div class="flex items-center gap-1.5">
                  <Sun class="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                  <span>{appSettings.settings.language === 'ms' ? 'Trajektori Suria Harian' : 'Daily Solar Trajectory'}</span>
                </div>
                <span class="text-[var(--md-sys-color-primary)] font-black">
                  {solarTrajectory.phaseName}
                </span>
              </div>

              <!-- SVG Solar Trajectory Arc & Position Orb -->
              <div class="relative w-full h-12 sm:h-14 flex items-center justify-center overflow-visible">
                <svg viewBox="0 0 300 70" class="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="solarTrajectoryGrad" x1="0%" y1="100%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#6750A4" stop-opacity="0.4" />
                      <stop offset="20%" stop-color="#D97706" stop-opacity="0.6" />
                      <stop offset="50%" stop-color="#0284C7" stop-opacity="0.9" />
                      <stop offset="72%" stop-color="#D97706" stop-opacity="0.7" />
                      <stop offset="90%" stop-color="#BF3626" stop-opacity="0.6" />
                      <stop offset="100%" stop-color="#1E1B4B" stop-opacity="0.4" />
                    </linearGradient>
                    <filter id="solarOrbGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <!-- Horizon dashed baseline -->
                  <line x1="20" y1="58" x2="280" y2="58" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1" class="text-[var(--md-sys-color-on-primary-container)]/20" />

                  <!-- Solar trajectory background arc track -->
                  <path
                    d="M 24 58 Q 150 4 276 58"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    class="text-[var(--md-sys-color-on-primary-container)]/15"
                  />

                  <!-- Solar trajectory traversed arc highlight -->
                  <path
                    d="M 24 58 Q 150 4 276 58"
                    fill="none"
                    stroke="url(#solarTrajectoryGrad)"
                    stroke-width="3.5"
                    stroke-linecap="round"
                    stroke-dasharray="290"
                    stroke-dashoffset={290 * (1 - solarTrajectory.progress)}
                    class="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />

                  <!-- 6 Prayer Phase Solar Milestones -->
                  <circle cx="24" cy="58" r="3" fill="#6750A4" class="opacity-80" />
                  <circle cx="74.4" cy="39.5" r="3" fill="#D97706" class="opacity-80" />
                  <circle cx="150" cy="31" r="3.5" fill="#0284C7" class="opacity-90" />
                  <circle cx="205.4" cy="36.4" r="3" fill="#D97706" class="opacity-80" />
                  <circle cx="250.6" cy="50.1" r="3" fill="#BF3626" class="opacity-80" />
                  <circle cx="276" cy="58" r="3" fill="#1E1B4B" class="opacity-80" />

                  <!-- Active Sun / Solar Position Orb -->
                  <g transform="translate({solarTrajectory.sunX}, {solarTrajectory.sunY})">
                    <circle cx="0" cy="0" r="10" fill="var(--md-sys-color-primary)" opacity="0.25" class="animate-ping" />
                    <circle cx="0" cy="0" r="7" fill="var(--md-sys-color-primary)" filter="url(#solarOrbGlow)" />
                    <circle cx="0" cy="0" r="4.5" fill="#FFF9C4" stroke="var(--md-sys-color-primary)" stroke-width="1.5" />
                  </g>
                </svg>
              </div>

              <!-- Milestone labels -->
              <div class="flex justify-between items-center px-1 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-tight text-[var(--md-sys-color-on-primary-container)]/60">
                <div class="text-left">Subuh</div>
                <div class="text-center">Syuruk</div>
                <div class="text-center text-[var(--md-sys-color-primary)] font-black">Zohor</div>
                <div class="text-center">Asar</div>
                <div class="text-center">Maghrib</div>
                <div class="text-right">Isyak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Dynamic Clock Face Container -->
    {#key appSettings.settings.clockFace || 'digital'}
      <div
        in:scale={{ duration: 300, start: 0.95 }}
        out:scale={{ duration: 300, start: 1.05 }}
        class={cn(
          "w-full flex items-center justify-center relative origin-top transition-all duration-300",
          appSettings.settings.showExternalDigitalClock && ['analog', 'analog-numeric', 'analog-roman', 'analog-arabic', 'dashboard', 'minimal', 'orbit', 'swiss-station', 'bauhaus', 'layered'].includes(appSettings.settings.clockFace || '') 
            ? "flex-col lg:flex-row scale-90 sm:scale-100 -mb-6 sm:mb-1 lg:mb-4 mt-0 sm:mt-1" 
            : "flex-col lg:flex-row mt-1 mb-1 lg:mb-4 scale-100"
        )}
      >
        {#if !appSettings.settings.clockFace || appSettings.settings.clockFace === 'digital'}
          <DigitalClock />
        {:else if appSettings.settings.clockFace === 'analog'}
          <AnalogClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'analog-numeric'}
          <AnalogNumericClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'analog-roman'}
          <AnalogRomanClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'analog-arabic'}
          <AnalogArabicClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'dashboard'}
          <DashboardClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'abstract'}
          <AbstractClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'anadigi'}
          <AnaDigiClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'chronograph'}
          <ChronographClock 
            movement={appSettings.settings.clockMovement || 'sweep'}
            nextPrayerName={nextPrayerName}
            nextPrayerTime={nextPrayerTime}
            prevPrayerTime={prevPrayerTime}
            todayHijri={todayHijri}
          />
        {:else if appSettings.settings.clockFace === 'flip'}
          <FlipClock />
        {:else if appSettings.settings.clockFace === 'word'}
          <WordClock />
        {:else if appSettings.settings.clockFace === 'minimal'}
          <MinimalistClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'orbit'}
          <OrbitClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'typographic'}
          <TypographicClock />
        {:else if appSettings.settings.clockFace === 'prayer-ring'}
          <PrayerRingClock movement={appSettings.settings.clockMovement || 'sweep'} todayData={todayData} />
        {:else if appSettings.settings.clockFace === 'swiss-station'}
          <SwissStationClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'bauhaus'}
          <BauhausClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {:else if appSettings.settings.clockFace === 'layered'}
          <LayeredClock movement={appSettings.settings.clockMovement || 'sweep'} />
        {/if}
        
        {#if ['analog', 'analog-numeric', 'analog-roman', 'analog-arabic', 'dashboard', 'minimal', 'orbit', 'swiss-station', 'bauhaus', 'layered'].includes(appSettings.settings.clockFace || '')}
          {@render ExternalDigitalComplication()}
        {/if}
      </div>
    {/key}

    <!-- Date & Hijri - Way Material 3 Expressive Row -->
    <div class="flex flex-col items-center w-full mt-0.5 sm:mt-2 mb-0.5 lg:mb-1 z-10">
      <div class="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4 w-full">
        <!-- Gregorian Date Card -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <div
          use:ripple
          style={gregorianCardStyle}
          class={cn(
            "relative overflow-hidden flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-2 xl:gap-4 p-2.5 sm:p-2.5 md:p-3.5 lg:p-2.5 xl:p-4 transition-all duration-500 ease-out cursor-pointer select-none group",
            "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:scale-[1.03] hover:-translate-y-[3px] active:scale-[0.98]",
            visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
            visualStyle === 'glass' && "bg-[var(--glass-bg)]/40 backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border border-white/20 bg-[var(--md-sys-color-primary-container)]"
          )}
          onclick={onCalendarClick}
          role="button"
          tabindex="0"
        >
          <Calendar class={cn(
            "absolute -right-3 -bottom-3 w-10 h-10 md:w-14 md:h-14 lg:w-10 lg:h-10 xl:w-16 xl:h-16 opacity-[0.04] pointer-events-none transition-all duration-700 ease-out group-hover:rotate-12 group-hover:scale-125 group-hover:opacity-[0.08]",
            "text-[var(--md-sys-color-primary)]",
            visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)] opacity-5",
            visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)] opacity-5",
            visualStyle === 'soft' && "text-[var(--md-sys-color-primary)] opacity-[0.05]"
          )} />

          <span class={cn(
            "text-2.5xl sm:text-2.5xl md:text-3.5xl lg:text-3.5xl xl:text-4xl 2xl:text-4.5xl font-black font-sans leading-none tracking-tighter select-none shrink-0 tabular-nums z-10 transition-colors duration-300",
            "text-[var(--md-sys-color-primary)]",
            visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'soft' && "text-[var(--md-sys-color-primary)]"
          )}>
            {format(currentTime, "d")}
          </span>

          <div class="flex flex-col min-w-0 gap-0.5 z-10">
            <span class="text-xs md:text-sm lg:text-base xl:text-sm 2xl:text-base font-black leading-tight tracking-tight truncate">
              {format(currentTime, "MMMM yyyy", {
                locale: appSettings.settings.language === "ms" ? msLocale : enUS,
              })}
            </span>
            <span class={cn(
              "text-[9px] md:text-[10px] lg:text-xs xl:text-[10px] 2xl:text-xs font-extrabold uppercase tracking-widest leading-none opacity-80 truncate",
              visualStyle === 'retro' && "opacity-95"
            )}>
              {format(currentTime, "EEEE", {
                locale: appSettings.settings.language === "ms" ? msLocale : enUS,
              })}
            </span>
          </div>
        </div>

        <!-- Hijri Date Card -->
        <div
          use:ripple
          style={hijriCardStyle}
          class={cn(
            "relative overflow-hidden flex items-center gap-2 sm:gap-2 md:gap-3 lg:gap-2 xl:gap-4 p-2.5 sm:p-2.5 md:p-3.5 lg:p-2.5 xl:p-4 transition-all duration-500 ease-out select-none group hover:scale-[1.03] hover:-translate-y-[3px] active:scale-[0.98]",
            "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]",
            visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] rounded-none text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'glass' && "bg-[var(--glass-bg)]/40 backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border border-white/20 bg-[var(--md-sys-color-tertiary-container)]"
          )}
        >
          <Moon class={cn(
            "absolute -right-3 -bottom-3 w-10 h-10 md:w-14 md:h-14 lg:w-10 lg:h-10 xl:w-16 xl:h-16 opacity-[0.04] pointer-events-none transition-all duration-700 ease-out group-hover:-rotate-12 group-hover:scale-125 group-hover:opacity-[0.08]",
            "text-[var(--md-sys-color-tertiary)]",
            visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)] opacity-5",
            visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)] opacity-5",
            visualStyle === 'soft' && "text-[var(--md-sys-color-tertiary)] opacity-[0.05]"
          )} />

          <span class={cn(
            "text-2.5xl sm:text-2.5xl md:text-3.5xl lg:text-3.5xl xl:text-4xl 2xl:text-4.5xl font-black font-sans leading-none tracking-tighter select-none shrink-0 tabular-nums z-10 transition-colors duration-300",
            "text-[var(--md-sys-color-tertiary)]",
            visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)]",
            visualStyle === 'soft' && "text-[var(--md-sys-color-tertiary)]"
          )}>
            {hijriDayNum}
          </span>

          <div class="flex flex-col min-w-0 gap-0.5 z-10">
            <span class="text-xs md:text-sm lg:text-base xl:text-sm 2xl:text-base font-black leading-tight tracking-tight truncate">
              {hijriMonthYear}
            </span>
            <span class={cn(
              "text-[9px] md:text-[10px] lg:text-xs xl:text-[10px] 2xl:text-xs font-extrabold uppercase tracking-widest leading-none opacity-80 truncate",
              visualStyle === 'retro' && "opacity-95"
            )}>
              {hijriLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-row gap-2 lg:gap-3 mt-auto w-full shrink-0">
    <div
      class={cn(
        "relative overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large)] flex-1 min-h-[56px] sm:min-h-[64px] lg:min-h-[68px] flex flex-col justify-between transition-all duration-500 ease-out cursor-default group",
        !iqamahCountdownActive 
          ? "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] hover:scale-[1.02] hover:-rotate-1 hover:-translate-y-1 active:scale-[0.98]" 
          : (iqamahRemainingSeconds <= 10 
              ? "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] border-2 border-[var(--md-sys-color-error)] shadow-md animate-pulse" 
              : iqamahRemainingSeconds <= 30
                ? "bg-[var(--md-sys-color-tertiary)] text-[var(--md-sys-color-on-tertiary)] border-2 border-[var(--md-sys-color-tertiary)] shadow-sm"
                : "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] border border-[var(--md-sys-color-error)]/30"),
        visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
        visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] text-[var(--md-sys-color-on-surface)]",
        visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)]"
      )}
    >
      {#if !iqamahCountdownActive}
        <div use:ripple in:fade={{ duration: 300 }} out:fade={{ duration: 200 }} class="absolute inset-0 p-2 sm:p-2.5 flex flex-col justify-between h-full w-full">
          <div class="absolute -right-2 -bottom-2 w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-[var(--md-sys-color-tertiary)]/10 pointer-events-none transition-all duration-300 group-hover:-rotate-12 group-hover:opacity-20">
            <Compass class="w-full h-full" />
          </div>

          <div class="relative z-10 flex flex-col h-full justify-between gap-1">
            <h3 class="md3-label-small text-[var(--md-sys-color-on-tertiary-container)]/80 font-black uppercase tracking-widest">
              {appSettings.t("qibla")}
            </h3>
            <div>
              <p class="text-lg sm:text-xl lg:text-2xl font-black font-sans tracking-tighter leading-none">
                292.41°
              </p>
              <p class="text-[9px] sm:text-[10px] opacity-80 font-bold mt-1 tracking-wide">
                {appSettings.t("fromTrueNorth")}
              </p>
            </div>
          </div>
        </div>
      {:else}
        <div in:fade={{ duration: 300 }} out:fade={{ duration: 200 }} class="absolute inset-0 p-2 sm:p-2.5 flex flex-col justify-between h-full w-full">
          <div 
            class="absolute inset-y-0 left-0 bg-[var(--md-sys-color-error)]/10 dark:bg-white/10 pointer-events-none"
            style="width: {$countdownWidthSpring}%; display: {iqamahRemainingSeconds <= 5 ? 'none' : 'block'};"
          ></div>
          
          <div class="relative z-10 flex flex-col h-full justify-between gap-1 w-full text-center">
            {#if iqamahRemainingSeconds <= 5}
              <div class="flex flex-col items-center justify-center h-full w-full py-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-on-error)] animate-bounce leading-none mb-1">
                  {currentPrayerNameForIqamah || "IQAMAH"}
                </span>
                {#key iqamahRemainingSeconds}
                  <span 
                    class="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tight leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
                  >
                    {iqamahRemainingSeconds}
                  </span>
                {/key}
              </div>
            {:else}
              <h3 class={cn(
                "md3-label-small font-black uppercase tracking-widest text-center",
                iqamahRemainingSeconds <= 10 ? "text-[var(--md-sys-color-on-error)]" : iqamahRemainingSeconds <= 30 ? "text-[var(--md-sys-color-on-tertiary)]" : "text-[var(--md-sys-color-on-error-container)]/80"
              )}>
                IQAMAH {currentPrayerNameForIqamah ? `• ${currentPrayerNameForIqamah}` : ''} {iqamahPaused ? " (PAUSED)" : ""}
              </h3>
              <div class="flex flex-col items-center">
                <p class={cn(
                  "font-black font-sans tracking-tighter leading-none text-center transition-all duration-300",
                  iqamahRemainingSeconds <= 10 ? "text-3xl sm:text-4xl lg:text-5xl text-white" : iqamahRemainingSeconds <= 30 ? "text-2.5xl sm:text-3xl lg:text-4xl text-white" : "text-xl sm:text-2xl lg:text-3xl"
                )}>
                  {Math.floor(iqamahRemainingSeconds / 60)}:
                  {String(iqamahRemainingSeconds % 60).padStart(2, '0')}
                </p>
                <p class={cn(
                  "text-[9px] sm:text-[10px] font-bold mt-1 tracking-wide text-center",
                  iqamahRemainingSeconds <= 10 ? "text-[var(--md-sys-color-on-error)]" : iqamahRemainingSeconds <= 30 ? "text-[var(--md-sys-color-on-tertiary)]" : "opacity-80"
                )}>
                  {iqamahRemainingSeconds <= 10 ? "SEDIA BERSOLAT" : iqamahRemainingSeconds <= 30 ? "SAK SAF RAPAT & LURUS" : "Sila bersedia untuk solat berjemaah"}
                </p>
              </div>
            {/if}
          </div>

          {#if onIqamahTogglePause && onIqamahAddMinute && iqamahRemainingSeconds > 5}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20">
              <IconButton
                variant="tonal"
                shape="circle"
                size="md"
                onclick={(e: any) => {
                  e.stopPropagation();
                  onIqamahTogglePause?.();
                }}
                title={iqamahPaused ? "Mula" : "Jeda"}
                ariaLabel={iqamahPaused ? "Mula" : "Jeda"}
                class="!bg-white/20 !text-white hover:!bg-white/30"
              >
                {#if iqamahPaused}
                  <Play class="fill-white stroke-[2.5]" />
                {:else}
                  <Pause class="fill-white stroke-[2.5]" />
                {/if}
              </IconButton>
              <Button
                variant="tonal"
                shape="pill"
                size="sm"
                onclick={(e: Event) => {
                  e.stopPropagation();
                  onIqamahAddMinute?.();
                }}
                title="Tambah 1 minit"
                class="!bg-white/20 !text-white hover:!bg-white/30"
              >
                {#snippet leadingIcon()}
                  <Plus size={18} />
                {/snippet}
                +1m
              </Button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div
      use:ripple
      class={cn(
        "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] p-2 sm:p-2.5 rounded-[var(--md-sys-shape-corner-extra-large)] flex-1 relative overflow-hidden cursor-default min-h-[56px] sm:min-h-[64px] lg:min-h-[68px] flex flex-col justify-between group hover:scale-[1.02] hover:rotate-1 hover:-translate-y-1 active:scale-[0.98] transition-all",
        visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]",
        visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]",
        visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)]"
      )}
    >
      <div class="absolute -right-2 -bottom-2 w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-[var(--md-sys-color-secondary)]/10 pointer-events-none transition-all duration-300 group-hover:rotate-12 group-hover:opacity-20">
        <Sunrise class="w-full h-full" />
      </div>

      <div class="relative z-10 flex flex-col h-full justify-between gap-1">
        <h3 class="md3-label-small text-[var(--md-sys-color-on-secondary-container)]/80 font-black uppercase tracking-widest">
          {appSettings.t("sunrise")}
        </h3>
        <div>
          <p class="text-lg sm:text-xl lg:text-2xl font-black font-sans tracking-tighter leading-none">
            {syurukTime || "--:--"}
          </p>
          <p class="text-[9px] sm:text-[10px] opacity-80 font-bold mt-1 tracking-wide">
            {appSettings.t("dailySunrise")}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
