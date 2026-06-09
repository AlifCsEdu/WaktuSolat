<script module lang="ts">
  import {
    Moon,
    Sun,
    Sunrise,
    Sunset,
    SunDim,
    SunMedium,
  } from "lucide-svelte";
  import { type Component } from "svelte";

  export const PRAYER_NAMES: Record<string, string> = {
    imsak: "Imsak",
    fajr: "Subuh",
    syuruk: "Syuruk",
    dhuhr: "Zohor",
    asr: "Asar",
    maghrib: "Maghrib",
    isha: "Isyak",
  };

  export const PRAYER_ICONS: Record<string, any> = {
    imsak: Moon,
    fajr: Sunrise,
    syuruk: Sun,
    dhuhr: SunMedium,
    asr: SunDim,
    maghrib: Sunset,
    isha: Moon,
  };
</script>

<script lang="ts">
  import { cn } from "../lib/utils";
  import { fly, fade } from "svelte/transition";
  import "@material/web/iconbutton/icon-button.js";
  import "@material/web/iconbutton/filled-tonal-icon-button.js";
  import "@material/web/chips/filter-chip.js";
  import {
    Bell,
    BellOff,
    BellRing,
    Settings,
    Share2,
  } from "lucide-svelte";
  import { parse, startOfDay, format } from "date-fns";
  import { calculateSunnahTimes } from "../lib/sunnah";
  import { appSettings } from "../state/settings.svelte";
  import type { PrayerData, PrayerPreference } from "../types";

  let {
    todayData,
    tomorrowData,
    nextPrayerKey,
    currentPrayerKey,
    preferences,
    onTogglePreference,
    notificationPermission,
    onRequestPermission,
    onSettingsClick,
    onShareClick,
    currentTime,
  } = $props<{
    todayData: PrayerData | null;
    tomorrowData?: PrayerData | null;
    nextPrayerKey: string | null;
    currentPrayerKey?: string | null;
    preferences: Partial<Record<string, PrayerPreference>>;
    onTogglePreference: (key: any) => void;
    notificationPermission: string;
    onRequestPermission: () => void;
    onSettingsClick: () => void;
    onShareClick: () => void;
    currentTime: Date;
  }>();

  let settings = $derived(appSettings.settings);
  let t = $derived((key: any, params?: any) => appSettings.t(key, params));
  let visualStyle = $derived(appSettings.settings.visualStyle);

  let filter = $state<"all" | "fardu" | "sunnah">("fardu");

  type PrayerKey =
    | "imsak"
    | "fajr"
    | "syuruk"
    | "dhuhr"
    | "asr"
    | "maghrib"
    | "isha"
    | "suhoor"
    | "morningForbidden"
    | "duha"
    | "middayForbidden"
    | "eveningForbidden"
    | "firstThird"
    | "midnight"
    | "tahajjud";

  let baseTimes = $derived(todayData ? {
    imsak: todayData.imsak,
    fajr: todayData.fajr,
    syuruk: todayData.syuruk,
    dhuhr: todayData.dhuhr,
    asr: todayData.asr,
    maghrib: todayData.maghrib,
    isha: todayData.isha,
  } : {} as any);

  let sunnahCalculated = $derived(todayData ? calculateSunnahTimes(todayData, tomorrowData || null, {
    suhoorOffset: settings.suhoorOffset || 30,
    midnightMethod: settings.midnightMethod || 'fajr'
  }) : {});

  let mergedData = $derived({ ...baseTimes, ...sunnahCalculated });

  let allKeys = $derived.by(() => {
    let keys = [
      ...(settings.trackImsak ? ["imsak" as PrayerKey] : []),
      "fajr" as PrayerKey,
      "syuruk" as PrayerKey,
      "dhuhr" as PrayerKey,
      "asr" as PrayerKey,
      "maghrib" as PrayerKey,
      "isha" as PrayerKey,
    ];

    if (settings.showSunnahTimes && settings.showSunnahTimes.length > 0) {
      keys = Array.from(new Set([...keys, ...settings.showSunnahTimes] as PrayerKey[]));
      
      keys.sort((a, b) => {
        const getMins = (k: string) => {
          const timeStr = mergedData[k as keyof typeof mergedData] || "00:00";
          const [h, m] = timeStr.split(":").map(Number);
          let mins = h * 60 + m;
          if (["firstThird", "midnight", "tahajjud"].includes(k) && h < 12) {
            mins += 24 * 60;
          }
          return mins;
        };
        return getMins(a) - getMins(b);
      });
    }
    return keys;
  });

  let allTimes = $derived(allKeys);
  let fardhuTimes: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  
  let sunnahTimesFilter = $derived([
    ...(settings.trackImsak ? ["imsak" as PrayerKey] : []),
    "syuruk" as PrayerKey,
    ...(settings.showSunnahTimes || []) as PrayerKey[]
  ].sort((a, b) => allKeys.indexOf(a) - allKeys.indexOf(b)) as PrayerKey[]);

  let timesToDisplay = $derived(
    filter === "fardu"
      ? fardhuTimes
      : filter === "sunnah"
        ? sunnahTimesFilter
        : allTimes
  );

  let hasAnyNotificationEnabled = $derived(Object.values(preferences).some(
    (p: any) => p?.enabled,
  ));

  let isFriday = $derived(currentTime.getDay() === 5);
  let showJumaat = $derived(settings.showJumaat !== false);

  const getPrayerDisplayName = (key: PrayerKey) => {
    if (key === "dhuhr" && isFriday && showJumaat) {
      return t("jumaat" as any);
    }
    return t(key as any);
  };

  const formatTime = (key: PrayerKey) => {
    if (!mergedData[key as keyof typeof mergedData]) return "--:--";
    let pTime = parse(mergedData[key as keyof typeof mergedData], "HH:mm:ss", startOfDay(currentTime));
    if (isNaN(pTime.getTime())) {
      pTime = parse(mergedData[key as keyof typeof mergedData], "HH:mm", startOfDay(currentTime));
    }
    const pref = (preferences as any)[key];
    if (pref && pref.offset)
      pTime = new Date(pTime.getTime() + pref.offset * 60000);
    if (key === "asr" && settings.mazhab === "hanafi")
      pTime = new Date(pTime.getTime() + 45 * 60000);

    return format(pTime, settings.timeFormat === "12h" ? "hh:mm a" : "HH:mm");
  };

  const formatIqamahTime = (key: PrayerKey, iqamahOffset: number) => {
    if (!mergedData[key as keyof typeof mergedData]) return "--:--";
    let pTime = parse(mergedData[key as keyof typeof mergedData], "HH:mm:ss", startOfDay(currentTime));
    if (isNaN(pTime.getTime())) {
      pTime = parse(mergedData[key as keyof typeof mergedData], "HH:mm", startOfDay(currentTime));
    }
    const pref = (preferences as any)[key];
    if (pref && pref.offset)
      pTime = new Date(pTime.getTime() + pref.offset * 60000);
    if (key === "asr" && settings.mazhab === "hanafi")
      pTime = new Date(pTime.getTime() + 45 * 60000);

    pTime = new Date(pTime.getTime() + iqamahOffset * 60000);
    return format(pTime, settings.timeFormat === "12h" ? "hh:mm a" : "HH:mm");
  };
</script>

{#if !todayData}
  <div class="flex-1 w-full flex flex-col min-h-0 animate-pulse mt-2">
    <div class="flex justify-between items-center mb-1 lg:mb-2 pl-3 pr-1 shrink-0 h-[40px]">
      <div class="w-32 h-8 bg-[var(--md-sys-color-surface-variant)]/50 rounded-xl"></div>
      <div class="w-10 h-10 bg-[var(--md-sys-color-surface-variant)]/50 rounded-[1rem]"></div>
    </div>

    <div class="flex px-1 sm:px-2 gap-2 mb-2 lg:mb-3 pt-1 shrink-0">
      <div class="w-16 h-8 bg-[var(--md-sys-color-surface-variant)]/50 rounded-full"></div>
      <div class="w-20 h-8 bg-[var(--md-sys-color-surface-variant)]/30 rounded-full"></div>
      <div class="w-20 h-8 bg-[var(--md-sys-color-surface-variant)]/30 rounded-full"></div>
    </div>

    <div class="flex flex-col gap-1.5 sm:gap-2 flex-1 justify-start px-1 sm:px-2 pb-2 lg:pb-0 min-h-0 overflow-y-auto no-scrollbar">
      {#each [1, 2, 3, 4, 5, 6] as i (i)}
        <div class="flex-1 min-h-[50px] lg:min-h-[60px] bg-[var(--md-sys-color-surface-container-low)] rounded-[32px] w-full"></div>
      {/each}
    </div>
  </div>
{:else}
  <div class="flex-1 w-full flex flex-col min-h-0">
    <div class="flex justify-between items-center mb-1 lg:mb-2 pl-3 pr-1 shrink-0">
      <h3 class="md3-headline-small font-black tracking-[-0.04em] text-[var(--md-sys-color-primary)] opacity-90 drop-shadow-sm">
        {t("schedule")}
      </h3>
      <div class="flex items-center gap-1">
        <div class="inline-flex mt-1 w-10 h-10 lg:w-[44px] lg:h-[44px] hover:scale-105 active:scale-95 transition-transform">
          <md-icon-button
            onclick={onShareClick}
            title={t("share" as any) || "Share"}
            style="width: 100%; height: 100%;"
          >
            <Share2 size={18} class={cn(
              visualStyle === 'retro' && "stroke-[3]",
              visualStyle === 'glass' && "stroke-[1.5]",
              visualStyle === 'soft' && "stroke-[1.5]",
              !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2]"
            )} />
          </md-icon-button>
        </div>
        <div class="inline-flex rotate-3 mt-1 w-10 h-10 lg:w-[48px] lg:h-[48px] hover:scale-105 active:scale-95 transition-transform">
          <md-filled-tonal-icon-button
            onclick={onSettingsClick}
            title={t("settings")}
            style="--md-filled-tonal-icon-button-container-shape: 20px; width: 100%; height: 100%;"
          >
            <Settings size={20} class={cn(
              visualStyle === 'retro' && "stroke-[3]",
              visualStyle === 'glass' && "stroke-[1.5]",
              visualStyle === 'soft' && "stroke-[1.5]",
              !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.5]"
            )} />
          </md-filled-tonal-icon-button>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mb-2 lg:mb-3 px-2 overflow-x-auto no-scrollbar pt-1 pb-1 shrink-0">
      {#each ["all", "fardu", "sunnah"] as f}
        {@const isSelected = filter === f}
        <div class="inline-flex shrink-0 hover:scale-[1.04] active:scale-[0.96] transition-transform">
          <md-filter-chip
            selected={isSelected ? true : undefined}
            label={
              f === "all"
                ? t("filterAll" as any)
                : f === "fardu"
                  ? t("filterFardu" as any)
                  : t("filterSunat" as any)
            }
            onclick={() => filter = f as any}
          ></md-filter-chip>
        </div>
      {/each}
    </div>

    {#if hasAnyNotificationEnabled && notificationPermission === "denied"}
      <div
        in:fly={{ y: -8, duration: 180 }}
        class="mb-4 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] p-5 rounded-[1.5rem] text-sm font-black shadow-sm origin-top"
      >
        {t("blockedNotificationsDesc")}
      </div>
    {/if}

    <div class="flex flex-col gap-1.5 sm:gap-2 flex-1 justify-start px-1 sm:px-2 pb-2 lg:pb-0 min-h-0 overflow-y-auto no-scrollbar">
      {#each timesToDisplay as key, index (key)}
        {@const isNext = key === nextPrayerKey}
        {@const isCurrent = key === currentPrayerKey}
        {@const isFardhu = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(key)}
        {@const timeLabel = formatTime(key)}
        {@const Icon = PRAYER_ICONS[key] || Bell}
        {@const pref = (preferences as any)[key] || {
          enabled: false,
          preAlert: 0,
          sound: "default",
          offset: 0,
        }}
        {@const shapeClasses = isNext ? "rounded-[32px] sm:rounded-[40px]" : isCurrent ? "rounded-[28px] sm:rounded-[36px]" : "rounded-[24px] sm:rounded-[32px]"}

        <div
          in:fly={{ x: -20, duration: 400, delay: index * 40 }}
          class={cn(
            "group relative overflow-hidden flex items-center justify-between min-h-0 hover:scale-[0.98] active:scale-[0.96] transition-transform",
            shapeClasses,
            isNext
              ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] shadow-md px-[var(--sys-spacing-edge)] py-3 sm:py-4 z-20 flex-[1.05] min-h-[64px] lg:min-h-[76px] shrink-0"
              : isCurrent
                ? "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] shadow-sm px-[var(--sys-spacing-edge)] py-3 sm:py-3.5 z-10 flex-[1.02] min-h-[60px] lg:min-h-[70px] shrink-0"
                : isFardhu
                  ? "bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] px-[var(--sys-spacing-edge)] py-2.5 sm:py-3 shadow-sm flex-1 min-h-[56px] lg:min-h-[64px] shrink-0"
                  : "bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface-variant)] px-[var(--sys-spacing-edge)] py-2.5 sm:py-3 flex-1 min-h-[56px] lg:min-h-[64px] shrink-0",
            visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[3px_3px_0px_0px_var(--md-sys-color-on-surface)]",
            visualStyle === 'glass' && "backdrop-blur-[8px] border border-[var(--glass-border)]",
            visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
          )}
        >
          <md-ripple></md-ripple>
          <md-elevation level={isNext ? "2" : isCurrent ? "1" : "0"}></md-elevation>
          <div class="flex items-center gap-2 sm:gap-3 z-10 h-full pl-0.5 sm:pl-1">
            <div
              class={cn(
                "w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-110",
                isNext ? "rotate-12 hover:rotate-[15deg]" : isCurrent ? "-rotate-12 hover:-rotate-[15deg]" : "",
                isNext
                  ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md w-10 h-10 sm:w-12 sm:h-12"
                  : isCurrent
                    ? "bg-[var(--md-sys-color-tertiary)]/20 text-[var(--md-sys-color-on-tertiary-container)] ring-1 ring-[var(--md-sys-color-tertiary)]/20"
                    : isFardhu
                      ? "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-secondary)]"
                      : "bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]",
              )}
            >
              <Icon
                size={isNext || isCurrent ? 18 : 16}
                class={cn(
                  isNext || isCurrent
                    ? "sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                    : "w-4 h-4 sm:w-[18px] sm:h-[18px]",
                  visualStyle === 'retro' && "stroke-[3]",
                  (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]"
                )}
                strokeWidth={isNext ? 2.5 : 2}
              />
            </div>
            <div class="flex flex-col justify-center">
              <div class="flex items-center gap-1.5 sm:gap-2">
                <span
                  class={cn(
                    "font-black tracking-tight",
                    isNext
                      ? "text-4xl sm:text-5xl lg:text-6xl drop-shadow-sm font-black"
                      : isCurrent
                        ? "text-3xl sm:text-4xl lg:text-5xl font-black"
                        : "text-2xl sm:text-3xl lg:text-4xl lg:leading-tight font-bold",
                  )}
                >
                  {getPrayerDisplayName(key)}
                </span>
                {#if !isFardhu && !isNext && !isCurrent}
                  <span class="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-surface)] text-[10px] font-black uppercase tracking-widest opacity-70">
                    {t("filterSunat" as any)}
                  </span>
                {/if}
              </div>
              {#if isNext}
                <span class="text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-[0.15em] opacity-80 mt-0.5 max-w-fit border-b-[2px] border-[var(--md-sys-color-primary)]/20 pb-0.5">
                  {t("nextPrayer")}
                </span>
              {/if}
              {#if isCurrent}
                <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-tertiary)] mt-1 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--md-sys-color-tertiary)] animate-pulse"></span>
                  {t("currentPrayer")}
                </span>
              {/if}
            </div>
          </div>

          <div class="z-10 ml-auto flex items-center gap-2 sm:gap-4 pr-1 sm:pr-2">
            <div class="flex flex-col items-end">
              <span
                class={cn(
                  "font-black tracking-[-0.04em] tabular-nums whitespace-nowrap",
                  isNext
                    ? "text-4xl sm:text-5xl lg:text-6xl text-[var(--md-sys-color-primary)] font-black"
                    : isCurrent
                      ? "text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--md-sys-color-on-tertiary-container)]"
                      : "text-2xl sm:text-3xl lg:text-4xl lg:leading-tight font-bold",
                )}
              >
                {timeLabel}
              </span>
              {#if settings.showIqamah && isFardhu && pref.iqamahOffset !== undefined}
                <span
                  class={cn(
                    "text-[9px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-wider block text-right mt-0.5",
                    isNext
                      ? "text-[var(--md-sys-color-primary)]/70"
                      : isCurrent
                        ? "text-[var(--md-sys-color-on-tertiary-container)]/70"
                        : "text-[var(--md-sys-color-on-surface-variant)]/70",
                  )}
                >
                  {t("iqamah")}: {formatIqamahTime(key, pref.iqamahOffset)}
                </span>
              {/if}
              {#if pref.preAlert > 0 && pref.enabled}
                <span
                  class={cn(
                    "text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-wider opacity-60 block text-right",
                    settings.showIqamah && isFardhu && pref.iqamahOffset !== undefined
                      ? "mt-0.5"
                      : "mt-0.5",
                  )}
                >
                  -{pref.preAlert}
                  {t("minutesShort")} {t("alert")}
                </span>
              {/if}
            </div>

            <md-icon-button
              onclick={() => onTogglePreference(key as any)}
              class={cn(
                "flex items-center justify-center shrink-0",
                pref.enabled &&
                  "text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10",
              )}
            >
              {#if pref.enabled}
                <BellRing size={18} />
              {:else}
                <BellOff size={18} class="opacity-40" />
              {/if}
            </md-icon-button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}