<script lang="ts">
  import { format, differenceInSeconds } from "date-fns";
  import { fade, fly } from "svelte/transition";
  import {
    Tv, 
    MapPin, 
    Calendar, 
    Maximize2, 
    Minimize2,
    BookOpen,
    X,
    AlertCircle,
    Play,
    Pause,
    Plus,
    Minus,
    Settings
  } from "lucide-svelte";
  import type { PrayerData, GeneralSettings, TvModeReminder } from "../types";
  import { cn } from "../lib/utils";
  import { getHijriFormatted } from "../lib/holidays";
  import { getMosqueLogoBlob, getAssetBlob } from "../lib/db";
  import TvModeReminderCard from "./TvModeReminderCard.svelte";
  import WeatherWidget from "./WeatherWidget.svelte";

  let {
    currentTime,
    todayData,
    nextPrayerName,
    nextPrayerTime,
    prevPrayerName,
    prevPrayerTime,
    selectedZone,
    currentLocationName,
    t,
    settings,
    onClose,
    iqamahCountdownActive,
    iqamahRemainingSeconds,
    iqamahTotalSeconds,
    activeWallpaperUrl = null,
    computedWallpaperDim = 0.4,
    userCoords = null,
    iqamahPaused,
    onIqamahTogglePause,
    onIqamahAddMinute,
    onIqamahSubMinute,
    onSettingsClick
  } = $props<{
    currentTime: Date;
    todayData: PrayerData | null;
    nextPrayerName: string | null;
    nextPrayerTime: Date | null;
    prevPrayerName: string | null;
    prevPrayerTime: Date | null;
    selectedZone: string;
    currentLocationName: string | null;
    t: (key: any) => string;
    settings: GeneralSettings;
    onClose: () => void;
    iqamahCountdownActive: boolean;
    iqamahRemainingSeconds: number;
    iqamahTotalSeconds: number;
    activeWallpaperUrl?: string | null;
    computedWallpaperDim?: number;
    userCoords?: { lat: number; lng: number } | null;
    iqamahPaused: boolean;
    onIqamahTogglePause: () => void;
    onIqamahAddMinute: () => void;
    onIqamahSubMinute: () => void;
    onSettingsClick?: () => void;
  }>();

  let isFullscreen = $state(false);
  let isWakeLockSupported = $state(false);
  let isWakeLockActive = $state(false);
  let showEscToast = $state(true);
  let isMobile = $state(false);
  let isPortrait = $state(false);
  let logoUrl = $state<string | null>(null);
  let pixelShift = $state({ x: 0, y: 0 });

  let hudMessage = $state<string | null>(null);
  let hudIcon = $state<'play' | 'pause' | 'plus' | 'minus' | null>(null);

  function showHud(msg: string, icon: 'play' | 'pause' | 'plus' | 'minus') {
    hudMessage = msg;
    hudIcon = icon;
  }

  $effect(() => {
    const interval = setInterval(() => {
      const dx = Math.floor(Math.random() * 7) - 3;
      const dy = Math.floor(Math.random() * 7) - 3;
      pixelShift = { x: dx, y: dy };
    }, 120000);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (hudMessage) {
      const timer = setTimeout(() => {
        hudMessage = null;
        hudIcon = null;
      }, 1500);
      return () => clearTimeout(timer);
    }
  });

  $effect(() => {
    let active = true;
    if (settings.mosqueLogoEnabled) {
      if (settings.mosqueLogoUrl) {
        logoUrl = settings.mosqueLogoUrl;
      } else {
        getMosqueLogoBlob().then((blob) => {
          if (blob && active) {
            const url = URL.createObjectURL(blob);
            logoUrl = url;
          }
        });
      }
    } else {
      logoUrl = null;
    }
    return () => {
      active = false;
    };
  });

  $effect(() => {
    const checkSize = () => {
      isMobile = window.innerWidth < 768;
      isPortrait = window.innerHeight > window.innerWidth;
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  });

  $effect(() => {
    const timer = setTimeout(() => {
      showEscToast = false;
    }, 5000);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    let wakeLock: any = null;
    let active = true;
    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) {
        isWakeLockSupported = false;
        isWakeLockActive = false;
        return;
      }
      isWakeLockSupported = true;
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        if (active) isWakeLockActive = true;
        wakeLock.addEventListener("release", () => {
          if (active) isWakeLockActive = false;
        });
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
        if (active) isWakeLockActive = false;
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          isWakeLockActive = false;
        });
      }
    };
  });

  $effect(() => {
    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  });

  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const key = e.key.toLowerCase();
      
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (key === " " || key === "k") {
        e.preventDefault();
        onIqamahTogglePause();
        const willBePaused = !iqamahPaused;
        showHud(
          willBePaused ? t("hudIqamahPaused") : t("hudIqamahResumed"),
          willBePaused ? 'pause' : 'play'
        );
      } else if (key === "+" || key === "=" || key === "arrowup") {
        e.preventDefault();
        onIqamahAddMinute();
        showHud(t("hudIqamahAdd"), 'plus');
      } else if (key === "-" || key === "arrowdown") {
        e.preventDefault();
        onIqamahSubMinute();
        showHud(t("hudIqamahSub"), 'minus');
      } else if (key === "s" || e.key === "Enter") {
        e.preventDefault();
        if (onSettingsClick) {
          onSettingsClick();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  const isMalay = $derived(settings.language === "ms");
  const showCenterWidget = $derived(settings.tvModeCenterWidget && settings.tvModeCenterWidget !== 'none');
  const clockScale = $derived(settings.tvModeClockScale ?? 1);
  const scheduleScale = $derived(settings.tvModeScheduleScale ?? 1);
  const showWeather = $derived(settings.tvModeShowWeather !== false);
  const showCountdown = $derived(settings.tvModeShowCountdown !== false);
  const showDateBar = $derived(settings.tvModeShowDateBar !== false);
  const colonBlink = $derived(settings.tvModeClockColonBlink !== false);

  const hasHideSeconds = $derived(settings.tvModeHideSeconds === true);
  const timeFormatString = $derived(settings.timeFormat === "12h" 
    ? (hasHideSeconds ? "h:mm" : "h:mm:ss") 
    : (hasHideSeconds ? "HH:mm" : "HH:mm:ss"));
  const timeString = $derived(format(currentTime, timeFormatString));
  const ampm = $derived(settings.timeFormat === "12h" ? format(currentTime, "a") : "");
  const dateString = $derived(format(currentTime, isMalay ? "EEEE, d MMMM yyyy" : "EEEE, MMMM d, yyyy"));

  const hijriString = $derived((() => {
    if (!todayData) return "";
    return getHijriFormatted(
      todayData.date,
      settings.hijriMethod,
      settings.hijriAdjustment,
      "text",
      settings.language as any,
      todayData.hijri
    ).split(" (")[0];
  })());

  const countdownString = $derived((() => {
    if (!nextPrayerTime) return "";
    const diff = differenceInSeconds(nextPrayerTime, currentTime);
    if (diff <= 0) return "00:00:00";
    
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })());

  const announcements = $derived((() => {
    if (settings.tvModeCustomReminders && settings.tvModeCustomReminders.trim()) {
      const custom = settings.tvModeCustomReminders
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      if (custom.length > 0) return custom;
    }

    return isMalay 
      ? [
          "Sila luruskan saff dan rapatkan barisan sebelum memulakan solat berjemaah.",
          "Matikan atau senyapkan telefon bimbit anda untuk menjaga kekhusyukan masjid.",
          "Pahala solat berjemaah melebihi solat bersendirian sebanyak dua puluh tujuh darjah. (HR Bukhari & Muslim)",
          "Saff pertama adalah saff yang terbaik bagi golongan lelaki.",
          "Bersedekah di pagi hari mendatangkan keberkatan dan melapangkan rezeki.",
        ]
      : [
          "Please straighten the rows and close the gaps before beginning the congregational prayer.",
          "Kindly silence or turn off your mobile devices to maintain tranquility.",
          "Congregational prayer is 27 times better than praying alone. (Bukhari & Muslim)",
          "The best of rows for men are the front rows.",
          "Charity in the morning brings blessings and increases provision.",
        ];
  })());

  let currentAnnouncementIdx = $state(0);

  $effect(() => {
    if (currentAnnouncementIdx >= announcements.length) {
      currentAnnouncementIdx = 0;
    }
  });

  const activeKeys = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

  function getRawTime(key: string) {
    return todayData ? (todayData as any)[key] : "--:--";
  }

  function formatPrayerTime(rawTime: string) {
    if (!rawTime || rawTime === "--:--") return "--:--";
    try {
      const [hStr, mStr] = rawTime.split(":");
      const hr = parseInt(hStr, 10);
      if (settings.timeFormat === "12h") {
        const period = hr >= 12 ? "PM" : "AM";
        const displayHr = hr % 12 === 0 ? 12 : hr % 12;
        return `${String(displayHr).padStart(2, "0")}:${mStr} ${period}`;
      }
      return `${hStr}:${mStr}`;
    } catch {
      return rawTime;
    }
  }

  function getPrayerDisplayLabel(key: string) {
    const isFriday = currentTime.getDay() === 5;
    const showJumaat = settings.showJumaat !== false;
    if (key === "dhuhr" && isFriday && showJumaat) {
      return isMalay ? "JUMAAT" : "JUMU'AH";
    }
    return t(key).toUpperCase();
  }

  function getIsNext(key: string) {
    return key === nextPrayerName?.toLowerCase() || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumaat") || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumu'ah");
  }

  const overlayColor = $derived(
    settings.wallpaperOverlayStyle === 'dark'
      ? '#0f172a'
      : settings.wallpaperOverlayStyle === 'light'
      ? '#ffffff'
      : 'var(--md-sys-color-background)'
  );

  // Iqamah Countdown Derived
  const iqamahProgress = $derived(iqamahRemainingSeconds / iqamahTotalSeconds);
  const iqamahStrokeDashoffset = $derived(283 * (1 - iqamahProgress));

  // Reminders Widget logic
  let reminderIdx = $state(0);
  let reminderAssetUrls = $state<Record<string, string>>({});

  const activeReminders = $derived((() => {
    const remindersList = settings.tvModeRemindersList || [];
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();

    const filtered = remindersList.filter((r: any) => {
      if (r.enabled === false) return false;
      if (r.daysOfWeek && r.daysOfWeek.length > 0) {
        if (!r.daysOfWeek.includes(currentDay)) return false;
      }
      if (r.startHour !== undefined && r.endHour !== undefined) {
        if (r.startHour <= r.endHour) {
          if (currentHour < r.startHour || currentHour > r.endHour) return false;
        } else {
          if (currentHour < r.startHour && currentHour > r.endHour) return false;
        }
      }
      if (todayData && r.startPrayer && r.startPrayer !== 'none' && r.endPrayer && r.endPrayer !== 'none') {
        const getPrayerTimeDate = (prayerName: string) => {
          let key: string = prayerName;
          if (prayerName === 'fajr') key = 'fajr';
          else if (prayerName === 'dhuhr') key = 'dhuhr';
          else if (prayerName === 'asr') key = 'asr';
          const timeStr = (todayData as any)[key];
          if (!timeStr) return null;
          const [h, m] = timeStr.split(':').map(Number);
          const d = new Date(currentTime);
          d.setHours(h, m, 0, 0);
          return d;
        };

        const start = getPrayerTimeDate(r.startPrayer);
        const end = getPrayerTimeDate(r.endPrayer);
        if (start && end) {
          const cTime = currentTime;
          if (start.getTime() <= end.getTime()) {
            if (cTime.getTime() < start.getTime() || cTime.getTime() > end.getTime()) return false;
          } else {
            if (cTime.getTime() < start.getTime() && cTime.getTime() > end.getTime()) return false;
          }
        }
      }
      return true;
    });

    if (filtered.length > 0) return filtered;

    return [
      {
        id: "d1",
        type: "hadith" as const,
        text: isMalay 
          ? "Pahala solat berjemaah melebihi solat bersendirian sebanyak dua puluh tujuh darjah."
          : "Congregational prayer is 27 times better than praying alone.",
        title: "HR. Bukhari & Muslim"
      },
      {
        id: "d2",
        type: "quran" as const,
        text: isMalay
          ? "Dan dirikanlah solat, tunaikanlah zakat dan rukuklah beserta orang-orang yang rukuk."
          : "And establish prayer and give zakah and bow with those who bow [in worship and obedience].",
        title: "Surah Al-Baqarah: 43"
      }
    ];
  })());

  $effect(() => {
    let active = true;
    const loadAssets = async () => {
      const list = activeReminders;
      const urls: Record<string, string> = {};
      for (const r of list) {
        const images = r.images || [];
        for (const img of images) {
          if (img.isUploaded && img.assetKey) {
            try {
              const blob = await getAssetBlob(img.assetKey);
              if (blob) {
                urls[img.assetKey] = URL.createObjectURL(blob);
              }
            } catch (err) {
              console.error(`Failed to load asset for key ${img.assetKey}:`, err);
            }
          }
        }
      }
      if (active) {
        Object.values(reminderAssetUrls).forEach(url => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        });
        reminderAssetUrls = urls;
      }
    };
    loadAssets();
    return () => {
      active = false;
      Object.values(reminderAssetUrls).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
    };
  });

  $effect(() => {
    if (reminderIdx >= activeReminders.length) {
      reminderIdx = 0;
    }
  });

  $effect(() => {
    if (activeReminders.length <= 1) return;
    const currentReminder = activeReminders[reminderIdx] || activeReminders[0];
    const slideDuration = (currentReminder?.duration ?? (settings.tvModeReminderInterval ?? 15)) * 1000;
    const timer = setTimeout(() => {
      reminderIdx = (reminderIdx + 1) % activeReminders.length;
    }, slideDuration);
    return () => clearTimeout(timer);
  });

  // Slideshow Widget Logic
  let slideshowIdx = $state(0);
  const slideshowUrls = $derived(settings.tvModeSlideshowUrls || "");
  const slideshowParsedUrls = $derived((() => {
    if (!slideshowUrls || !slideshowUrls.trim()) return [];
    return slideshowUrls
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith("http"));
  })());

  $effect(() => {
    if (slideshowIdx >= slideshowParsedUrls.length) {
      slideshowIdx = 0;
    }
  });

  $effect(() => {
    if (slideshowParsedUrls.length <= 1) return;
    const interval = (settings.tvModeSlideshowInterval ?? 15) * 1000;
    const timer = setInterval(() => {
      slideshowIdx = (slideshowIdx + 1) % slideshowParsedUrls.length;
    }, interval);
    return () => clearInterval(timer);
  });

  // Camera Widget Logic
  let cameraStream = $state<MediaStream | null>(null);
  let cameraError = $state<string | null>(null);
  let cameraVideoRef = $state<HTMLVideoElement | null>(null);

  $effect(() => {
    if (settings.tvModeCenterWidget === 'camera') {
      let activeStream: MediaStream | null = null;
      let isActive = true;
      const startCamera = async () => {
        cameraError = null;
        try {
          const deviceId = settings.tvModeCameraDeviceId || "";
          const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false,
          };
          const active = await navigator.mediaDevices.getUserMedia(constraints);
          if (!isActive) {
            active.getTracks().forEach(t => t.stop());
            return;
          }
          activeStream = active;
          cameraStream = active;
        } catch (err: any) {
          if (isActive) {
            console.error("Failed to start camera:", err);
            cameraError = err.message || String(err);
          }
        }
      };
      startCamera();
      return () => {
        isActive = false;
        if (activeStream) {
          activeStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  });

  $effect(() => {
    if (cameraVideoRef && cameraStream) {
      cameraVideoRef.srcObject = cameraStream;
    }
  });
</script>

<style>
  @keyframes ticker-slide {
    from { left: 100%; transform: translateX(0); }
    to { left: 0; transform: translateX(-100%); }
  }
  .animate-ticker {
    position: absolute;
    animation: ticker-slide var(--duration) linear forwards;
    white-space: nowrap;
  }
</style>

{#snippet iqamahCountdownSnippet()}
  <div class={cn(
    "bg-[var(--md-sys-color-surface-container)] rounded-[32px] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl border transition-all duration-500 active-pulse w-full max-w-sm mx-auto shrink-0",
    iqamahRemainingSeconds <= 60
      ? "border-[var(--md-sys-color-error)]/40 bg-gradient-to-br from-[var(--md-sys-color-error-container)]/10 via-[var(--md-sys-color-surface-container)] to-[var(--md-sys-color-error-container)]/5"
      : "border-[var(--md-sys-color-outline-variant)]/20"
  )}>
    <div class="absolute inset-0 bg-[var(--md-sys-color-primary)]/5 blur-[80px] rounded-full pointer-events-none z-0"></div>
    
    <div class="relative w-48 h-48 flex items-center justify-center z-10">
      <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle 
          class="text-[var(--md-sys-color-outline-variant)]/20 stroke-current" 
          cx="50" cy="50" fill="transparent" r="45" stroke-width="5"
        />
        <circle 
          class={cn(
            "progress-ring-circle stroke-current",
            iqamahRemainingSeconds <= 60 ? "text-[var(--md-sys-color-error)]" : "text-[var(--md-sys-color-primary)]"
          )}
          cx="50" cy="50" fill="transparent" r="45" 
          stroke-linecap="round" stroke-width="5" stroke-dasharray="283" 
          stroke-dashoffset={iqamahStrokeDashoffset} 
          style="filter: drop-shadow(0 0 8px {iqamahRemainingSeconds <= 60 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)'})"
        />
      </svg>
      
      <div class="flex flex-col items-center text-center z-20 px-4">
        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--md-sys-color-on-surface-variant)] mb-1">
          {nextPrayerName ? `${nextPrayerName} iqamah` : (isMalay ? "IQAMAH" : "IQAMAH")}
        </span>
        <span class={cn(
          "font-sans text-4xl font-black tracking-tight tabular-nums drop-shadow-md transition-colors duration-300",
          iqamahRemainingSeconds <= 60 ? "text-[var(--md-sys-color-error)] animate-pulse" : "text-[var(--md-sys-color-on-surface)]"
        )}>
          {Math.floor(iqamahRemainingSeconds / 60)}:{String(iqamahRemainingSeconds % 60).padStart(2, "0")}
        </span>
        {#if iqamahPaused}
          <span class="text-[8px] font-bold text-amber-500 uppercase tracking-wider mt-1 animate-pulse">
            {isMalay ? "DITANGGUH" : "PAUSED"}
          </span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-4 mt-5 z-20 relative">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onIqamahSubMinute(); }}
        class="w-9 h-9 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/20 transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-sm"
        title="-1 Min"
      >
        <Minus size={16} class="stroke-[2.5]" />
      </button>

      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onIqamahTogglePause(); }}
        class={cn(
          "w-11 h-11 rounded-full transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-md hover:shadow-lg",
          iqamahRemainingSeconds <= 60
            ? "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]"
            : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
        )}
        title={iqamahPaused ? "Resume" : "Pause"}
      >
        {#if iqamahPaused}
          <Play size={18} class="fill-current ml-0.5" />
        {:else}
          <Pause size={18} class="fill-current" />
        {/if}
      </button>

      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); onIqamahAddMinute(); }}
        class="w-9 h-9 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/20 transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-sm"
        title="+1 Min"
      >
        <Plus size={16} class="stroke-[2.5]" />
      </button>
    </div>

    {#if iqamahRemainingSeconds <= 60}
      <div class="mt-4 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-error)]/10 border border-[var(--md-sys-color-error)]/20 text-center animate-pulse z-10">
        <span class="text-[9px] font-black tracking-wide text-[var(--md-sys-color-error)] uppercase">
          {isMalay ? "RAPATKAN SAF & SILENT TELEFON" : "CLOSE GAPS & SILENCE PHONES"}
        </span>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet remindersWidget()}
  {#if activeReminders.length > 0}
    <div class="flex-1 flex flex-col h-full min-h-0 relative">
      {#key activeReminders[reminderIdx]?.id}
        <div class="absolute inset-0" in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
          <TvModeReminderCard
            reminder={activeReminders[reminderIdx] || activeReminders[0]}
            assetUrls={reminderAssetUrls}
            language={settings.language}
            isTvMode={true}
          />
        </div>
      {/key}
    </div>
  {/if}
{/snippet}

{#snippet slideshowWidget()}
  {#if slideshowParsedUrls.length === 0}
    <div class="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-surface-container)] rounded-[36px] border border-[var(--md-sys-color-outline)]/10 h-full space-y-3">
      <Tv size={48} class="text-[var(--md-sys-color-primary)] stroke-[1.5]" />
      <h4 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">
        {isMalay ? 'Tiada Imej Slaid' : 'No Slideshow Images'}
      </h4>
      <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
        {isMalay
          ? 'Masukkan pautan URL imej poster atau banner di bahagian Tetapan untuk memaparkan slaid.'
          : 'Enter image URLs for posters or banners in the Settings to start the slideshow.'}
      </p>
    </div>
  {:else}
    <div class="flex-1 relative rounded-[36px] overflow-hidden bg-black/40 h-full w-full">
      {#key slideshowParsedUrls[slideshowIdx]}
        <img
          in:fade={{ duration: 600 }}
          out:fade={{ duration: 600 }}
          src={slideshowParsedUrls[slideshowIdx]}
          alt="Slide {slideshowIdx + 1}"
          class="absolute inset-0 w-full h-full object-cover"
        />
      {/key}
    </div>
  {/if}
{/snippet}

{#snippet cameraWidget()}
  {#if cameraError}
    <div class="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-error-container)]/10 rounded-[36px] border border-[var(--md-sys-color-error)]/30 h-full space-y-3">
      <AlertCircle size={48} class="text-[var(--md-sys-color-error)] stroke-[1.5]" />
      <h4 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">
        {isMalay ? 'Ralat Kamera' : 'Camera Error'}
      </h4>
      <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
        {isMalay
          ? 'Gagal memulakan suapan peranti kamera. Sila pastikan kebenaran diberikan dan peranti disambungkan.'
          : 'Failed to start camera stream. Please ensure permissions are granted and the device is connected.'}
      </p>
    </div>
  {:else}
    <div class="flex-1 relative rounded-[36px] overflow-hidden bg-black/80 h-full w-full flex items-center justify-center">
      <video
        bind:this={cameraVideoRef}
        autoplay
        playsinline
        muted
        class="w-full h-full object-cover transform -scale-x-100"
      ></video>
      <div class="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-red-600/90 text-white font-black text-[10px] tracking-widest uppercase flex items-center gap-1.5 animate-pulse shadow-md pointer-events-none">
        <span class="w-2.5 h-2.5 rounded-full bg-white relative flex shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        </span>
        <span>LIVE FEED</span>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet centerWidgetRouter()}
  {#if settings.tvModeCenterWidget === 'reminders'}
    {@render remindersWidget()}
  {:else if settings.tvModeCenterWidget === 'slideshow'}
    {@render slideshowWidget()}
  {:else if settings.tvModeCenterWidget === 'camera'}
    {@render cameraWidget()}
  {/if}
{/snippet}

{#if isMobile}
  <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] select-none overflow-hidden font-sans">
    <div class="max-w-md w-full bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/15 rounded-[32px] p-8 shadow-2xl text-center space-y-6 flex flex-col items-center">
      <div class="w-16 h-16 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] flex items-center justify-center">
        <Tv size={32} class="animate-pulse" />
      </div>
      <div class="space-y-2">
        <h2 class="text-2xl font-black text-[var(--md-sys-color-on-surface)]">
          {t("mobileWarningTitle")}
        </h2>
        <p class="text-sm text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
          {t("mobileWarningDesc")}
        </p>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="px-6 py-3 w-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full font-bold shadow-lg transition-all hover:opacity-90 active:scale-95 cursor-pointer"
      >
        {t("backToDashboard")}
      </button>
    </div>
  </div>
{:else}
  <div class="fixed inset-0 z-[9999] flex flex-col bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface)] select-none overflow-hidden font-sans" style="transform: translate({pixelShift.x}px, {pixelShift.y}px);">
    {#if settings.wallpaperEnabled && activeWallpaperUrl}
      <div class="app-wallpaper-layer absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={activeWallpaperUrl}
          alt=""
          class="app-wallpaper-image"
          style="filter: blur({settings.wallpaperBlur ?? 10}px);"
        />
        {#if settings.wallpaperVignette}
          <div class="app-wallpaper-vignette"></div>
        {/if}
        <div
          class="app-wallpaper-overlay"
          style="background-color: {overlayColor}; opacity: {computedWallpaperDim ?? 0.4};"
        ></div>
      </div>
    {/if}

    <div class="absolute inset-0 islamic-pattern-overlay opacity-30 z-0 pointer-events-none"></div>

    {#if showEscToast}
      <div
        in:fly={{ y: 30, duration: 300 }}
        out:fly={{ y: 30, duration: 300 }}
        class="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-full bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] text-xs font-black shadow-2xl border border-[var(--md-sys-color-outline-variant)]/20 tracking-widest uppercase text-center cursor-default"
      >
        {isMalay ? "Tekan ESC untuk keluar" : "Press ESC to exit TV mode"}
      </div>
    {/if}

    <div class={cn(
      "relative z-10 flex items-center justify-between px-10 py-5 bg-[var(--md-sys-color-surface-container-low)]/40 backdrop-blur-xl border-b border-[var(--md-sys-color-outline-variant)]/20 shrink-0",
      settings.mosqueLogoAlignment === 'top' && "py-3"
    )}>
      <div class="flex items-center gap-6">
        <h1 class={cn(
          "text-3xl font-black tracking-tighter text-[var(--md-sys-color-primary)] flex transition-all duration-300",
          settings.mosqueLogoAlignment === 'top' ? "flex-col items-center gap-2 text-center" :
          settings.mosqueLogoAlignment === 'right' ? "flex-row-reverse items-center gap-4" :
          "flex-row items-center gap-4"
        )}>
          {#if settings.mosqueLogoEnabled && logoUrl}
            <div
              class={cn(
                "flex items-center justify-center shrink-0 overflow-hidden shadow-sm transition-all duration-300",
                settings.mosqueLogoBgMode === 'white' ? 'bg-white' :
                settings.mosqueLogoBgMode === 'theme-container' ? 'bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/10' :
                settings.mosqueLogoBgMode === 'theme-primary' ? 'bg-[var(--md-sys-color-primary)]' :
                'bg-transparent',
                settings.mosqueLogoShape === 'circle' ? 'rounded-full' :
                settings.mosqueLogoShape === 'square' ? 'rounded-none' :
                settings.mosqueLogoShape === 'rounded' ? 'rounded-2xl' :
                ''
              )}
              style="width: {settings.mosqueLogoSize ?? 48}px; height: {settings.mosqueLogoSize ?? 48}px; padding: {settings.mosqueLogoPadding ?? 0}px;"
            >
              <img
                src={logoUrl}
                alt="Mosque Logo"
                class="max-h-full max-w-full object-contain"
                style="mix-blend-mode: {settings.mosqueLogoBlendMode === 'multiply' ? 'multiply' : settings.mosqueLogoBlendMode === 'screen' ? 'screen' : 'normal'}"
                onerror={() => { logoUrl = null; }}
              />
            </div>
          {:else}
            <Tv class="w-8 h-8 text-[var(--md-sys-color-primary)] shrink-0" />
          {/if}
          <span>{settings.mosqueName || "AlurWaktu TV"}</span>
        </h1>
        <div class="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-sm font-bold border border-[var(--md-sys-color-outline-variant)]/40">
          <MapPin size={16} class="text-[var(--md-sys-color-primary)]" />
          <span class="truncate max-w-[200px]">{currentLocationName || t("selectedZone")}</span>
          <span class="font-sans font-bold text-xs opacity-60">({selectedZone})</span>
        </div>

        <div class={cn(
          "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-300",
          isWakeLockActive 
            ? "bg-[var(--md-sys-color-primary-container)]/30 text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)]/20 shadow-sm"
            : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-outline)] border-[var(--md-sys-color-outline-variant)]/40"
        )}>
          <span class={cn(
            "w-2 h-2 rounded-full relative flex shrink-0",
            isWakeLockActive ? "bg-[var(--md-sys-color-primary)]" : "bg-[var(--md-sys-color-outline)]"
          )}>
            {#if isWakeLockActive}
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
            {/if}
          </span>
          <span class="tracking-wide">
            {isWakeLockActive 
              ? (isMalay ? t("wakeLockActive") : "Screen Awake") 
              : (isMalay ? t("wakeLockInactive") : "Wake Lock Off")}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        {#if onSettingsClick}
          <button
            onclick={onSettingsClick}
            class="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        {/if}

        <button
          onclick={toggleFullscreen}
          class="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {#if isFullscreen}<Minimize2 size={20} />{:else}<Maximize2 size={20} />{/if}
        </button>

        <button
          onclick={onClose}
          class="px-6 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <X size={18} />
          <span>{isMalay ? "Keluar" : "Exit"}</span>
        </button>
      </div>
    </div>

    {#if isPortrait}
      <div class="flex-1 relative z-10 flex flex-col p-6 gap-6 min-h-0 w-full overflow-hidden">
        <div class="flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-6 px-6 shadow-2xl relative overflow-hidden group hover:border-[var(--md-sys-color-primary)]/20 transition-all" style="transform: scale({clockScale}); transform-origin: center center;">
          <div class="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0"></div>
          <div class="absolute -top-10 -right-10 w-36 h-36 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
          <div class="absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
          
          {#if showDateBar}
            <div class="flex flex-col items-center mb-2 z-10">
              <span class="text-lg sm:text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                <Calendar size={20} class="text-[var(--md-sys-color-primary)]" />
                {dateString}
              </span>
              {#if hijriString}
                <span class="text-sm sm:text-base font-bold text-[var(--md-sys-color-tertiary)] mt-1 uppercase tracking-wide">
                  {hijriString}
                </span>
              {/if}
            </div>
          {/if}

          <div class="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
            <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]")}>
              {timeString.split(":")[0]}
            </span>
            <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]", colonBlink && "tv-colon-blink")}>:</span>
            <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]")}>
              {timeString.split(":")[1]}
            </span>
            {#if !settings.tvModeHideSeconds}
              <span class="text-[clamp(2rem,5vh,3.5rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                :{timeString.split(":")[2]}
              </span>
            {/if}
            {#if ampm}
              <span class="ml-3 text-[clamp(1.2rem,3vh,2rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                {ampm}
              </span>
            {/if}
          </div>

          {#if showCountdown && nextPrayerName}
            <div class="mt-2 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-6 py-1.5 rounded-2xl w-full max-w-xs shadow-sm z-10">
              <span class="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
              </span>
              <span class="text-xl sm:text-2xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-0.5 tabular-nums">
                {countdownString}
              </span>
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-4 shrink-0">
          {#if iqamahCountdownActive}
            <div
              in:fly={{ y: 15, duration: 300 }}
              out:fly={{ y: 10, duration: 300 }}
              class="w-full max-w-xs mx-auto"
            >
              {@render iqamahCountdownSnippet()}
            </div>
          {/if}

          {#if showWeather}
            <div class="rounded-[28px] overflow-hidden shadow-md">
              <WeatherWidget {selectedZone} {userCoords} {currentLocationName} />
            </div>
          {/if}

          {#if showCenterWidget}
            <div class="h-44 flex flex-col justify-stretch items-stretch min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-4 shadow-xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
              {@render centerWidgetRouter()}
            </div>
          {:else}
            <div class="h-20 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[28px] px-5 py-3 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15">
              <div class="absolute left-4 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-1.5">
                <BookOpen size={16} class="stroke-[2.5]" />
                <span class="text-[9px] font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
              </div>
              <div class="flex-1 pl-36 overflow-hidden relative flex items-center h-full">
                {#key currentAnnouncementIdx}
                  <p
                    class="animate-ticker font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                    style="font-size: {settings.tvModeTickerSize ?? 100}%; --duration: {settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18}s;"
                    onanimationend={() => {
                      currentAnnouncementIdx = (currentAnnouncementIdx + 1) % announcements.length;
                    }}
                  >
                    {announcements[currentAnnouncementIdx]}
                  </p>
                {/key}
              </div>
            </div>
          {/if}
        </div>

        <div class="flex-1 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-5 shadow-2xl min-h-0 flex flex-col justify-between" style="transform: scale({scheduleScale}); transform-origin: center bottom;">
          <div class="flex flex-col h-full justify-between gap-2">
            {#each activeKeys as key}
              {@const rawTime = getRawTime(key)}
              {@const formattedTime = formatPrayerTime(rawTime)}
              {@const isCurrent = key === prevPrayerName}
              {@const isNext = getIsNext(key)}
              <div
                class={cn(
                  "flex items-center justify-between px-5 py-3 rounded-2xl border transition-all duration-300 relative overflow-hidden flex-1",
                  isCurrent
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-md scale-[1.01] z-10 tv-active-glow"
                    : isNext
                    ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-l-8 border-l-[var(--md-sys-color-primary)] shadow-sm"
                    : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                )}
              >
                {#if isCurrent}
                  <div class="absolute inset-0 bg-white/5 animate-pulse"></div>
                {/if}
                <div class="flex items-center gap-3 relative z-10">
                  <span class={cn("text-lg font-black tracking-tight", isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]")}>
                    {getPrayerDisplayLabel(key)}
                  </span>
                  {#if isCurrent}
                    <span class="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase tv-badge-enter">
                      {isMalay ? "SEKARANG" : "ACTIVE"}
                    </span>
                  {/if}
                  {#if isNext}
                    <span class="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                      {isMalay ? "SELEPAS INI" : "UP NEXT"}
                    </span>
                  {/if}
                </div>
                <span class={cn("font-sans text-xl tracking-tighter relative z-10 tabular-nums", isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90")}>
                  {formattedTime}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else if settings.tvModeLayout === 'bottom'}
      <div class="flex-1 relative z-10 flex flex-col justify-between p-8 gap-8 min-h-0 w-full">
        <div class="flex-1 flex flex-row items-stretch gap-8 min-h-0 w-full">
          <div class={cn("flex flex-col justify-between items-stretch gap-6 min-w-0", showCenterWidget ? "flex-[1.1]" : "flex-[2]")}>
            <div class="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-5 lg:py-8 px-6 shadow-2xl relative overflow-hidden group hover:border-[var(--md-sys-color-primary)]/20 transition-all" style="transform: scale({clockScale}); transform-origin: center center;">
              <div class="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0"></div>
              <div class="absolute -top-10 -right-10 w-36 h-36 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
              <div class="absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
              
              {#if showDateBar}
                <div class="flex flex-col items-center mb-2 z-10">
                  <span class="text-lg sm:text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                    <Calendar size={20} class="text-[var(--md-sys-color-primary)]" />
                    {dateString}
                  </span>
                  {#if hijriString}
                    <span class="text-sm sm:text-base font-bold text-[var(--md-sys-color-tertiary)] mt-1 uppercase tracking-wide">
                      {hijriString}
                    </span>
                  {/if}
                </div>
              {/if}

              <div class="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
                <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]")}>
                  {timeString.split(":")[0]}
                </span>
                <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]", colonBlink && "tv-colon-blink")}>:</span>
                <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]")}>
                  {timeString.split(":")[1]}
                </span>
                {#if !settings.tvModeHideSeconds}
                  <span class="text-[clamp(2rem,6vh,3.5rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                    :{timeString.split(":")[2]}
                  </span>
                {/if}
                {#if ampm}
                  <span class="ml-3 text-[clamp(1.2rem,3.5vh,2rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                    {ampm}
                  </span>
                {/if}
              </div>

              {#if showCountdown && nextPrayerName}
                <div class="mt-2 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-6 py-2 rounded-2xl w-full max-w-sm shadow-sm z-10">
                  <span class="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                    {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                  </span>
                  <span class="text-2xl sm:text-3xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-0.5 tabular-nums">
                    {countdownString}
                  </span>
                </div>
              {/if}
            </div>

            {#if showWeather}
              <div class="shrink-0 rounded-[32px] overflow-hidden">
                <WeatherWidget {selectedZone} {userCoords} {currentLocationName} />
              </div>
            {/if}

            {#if iqamahCountdownActive}
              <div
                in:fly={{ y: 20, duration: 300 }}
                out:fly={{ y: 15, duration: 300 }}
                class="shrink-0"
              >
                {@render iqamahCountdownSnippet()}
              </div>
            {/if}

            {#if !showCenterWidget}
              <div class="h-24 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[32px] px-6 py-4 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15 shrink-0">
                <div class="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-2">
                  <BookOpen size={18} class="stroke-[2.5]" />
                  <span class="text-[10px] font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
                </div>
                <div class="flex-1 pl-40 overflow-hidden relative flex items-center h-full">
                  {#key currentAnnouncementIdx}
                    <p
                      class="animate-ticker font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                      style="font-size: {settings.tvModeTickerSize ?? 100}%; --duration: {settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18}s;"
                      onanimationend={() => {
                        currentAnnouncementIdx = (currentAnnouncementIdx + 1) % announcements.length;
                      }}
                    >
                      {announcements[currentAnnouncementIdx]}
                    </p>
                  {/key}
                </div>
              </div>
            {/if}
          </div>

          {#if showCenterWidget}
            <div class="flex-[0.9] flex flex-col justify-stretch items-stretch min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-6 shadow-xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
              {@render centerWidgetRouter()}
            </div>
          {/if}
        </div>

        <div class="shrink-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-4 shadow-xl" style="transform: scale({scheduleScale}); transform-origin: bottom center;">
          <div class="grid grid-cols-7 gap-3 w-full">
            {#each activeKeys as key}
              {@const rawTime = getRawTime(key)}
              {@const formattedTime = formatPrayerTime(rawTime)}
              {@const isCurrent = key === prevPrayerName}
              {@const isNext = getIsNext(key)}
              <div
                class={cn(
                  "flex flex-col justify-between items-center p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden text-center min-h-[120px]",
                  isCurrent
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.03] z-10 tv-active-glow"
                    : isNext
                    ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-t-4 border-t-[var(--md-sys-color-primary)] shadow-sm"
                    : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                )}
              >
                {#if isCurrent}
                  <div class="absolute inset-0 bg-white/5 animate-pulse"></div>
                {/if}
                <div class="flex flex-col items-center gap-1.5 relative z-10">
                  <span class={cn("text-xs sm:text-sm font-black tracking-tight", isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]")}>
                    {getPrayerDisplayLabel(key)}
                  </span>
                  {#if isCurrent}
                    <span class="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase tv-badge-enter">
                      {isMalay ? "SEKARANG" : "ACTIVE"}
                    </span>
                  {/if}
                  {#if isNext}
                    <span class="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                      {isMalay ? "SELEPAS INI" : "UP NEXT"}
                    </span>
                  {/if}
                </div>
                <span class={cn("font-sans text-base sm:text-lg lg:text-xl xl:text-2xl tracking-tighter mt-3 relative z-10 tabular-nums", isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90")}>
                  {formattedTime}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="flex-1 relative z-10 flex flex-row items-stretch p-8 gap-8 min-h-0 w-full">
        <div class={cn("flex flex-col justify-between items-stretch gap-6 min-w-0", showCenterWidget ? "flex-[0.8]" : "flex-[1.2]")}>
          <div class="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-6 lg:py-10 px-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20" style="transform: scale({clockScale}); transform-origin: center center;">
            <div class="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0"></div>
            <div class="absolute -top-10 -right-10 w-44 h-44 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
            <div class="absolute -bottom-10 -left-10 w-44 h-44 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0"></div>
            
            {#if showDateBar}
              <div class="flex flex-col items-center mb-3 z-10">
                <span class="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                  <Calendar size={22} class="text-[var(--md-sys-color-primary)]" />
                  {dateString}
                </span>
                {#if hijriString}
                  <span class="text-lg sm:text-xl font-bold text-[var(--md-sys-color-tertiary)] mt-1.5 uppercase tracking-wide">
                    {hijriString}
                  </span>
                {/if}
              </div>
            {/if}

            <div class="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
              <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]")}>
                {timeString.split(":")[0]}
              </span>
              <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]", colonBlink && "tv-colon-blink")}>:</span>
              <span class={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]")}>
                {timeString.split(":")[1]}
              </span>
              {#if !settings.tvModeHideSeconds}
                <span class="text-[clamp(2.5rem,7vh,4rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                  :{timeString.split(":")[2]}
                </span>
              {/if}
              {#if ampm}
                <span class="ml-4 text-[clamp(1.5rem,4vh,2.5rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                  {ampm}
                </span>
              {/if}
            </div>

            {#if showCountdown && nextPrayerName}
              <div class="mt-4 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-8 py-3 rounded-3xl w-full max-w-md shadow-sm z-10">
                <span class="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                  {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                </span>
                <span class="text-4xl sm:text-5xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-1 tabular-nums">
                  {countdownString}
                </span>
              </div>
            {/if}
          </div>

          {#if showWeather}
            <div class="shrink-0 rounded-[32px] overflow-hidden">
              <WeatherWidget {selectedZone} {userCoords} {currentLocationName} />
            </div>
          {/if}

          {#if !showCenterWidget && iqamahCountdownActive}
            <div
              in:fly={{ y: 30, duration: 300 }}
              out:fly={{ y: 20, duration: 300 }}
              class="w-full flex justify-center shrink-0"
            >
              {@render iqamahCountdownSnippet()}
            </div>
          {/if}

          {#if !showCenterWidget}
            <div class="h-28 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[32px] p-6 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15">
              <div class="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-2">
                <BookOpen size={20} class="stroke-[2.5]" />
                <span class="text-xs font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
              </div>
              <div class="flex-1 pl-44 overflow-hidden relative flex items-center h-full">
                {#key currentAnnouncementIdx}
                  <p
                    class="animate-ticker font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                    style="font-size: {settings.tvModeTickerSize ?? 100}%; --duration: {settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18}s;"
                    onanimationend={() => {
                      currentAnnouncementIdx = (currentAnnouncementIdx + 1) % announcements.length;
                    }}
                  >
                    {announcements[currentAnnouncementIdx]}
                  </p>
                {/key}
              </div>
            </div>
          {/if}
        </div>

        {#if showCenterWidget}
          <div class="flex-[1.4] flex flex-col justify-between items-stretch gap-6 min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
            {#if iqamahCountdownActive}
              <div
                in:fly={{ y: 15, duration: 300 }}
                out:fly={{ y: 10, duration: 300 }}
                class="w-full flex justify-center shrink-0"
              >
                {@render iqamahCountdownSnippet()}
              </div>
            {/if}
            <div class="flex-1 min-h-0 flex flex-col justify-stretch items-stretch">
              {@render centerWidgetRouter()}
            </div>
          </div>
        {/if}

        <div class={cn(
          "flex flex-col justify-between items-stretch bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl min-w-0 transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20",
          showCenterWidget ? "flex-[0.8]" : "flex-[0.9]"
        )} style="transform: scale({scheduleScale}); transform-origin: center right;">
          <div class="flex flex-col h-full justify-between gap-2.5">
            {#each activeKeys as key}
              {@const rawTime = getRawTime(key)}
              {@const formattedTime = formatPrayerTime(rawTime)}
              {@const isCurrent = key === prevPrayerName}
              {@const isNext = getIsNext(key)}
              <div
                class={cn(
                  "flex items-center justify-between px-6 py-4 rounded-[24px] border transition-all duration-300 relative overflow-hidden flex-1",
                  isCurrent
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.02] z-10 tv-active-glow"
                    : isNext
                    ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-l-8 border-l-[var(--md-sys-color-primary)] shadow-sm"
                    : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                )}
              >
                {#if isCurrent}
                  <div class="absolute inset-0 bg-white/5 animate-pulse"></div>
                {/if}
                <div class="flex items-center gap-4 relative z-10">
                  <span class={cn("text-xl sm:text-2xl font-black tracking-tight", isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]")}>
                    {getPrayerDisplayLabel(key)}
                  </span>
                  {#if isCurrent}
                    <span class="px-3 py-1 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase tv-badge-enter">
                      {isMalay ? "SEKARANG" : "ACTIVE"}
                    </span>
                  {/if}
                  {#if isNext}
                    <span class="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                      {isMalay ? "SELEPAS INI" : "UP NEXT"}
                    </span>
                  {/if}
                </div>
                <span class={cn("font-sans text-2xl sm:text-3xl lg:text-4xl tracking-tighter relative z-10 tabular-nums", isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90")}>
                  {formattedTime}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if hudMessage}
      <div
        in:fly={{ y: -30, duration: 300 }}
        out:fly={{ y: -20, duration: 200 }}
        class="fixed top-28 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 bg-[var(--md-sys-color-surface-container-highest)]/80 text-[var(--md-sys-color-on-surface)] backdrop-blur-xl rounded-full px-6 py-3 border border-[var(--md-sys-color-outline-variant)]/40 shadow-xl pointer-events-none"
      >
        {#if hudIcon === 'play'}
          <Play size={20} class="text-[var(--md-sys-color-primary)] fill-current animate-pulse" />
        {/if}
        {#if hudIcon === 'pause'}
          <Pause size={20} class="text-amber-500 fill-current" />
        {/if}
        {#if hudIcon === 'plus'}
          <Plus size={20} class="text-[var(--md-sys-color-primary)] stroke-[2.5]" />
        {/if}
        {#if hudIcon === 'minus'}
          <Minus size={20} class="text-[var(--md-sys-color-error)] stroke-[2.5]" />
        {/if}
        <span class="text-xs font-black tracking-widest uppercase">{hudMessage}</span>
      </div>
    {/if}
  </div>
{/if}
