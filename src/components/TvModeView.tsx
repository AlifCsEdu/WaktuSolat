import React, { useEffect, useState, useMemo } from "react";
import { format, differenceInSeconds } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Calendar, 
  Maximize2, 
  Minimize2,
  Clock,
  Sparkles,
  Volume1,
  BookOpen,
  Heart,
  X,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Minus,
  Settings,
  Quote
} from "lucide-react";
import { PrayerData, GeneralSettings, TvModeReminder } from "../types";
import { cn } from "../lib/utils";
import { getHijriFormatted } from "../lib/holidays";
import { getMosqueLogoBlob, getAssetBlob } from "../lib/db";
import { TvModeReminderCard } from "./TvModeReminderCard";
import { WeatherWidget } from "./WeatherWidget";

interface TvModeViewProps {
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
}

export function TvModeView({
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
  activeWallpaperUrl,
  computedWallpaperDim,
  userCoords,
  iqamahPaused,
  onIqamahTogglePause,
  onIqamahAddMinute,
  onIqamahSubMinute,
  onSettingsClick,
}: TvModeViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [showEscToast, setShowEscToast] = useState(true);
  const isMalay = settings.language === "ms";
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // OLED Burn-in Prevention: Pixel Shifter
  const [pixelShift, setPixelShift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      const dx = Math.floor(Math.random() * 7) - 3; // -3px to +3px
      const dy = Math.floor(Math.random() * 7) - 3;
      setPixelShift({ x: dx, y: dy });
    }, 60000 * 2); // Shift every 2 minutes
    return () => clearInterval(interval);
  }, []);

  // TV Remote HUD Confirmation bubble
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [hudIcon, setHudIcon] = useState<'play' | 'pause' | 'plus' | 'minus' | null>(null);

  const showHud = (msg: string, icon: 'play' | 'pause' | 'plus' | 'minus') => {
    setHudMessage(msg);
    setHudIcon(icon);
  };

  useEffect(() => {
    if (hudMessage) {
      const timer = setTimeout(() => {
        setHudMessage(null);
        setHudIcon(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hudMessage]);

  useEffect(() => {
    let active = true;
    if (settings.mosqueLogoEnabled) {
      if (settings.mosqueLogoUrl) {
        setLogoUrl(settings.mosqueLogoUrl);
      } else {
        getMosqueLogoBlob().then((blob) => {
          if (blob && active) {
            const url = URL.createObjectURL(blob);
            setLogoUrl(url);
          }
        });
      }
    } else {
      setLogoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [settings.mosqueLogoEnabled, settings.mosqueLogoUrl, settings.mosqueLogoLastUpdated]);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const showCenterWidget = settings.tvModeCenterWidget && settings.tvModeCenterWidget !== 'none';
  const clockScale = settings.tvModeClockScale ?? 1;
  const scheduleScale = settings.tvModeScheduleScale ?? 1;
  const showWeather = settings.tvModeShowWeather !== false;
  const showCountdown = settings.tvModeShowCountdown !== false;
  const showDateBar = settings.tvModeShowDateBar !== false;
  const colonBlink = settings.tvModeClockColonBlink !== false;

  // Hide the ESC toast after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEscToast(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Screen Wake Lock API Integration
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) {
        setIsWakeLockSupported(false);
        setIsWakeLockActive(false);
        return;
      }
      setIsWakeLockSupported(true);
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        setIsWakeLockActive(true);
        wakeLock.addEventListener("release", () => {
          setIsWakeLockActive(false);
        });
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
        setIsWakeLockActive(false);
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          setIsWakeLockActive(false);
        });
      }
    };
  }, []);

  // Sync Fullscreen State with Document state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Escape key event listener to close TV Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // TV Remote keybind control listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Avoid keys when editing form inputs
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (key === " " || key === "k") {
        e.preventDefault();
        onIqamahTogglePause();
        const willBePaused = !iqamahPaused;
        showHud(
          willBePaused ? t("hudIqamahPaused" as any) : t("hudIqamahResumed" as any),
          willBePaused ? 'pause' : 'play'
        );
      } else if (key === "+" || key === "=" || key === "arrowup") {
        e.preventDefault();
        onIqamahAddMinute();
        showHud(t("hudIqamahAdd" as any), 'plus');
      } else if (key === "-" || key === "arrowdown") {
        e.preventDefault();
        onIqamahSubMinute();
        showHud(t("hudIqamahSub" as any), 'minus');
      } else if (key === "s" || e.key === "Enter") {
        e.preventDefault();
        if (onSettingsClick) {
          onSettingsClick();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [iqamahPaused, onIqamahTogglePause, onIqamahAddMinute, onIqamahSubMinute, onSettingsClick, t]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };


  // Clock calculations
  const hasHideSeconds = settings.tvModeHideSeconds === true;
  const timeFormatString = settings.timeFormat === "12h" 
    ? (hasHideSeconds ? "h:mm" : "h:mm:ss") 
    : (hasHideSeconds ? "HH:mm" : "HH:mm:ss");
  const timeString = format(currentTime, timeFormatString);
  const ampm = settings.timeFormat === "12h" ? format(currentTime, "a") : "";
  const dateString = format(currentTime, isMalay ? "EEEE, d MMMM yyyy" : "EEEE, MMMM d, yyyy");

  const hijriString = useMemo(() => {
    if (!todayData) return "";
    return getHijriFormatted(
      todayData.date,
      settings.hijriMethod,
      settings.hijriAdjustment,
      "text",
      settings.language as any,
      todayData.hijri
    ).split(" (")[0];
  }, [todayData, settings.hijriMethod, settings.hijriAdjustment, settings.language]);

  // Next prayer countdown calculation
  const countdownString = useMemo(() => {
    if (!nextPrayerTime) return "";
    const diff = differenceInSeconds(nextPrayerTime, currentTime);
    if (diff <= 0) return "00:00:00";
    
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [nextPrayerTime, currentTime]);

  // Rotational hadith or custom reminders
  const announcements = useMemo(() => {
    if (settings.tvModeCustomReminders && settings.tvModeCustomReminders.trim()) {
      const custom = settings.tvModeCustomReminders
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
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
  }, [isMalay, settings.tvModeCustomReminders]);

  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);

  // Clamp current index if announcements list changes length
  useEffect(() => {
    if (currentAnnouncementIdx >= announcements.length) {
      setCurrentAnnouncementIdx(0);
    }
  }, [announcements, currentAnnouncementIdx]);



  const activeKeys = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

  const formatPrayerTime = (rawTime: string) => {
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
  };

  const getPrayerDisplayLabel = (key: string) => {
    const isFriday = currentTime.getDay() === 5;
    const showJumaat = settings.showJumaat !== false;
    if (key === "dhuhr" && isFriday && showJumaat) {
      return isMalay ? "JUMAAT" : "JUMU'AH";
    }
    return t(key as any).toUpperCase();
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] select-none overflow-hidden font-sans">
        <div className="max-w-md w-full bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/15 rounded-[32px] p-8 shadow-2xl text-center space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] flex items-center justify-center">
            <Tv size={32} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[var(--md-sys-color-on-surface)]">
              {t("mobileWarningTitle" as any)}
            </h2>
            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
              {t("mobileWarningDesc" as any)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 w-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full font-bold shadow-lg transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          >
            {t("backToDashboard" as any)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface)] select-none overflow-hidden font-sans" style={{ transform: `translate(${pixelShift.x}px, ${pixelShift.y}px)` }}>
      
      {/* Dynamic Wallpaper Overlay Layer */}
      {settings.wallpaperEnabled && activeWallpaperUrl && (
        <div className="app-wallpaper-layer absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={activeWallpaperUrl}
            alt=""
            className="app-wallpaper-image"
            style={{
              filter: `blur(${settings.wallpaperBlur ?? 10}px)`,
            }}
          />
          {settings.wallpaperVignette && <div className="app-wallpaper-vignette" />}
          <div
            className="app-wallpaper-overlay"
            style={{
              backgroundColor:
                settings.wallpaperOverlayStyle === 'dark'
                  ? '#0f172a'
                  : settings.wallpaperOverlayStyle === 'light'
                  ? '#ffffff'
                  : 'var(--md-sys-color-background)',
              opacity: computedWallpaperDim ?? 0.4,
            }}
          />
        </div>
      )}

      {/* Repeating Islamic geometric pattern background */}
      <div className="absolute inset-0 islamic-pattern-overlay opacity-30 z-0 pointer-events-none" />

      {/* ESC exit instruction overlay */}
      <AnimatePresence>
        {showEscToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-full bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] text-xs font-black shadow-2xl border border-[var(--md-sys-color-outline-variant)]/20 tracking-widest uppercase text-center cursor-default"
          >
            {isMalay ? "Tekan ESC untuk keluar" : "Press ESC to exit TV mode"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div className={cn(
        "relative z-10 flex items-center justify-between px-10 py-5 bg-[var(--md-sys-color-surface-container-low)]/40 backdrop-blur-xl border-b border-[var(--md-sys-color-outline-variant)]/20 shrink-0",
        settings.mosqueLogoAlignment === 'top' && "py-3"
      )}>
        <div className="flex items-center gap-6">
          <h1 className={cn(
            "text-3xl font-black tracking-tighter text-[var(--md-sys-color-primary)] flex transition-all duration-300",
            settings.mosqueLogoAlignment === 'top' ? "flex-col items-center gap-2 text-center" :
            settings.mosqueLogoAlignment === 'right' ? "flex-row-reverse items-center gap-4" :
            "flex-row items-center gap-4"
          )}>
            {settings.mosqueLogoEnabled && logoUrl ? (
              <div
                className={cn(
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
                style={{
                  width: `${settings.mosqueLogoSize ?? 48}px`,
                  height: `${settings.mosqueLogoSize ?? 48}px`,
                  padding: `${settings.mosqueLogoPadding ?? 0}px`,
                }}
              >
                <img
                  src={logoUrl}
                  alt="Mosque Logo"
                  className="max-h-full max-w-full object-contain"
                  style={{
                    mixBlendMode: settings.mosqueLogoBlendMode === 'multiply' ? 'multiply' :
                                   settings.mosqueLogoBlendMode === 'screen' ? 'screen' :
                                   'normal'
                  }}
                  onError={() => setLogoUrl(null)}
                />
              </div>
            ) : (
              <Tv className="w-8 h-8 text-[var(--md-sys-color-primary)] shrink-0" />
            )}
            <span>{settings.mosqueName || "AlurWaktu TV"}</span>
          </h1>
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-sm font-bold border border-[var(--md-sys-color-outline-variant)]/40">
            <MapPin size={16} className="text-[var(--md-sys-color-primary)]" />
            <span className="truncate max-w-[200px]">{currentLocationName || t("selectedZone")}</span>
            <span className="font-sans font-bold text-xs opacity-60">({selectedZone})</span>
          </div>

          {/* Wake Lock Active Indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-300",
            isWakeLockActive 
              ? "bg-[var(--md-sys-color-primary-container)]/30 text-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)]/20 shadow-sm"
              : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-outline)] border-[var(--md-sys-color-outline-variant)]/40"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full relative flex shrink-0",
              isWakeLockActive ? "bg-[var(--md-sys-color-primary)]" : "bg-[var(--md-sys-color-outline)]"
            )}>
              {isWakeLockActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
              )}
            </span>
            <span className="tracking-wide">
              {isWakeLockActive 
                ? (isMalay ? t("wakeLockActive" as any) : "Screen Awake") 
                : (isMalay ? t("wakeLockInactive" as any) : "Wake Lock Off")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick controls */}
          {onSettingsClick && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSettingsClick}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/50 transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings size={20} />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFullscreen}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/50 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <X size={18} />
            <span>{isMalay ? "Keluar" : "Exit"}</span>
          </motion.button>
        </div>
      </div>

      {isPortrait ? (
        /* Portrait TV Layout */
        <div className="flex-1 relative z-10 flex flex-col p-6 gap-6 min-h-0 w-full overflow-hidden">
          
          {/* Top: Clock Panel */}
          <div className="flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-6 px-6 shadow-2xl relative overflow-hidden group hover:border-[var(--md-sys-color-primary)]/20 transition-all" style={{ transform: `scale(${clockScale})`, transformOrigin: 'center center' }}>
            <div className="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0" />
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
            
            {/* Dates */}
            {showDateBar && (
              <div className="flex flex-col items-center mb-2 z-10">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                  <Calendar size={20} className="text-[var(--md-sys-color-primary)]" />
                  {dateString}
                </span>
                {hijriString && (
                  <span className="text-sm sm:text-base font-bold text-[var(--md-sys-color-tertiary)] mt-1 uppercase tracking-wide">
                    {hijriString}
                  </span>
                )}
              </div>
            )}
 
            {/* Digital Clock */}
            <div className="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
              <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]")}>
                {timeString.split(":")[0]}
              </span>
              <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]", colonBlink && "tv-colon-blink")}>:</span>
              <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4.5rem,10vh,7rem)]" : "text-[clamp(3.5rem,8vh,6rem)]")}>
                {timeString.split(":")[1]}
              </span>
              {!settings.tvModeHideSeconds && (
                <span className="text-[clamp(2rem,5vh,3.5rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                  :{timeString.split(":")[2]}
                </span>
              )}
              {ampm && (
                <span className="ml-3 text-[clamp(1.2rem,3vh,2rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                  {ampm}
                </span>
              )}
            </div>
 
            {/* Next Prayer Countdown Sub-panel */}
            {showCountdown && nextPrayerName && (
              <div className="mt-2 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-6 py-1.5 rounded-2xl w-full max-w-xs shadow-sm z-10">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                  {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                </span>
                <span className="text-xl sm:text-2xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-0.5 tabular-nums">
                  {countdownString}
                </span>
              </div>
            )}
          </div>
 
          {/* Middle: Weather Widget / Iqamah Countdown / Center Widget */}
          <div className="flex flex-col gap-4 shrink-0">
            {/* Iqamah Countdown Banner */}
            <AnimatePresence>
              {iqamahCountdownActive && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="w-full max-w-xs mx-auto"
                >
                  <TvModeIqamahCountdown
                    iqamahRemainingSeconds={iqamahRemainingSeconds}
                    iqamahTotalSeconds={iqamahTotalSeconds}
                    iqamahPaused={iqamahPaused}
                    onIqamahTogglePause={onIqamahTogglePause}
                    onIqamahAddMinute={onIqamahAddMinute}
                    onIqamahSubMinute={onIqamahSubMinute}
                    isMalay={isMalay}
                    t={t}
                    nextPrayerName={nextPrayerName}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weather Widget */}
            {showWeather && (
              <div className="rounded-[28px] overflow-hidden shadow-md">
                <WeatherWidget selectedZone={selectedZone} userCoords={userCoords} currentLocationName={currentLocationName} />
              </div>
            )}

            {/* Announcement banner or Center Widget */}
            {showCenterWidget ? (
              <div className="h-44 flex flex-col justify-stretch items-stretch min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-4 shadow-xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
                {settings.tvModeCenterWidget === 'reminders' && (
                  <TvModeRemindersWidget
                    reminders={settings.tvModeRemindersList || []}
                    interval={settings.tvModeReminderInterval ?? 15}
                    language={settings.language}
                    t={t}
                    currentTime={currentTime}
                  />
                )}
                {settings.tvModeCenterWidget === 'slideshow' && (
                  <TvModeSlideshowWidget
                    urls={settings.tvModeSlideshowUrls || ""}
                    interval={settings.tvModeSlideshowInterval ?? 15}
                    language={settings.language}
                  />
                )}
                {settings.tvModeCenterWidget === 'camera' && (
                  <TvModeCameraWidget
                    deviceId={settings.tvModeCameraDeviceId || ""}
                    language={settings.language}
                    t={t}
                  />
                )}
              </div>
            ) : (
              <div className="h-20 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[28px] px-5 py-3 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15">
                <div className="absolute left-4 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-1.5">
                  <BookOpen size={16} className="stroke-[2.5]" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
                </div>
                
                <div className="flex-1 pl-36 overflow-hidden relative flex items-center">
                  <motion.p
                    key={currentAnnouncementIdx}
                    initial={{ x: "100%" }}
                    animate={{ x: "-100%" }}
                    onAnimationComplete={() => {
                      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
                    }}
                    transition={{
                      duration: settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18,
                      ease: "linear"
                    }}
                    className="whitespace-nowrap font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                    style={{ fontSize: `${settings.tvModeTickerSize ?? 100}%` }}
                  >
                    {announcements[currentAnnouncementIdx]}
                  </motion.p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Prayer Schedule (vertical timeline-style list) */}
          <div className="flex-1 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-5 shadow-2xl min-h-0 flex flex-col justify-between" style={{ transform: `scale(${scheduleScale})`, transformOrigin: 'center bottom' }}>
            <div className="flex flex-col h-full justify-between gap-2">
              {activeKeys.map((key) => {
                const rawTime = todayData ? todayData[key as keyof PrayerData] : "--:--";
                const formattedTime = formatPrayerTime(rawTime as string);
                const isCurrent = key === prevPrayerName; // Matches active prayer
                const isNext = key === nextPrayerName?.toLowerCase() || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumaat") || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumu'ah");

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between px-5 py-3 rounded-2xl border transition-all duration-300 relative overflow-hidden flex-1",
                      isCurrent
                        ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-md scale-[1.01] z-10 tv-active-glow"
                        : isNext
                        ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-l-8 border-l-[var(--md-sys-color-primary)] shadow-sm"
                        : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                    )}
                  >
                    {isCurrent && <div className="absolute inset-0 bg-white/5 animate-pulse" />}

                    <div className="flex items-center gap-3 relative z-10">
                      <span className={cn(
                        "text-lg font-black tracking-tight",
                        isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]"
                      )}>
                        {getPrayerDisplayLabel(key)}
                      </span>
                      
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase tv-badge-enter">
                          {isMalay ? "SEKARANG" : "ACTIVE"}
                        </span>
                      )}
                      
                      {isNext && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                          {isMalay ? "SELEPAS INI" : "UP NEXT"}
                        </span>
                      )}
                    </div>
                    
                    <span className={cn(
                      "font-sans text-xl tracking-tighter relative z-10 tabular-nums",
                      isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90"
                    )}>
                      {formattedTime}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : settings.tvModeLayout === 'bottom' ? (
        /* Horizontal Bottom Schedule Layout */
        <div className="flex-1 relative z-10 flex flex-col justify-between p-8 gap-8 min-h-0 w-full">
          {/* Top grid (Clock + Widgets) */}
          <div className="flex-1 flex flex-row items-stretch gap-8 min-h-0 w-full">
            {/* Left part: Clock, Dates, Iqamah, Weather, and Announcements banner if center widget is off */}
            <div className={cn(
              "flex flex-col justify-between items-stretch gap-6 min-w-0",
              showCenterWidget ? "flex-[1.1]" : "flex-[2]"
            )}>
              {/* Clock Panel */}
              <div className="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-5 lg:py-8 px-6 shadow-2xl relative overflow-hidden group hover:border-[var(--md-sys-color-primary)]/20 transition-all" style={{ transform: `scale(${clockScale})`, transformOrigin: 'center center' }}>
                {/* Shimmer overlay */}
                <div className="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0" />
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
                
                {/* Dates */}
                {showDateBar && (
                  <div className="flex flex-col items-center mb-2 z-10">
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                      <Calendar size={20} className="text-[var(--md-sys-color-primary)]" />
                      {dateString}
                    </span>
                    {hijriString && (
                      <span className="text-sm sm:text-base font-bold text-[var(--md-sys-color-tertiary)] mt-1 uppercase tracking-wide">
                        {hijriString}
                      </span>
                    )}
                  </div>
                )}
 
                {/* Digital Clock */}
                <div className="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
                  <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]")}>
                    {timeString.split(":")[0]}
                  </span>
                  <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]", colonBlink && "tv-colon-blink")}>:</span>
                  <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(4rem,13vh,7rem)]" : "text-[clamp(3.5rem,11vh,6rem)]")}>
                    {timeString.split(":")[1]}
                  </span>
                  {!settings.tvModeHideSeconds && (
                    <span className="text-[clamp(2rem,6vh,3.5rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                      :{timeString.split(":")[2]}
                    </span>
                  )}
                  {ampm && (
                    <span className="ml-3 text-[clamp(1.2rem,3.5vh,2rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                      {ampm}
                    </span>
                  )}
                </div>
 
                {/* Next Prayer Countdown Sub-panel */}
                {showCountdown && nextPrayerName && (
                  <div className="mt-2 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-6 py-2 rounded-2xl w-full max-w-sm shadow-sm z-10">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                      {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                    </span>
                    <span className="text-2xl sm:text-3xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-0.5 tabular-nums">
                      {countdownString}
                    </span>
                  </div>
                )}
              </div>
 
              {/* Weather Widget */}
              {showWeather && (
                <div className="shrink-0 rounded-[32px] overflow-hidden">
                  <WeatherWidget selectedZone={selectedZone} userCoords={userCoords} currentLocationName={currentLocationName} />
                </div>
              )}
 
              {/* Dynamic Iqamah Countdown Banner */}
              <AnimatePresence>
                {iqamahCountdownActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.98 }}
                    className="shrink-0"
                  >
                    <TvModeIqamahCountdown
                      iqamahRemainingSeconds={iqamahRemainingSeconds}
                      iqamahTotalSeconds={iqamahTotalSeconds}
                      iqamahPaused={iqamahPaused}
                      onIqamahTogglePause={onIqamahTogglePause}
                      onIqamahAddMinute={onIqamahAddMinute}
                      onIqamahSubMinute={onIqamahSubMinute}
                      isMalay={isMalay}
                      t={t}
                      nextPrayerName={nextPrayerName}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Running announcement banner if center widget is off */}
              {!showCenterWidget && (
                <div className="h-24 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[32px] px-6 py-4 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15 shrink-0">
                  <div className="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-2">
                    <BookOpen size={18} className="stroke-[2.5]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
                  </div>
                  
                  <div className="flex-1 pl-40 overflow-hidden relative flex items-center">
                    <motion.p
                      key={currentAnnouncementIdx}
                      initial={{ x: "100%" }}
                      animate={{ x: "-100%" }}
                      onAnimationComplete={() => {
                        setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
                      }}
                      transition={{
                        duration: settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18,
                        ease: "linear"
                      }}
                      className="whitespace-nowrap font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                      style={{ fontSize: `${settings.tvModeTickerSize ?? 100}%` }}
                    >
                      {announcements[currentAnnouncementIdx]}
                    </motion.p>
                  </div>
                </div>
              )}
            </div>

            {/* Right part: Center Widget (announcements, slideshow, camera) if enabled */}
            {showCenterWidget && (
              <div className="flex-[0.9] flex flex-col justify-stretch items-stretch min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-6 shadow-xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
                {settings.tvModeCenterWidget === 'reminders' && (
                  <TvModeRemindersWidget
                    reminders={settings.tvModeRemindersList || []}
                    interval={settings.tvModeReminderInterval ?? 15}
                    language={settings.language}
                    t={t}
                    currentTime={currentTime}
                  />
                )}
                {settings.tvModeCenterWidget === 'slideshow' && (
                  <TvModeSlideshowWidget
                    urls={settings.tvModeSlideshowUrls || ""}
                    interval={settings.tvModeSlideshowInterval ?? 15}
                    language={settings.language}
                  />
                )}
                {settings.tvModeCenterWidget === 'camera' && (
                  <TvModeCameraWidget
                    deviceId={settings.tvModeCameraDeviceId || ""}
                    language={settings.language}
                    t={t}
                  />
                )}
              </div>
            )}
          </div>

          {/* Bottom horizontal schedule strip */}
          <div className="shrink-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[36px] p-4 shadow-xl" style={{ transform: `scale(${scheduleScale})`, transformOrigin: 'bottom center' }}>
            <div className="grid grid-cols-7 gap-3 w-full">
              {activeKeys.map((key) => {
                const rawTime = todayData ? todayData[key as keyof PrayerData] : "--:--";
                const formattedTime = formatPrayerTime(rawTime as string);
                const isCurrent = key === prevPrayerName; // Matches active prayer
                const isNext = key === nextPrayerName?.toLowerCase() || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumaat") || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumu'ah");

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex flex-col justify-between items-center p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden text-center min-h-[120px]",
                      isCurrent
                        ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.03] z-10 tv-active-glow"
                        : isNext
                        ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-t-4 border-t-[var(--md-sys-color-primary)] shadow-sm"
                        : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                    )}
                  >
                    {isCurrent && <div className="absolute inset-0 bg-white/5 animate-pulse" />}

                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <span className={cn(
                        "text-xs sm:text-sm font-black tracking-tight",
                        isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]"
                      )}>
                        {getPrayerDisplayLabel(key)}
                      </span>
                      
                      {/* Badges */}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase tv-badge-enter">
                          {isMalay ? "SEKARANG" : "ACTIVE"}
                        </span>
                      )}
                      {isNext && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[8px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                          {isMalay ? "SELEPAS INI" : "UP NEXT"}
                        </span>
                      )}
                    </div>
                    
                    <span className={cn(
                      "font-sans text-base sm:text-lg lg:text-xl xl:text-2xl tracking-tighter mt-3 relative z-10 tabular-nums",
                      isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90"
                    )}>
                      {formattedTime}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Vertical columns (Split Layout) */
        <div className="flex-1 relative z-10 flex flex-row items-stretch p-8 gap-8 min-h-0 w-full">
          
          {/* Left Container: Clock & Announcements */}
          <div className={cn(
            "flex flex-col justify-between items-stretch gap-6 min-w-0",
            showCenterWidget ? "flex-[0.8]" : "flex-[1.2]"
          )}>
            
            {/* Main Massive Clock Panel */}
            <div className="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] py-6 lg:py-10 px-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20" style={{ transform: `scale(${clockScale})`, transformOrigin: 'center center' }}>
              {/* Shimmer overlay & Radial glow blobs */}
              <div className="absolute inset-0 tv-shimmer-overlay pointer-events-none z-0" />
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-[var(--md-sys-color-primary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-[var(--md-sys-color-secondary-container)]/10 rounded-full blur-3xl pointer-events-none z-0" />
              
              {/* Top Info row (dates) */}
              {showDateBar && (
                <div className="flex flex-col items-center mb-3 z-10">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                    <Calendar size={22} className="text-[var(--md-sys-color-primary)]" />
                    {dateString}
                  </span>
                  {hijriString && (
                    <span className="text-lg sm:text-xl font-bold text-[var(--md-sys-color-tertiary)] mt-1.5 uppercase tracking-wide">
                      {hijriString}
                    </span>
                  )}
                </div>
              )}

              {/* Massive Ticking Digital Clock */}
              <div className="flex items-baseline justify-center select-text w-full max-w-full px-4 overflow-hidden z-10 drop-shadow-lg">
                <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]")}>
                  {timeString.split(":")[0]}
                </span>
                <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]", colonBlink && "tv-colon-blink")}>:</span>
                <span className={cn("font-sans font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)] truncate", settings.tvModeHideSeconds ? "text-[clamp(5rem,15vh,8.5rem)]" : "text-[clamp(4rem,12vh,7rem)]")}>
                  {timeString.split(":")[1]}
                </span>
                {!settings.tvModeHideSeconds && (
                  <span className="text-[clamp(2.5rem,7vh,4rem)] font-sans font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                    :{timeString.split(":")[2]}
                  </span>
                )}
                {ampm && (
                  <span className="ml-4 text-[clamp(1.5rem,4vh,2.5rem)] font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                    {ampm}
                  </span>
                )}
              </div>

              {/* Next Prayer Countdown Sub-panel */}
              {showCountdown && nextPrayerName && (
                <div className="mt-4 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-8 py-3 rounded-3xl w-full max-w-md shadow-sm z-10">
                  <span className="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                    {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                  </span>
                  <span className="text-4xl sm:text-5xl font-sans font-black text-[var(--md-sys-color-primary)] tracking-tight mt-1 tabular-nums">
                    {countdownString}
                  </span>
                </div>
              )}
            </div>

            {/* Weather Widget */}
            {showWeather && (
              <div className="shrink-0 rounded-[32px] overflow-hidden">
                <WeatherWidget selectedZone={selectedZone} userCoords={userCoords} currentLocationName={currentLocationName} />
              </div>
            )}

            {/* Dynamic Iqamah Countdown (only when Center widget is disabled) */}
            {!showCenterWidget && iqamahCountdownActive && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="w-full flex justify-center shrink-0"
                >
                  <TvModeIqamahCountdown
                    iqamahRemainingSeconds={iqamahRemainingSeconds}
                    iqamahTotalSeconds={iqamahTotalSeconds}
                    iqamahPaused={iqamahPaused}
                    onIqamahTogglePause={onIqamahTogglePause}
                    onIqamahAddMinute={onIqamahAddMinute}
                    onIqamahSubMinute={onIqamahSubMinute}
                    isMalay={isMalay}
                    t={t}
                    nextPrayerName={nextPrayerName}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Running announcement banner */}
            {!showCenterWidget && (
              <div className="h-28 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[32px] p-6 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15">
                <div className="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-2">
                  <BookOpen size={20} className="stroke-[2.5]" />
                  <span className="text-xs font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
                </div>
                
                <div className="flex-1 pl-44 overflow-hidden relative flex items-center">
                  <motion.p
                    key={currentAnnouncementIdx}
                    initial={{ x: "100%" }}
                    animate={{ x: "-100%" }}
                    onAnimationComplete={() => {
                      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
                    }}
                    transition={{
                      duration: settings.tvModeTickerSpeed === 'slow' ? 24 : settings.tvModeTickerSpeed === 'fast' ? 12 : 18,
                      ease: "linear"
                    }}
                    className="whitespace-nowrap font-bold text-[var(--md-sys-color-on-surface-variant)] tracking-wide shrink-0"
                    style={{ fontSize: `${settings.tvModeTickerSize ?? 100}%` }}
                  >
                    {announcements[currentAnnouncementIdx]}
                  </motion.p>
                </div>
              </div>
            )}
          </div>

          {/* Center Container: Active Center Widget (Reminders, Slideshow, Camera) + Optional Top Iqamah Countdown */}
          {showCenterWidget && (
            <div className="flex-[1.4] flex flex-col justify-between items-stretch gap-6 min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
              <AnimatePresence>
                {iqamahCountdownActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="w-full flex justify-center shrink-0"
                  >
                    <TvModeIqamahCountdown
                      iqamahRemainingSeconds={iqamahRemainingSeconds}
                      iqamahTotalSeconds={iqamahTotalSeconds}
                      iqamahPaused={iqamahPaused}
                      onIqamahTogglePause={onIqamahTogglePause}
                      onIqamahAddMinute={onIqamahAddMinute}
                      onIqamahSubMinute={onIqamahSubMinute}
                      isMalay={isMalay}
                      t={t}
                      nextPrayerName={nextPrayerName}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex-1 min-h-0 flex flex-col justify-stretch items-stretch">
                {settings.tvModeCenterWidget === 'reminders' && (
                  <TvModeRemindersWidget
                    reminders={settings.tvModeRemindersList || []}
                    interval={settings.tvModeReminderInterval ?? 15}
                    language={settings.language}
                    t={t}
                    currentTime={currentTime}
                  />
                )}
                {settings.tvModeCenterWidget === 'slideshow' && (
                  <TvModeSlideshowWidget
                    urls={settings.tvModeSlideshowUrls || ""}
                    interval={settings.tvModeSlideshowInterval ?? 15}
                    language={settings.language}
                  />
                )}
                {settings.tvModeCenterWidget === 'camera' && (
                  <TvModeCameraWidget
                    deviceId={settings.tvModeCameraDeviceId || ""}
                    language={settings.language}
                    t={t}
                  />
                )}
              </div>
            </div>
          )}

          {/* Right Container: Massive Prayer Schedule list */}
          <div className={cn(
            "flex flex-col justify-between items-stretch bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl min-w-0 transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20",
            showCenterWidget ? "flex-[0.8]" : "flex-[0.9]"
          )} style={{ transform: `scale(${scheduleScale})`, transformOrigin: 'center right' }}>
            <div className="flex flex-col h-full justify-between gap-2.5">
              {activeKeys.map((key) => {
                const rawTime = todayData ? todayData[key as keyof PrayerData] : "--:--";
                const formattedTime = formatPrayerTime(rawTime as string);
                const isCurrent = key === prevPrayerName; // Matches active prayer
                const isNext = key === nextPrayerName?.toLowerCase() || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumaat") || (key === "dhuhr" && nextPrayerName?.toLowerCase() === "jumu'ah");

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between px-6 py-4 rounded-[24px] border transition-all duration-300 relative overflow-hidden flex-1",
                      isCurrent
                        ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.02] z-10 tv-active-glow"
                        : isNext
                        ? "bg-[var(--md-sys-color-primary-container)]/35 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/30 border-l-8 border-l-[var(--md-sys-color-primary)] shadow-sm"
                        : "bg-[var(--md-sys-color-surface)]/40 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]/60 hover:border-[var(--md-sys-color-outline-variant)]/30"
                    )}
                  >
                    {/* Backdrop highlight flash */}
                    {isCurrent && <div className="absolute inset-0 bg-white/5 animate-pulse" />}

                    <div className="flex items-center gap-4 relative z-10">
                      <span className={cn(
                        "text-xl sm:text-2xl font-black tracking-tight",
                        isCurrent ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface)]"
                      )}>
                        {getPrayerDisplayLabel(key)}
                      </span>
                      
                      {/* Active highlight label badge */}
                      {isCurrent && (
                        <span className="px-3 py-1 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase tv-badge-enter">
                          {isMalay ? "SEKARANG" : "ACTIVE"}
                        </span>
                      )}
                      
                      {/* Next prayer highlight badge */}
                      {isNext && (
                        <span className="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase animate-pulse tv-badge-enter">
                          {isMalay ? "SELEPAS INI" : "UP NEXT"}
                        </span>
                      )}
                    </div>
                    
                    <span className={cn(
                      "font-sans text-2xl sm:text-3xl lg:text-4xl tracking-tighter relative z-10 tabular-nums",
                      isCurrent ? "font-black text-[var(--md-sys-color-on-primary)]" : "font-extrabold text-[var(--md-sys-color-on-surface)]/90"
                    )}>
                      {formattedTime}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Floating Dynamic HUD Pill Toast at top center */}
      <AnimatePresence>
        {hudMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="fixed top-28 left-1/2 z-[10000] flex items-center gap-3 bg-[var(--md-sys-color-surface-container-highest)]/80 text-[var(--md-sys-color-on-surface)] backdrop-blur-xl rounded-full px-6 py-3 border border-[var(--md-sys-color-outline-variant)]/40 shadow-xl pointer-events-none"
          >
            {hudIcon === 'play' && <Play size={20} className="text-[var(--md-sys-color-primary)] fill-current animate-pulse" />}
            {hudIcon === 'pause' && <Pause size={20} className="text-amber-500 fill-current" />}
            {hudIcon === 'plus' && <Plus size={20} className="text-[var(--md-sys-color-primary)] stroke-[2.5]" />}
            {hudIcon === 'minus' && <Minus size={20} className="text-[var(--md-sys-color-error)] stroke-[2.5]" />}
            <span className="text-xs font-black tracking-widest uppercase">{hudMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TvModeIqamahCountdownProps {
  iqamahRemainingSeconds: number;
  iqamahTotalSeconds: number;
  iqamahPaused: boolean;
  onIqamahTogglePause: () => void;
  onIqamahAddMinute: () => void;
  onIqamahSubMinute: () => void;
  isMalay: boolean;
  t: (key: any) => string;
  nextPrayerName: string | null;
}

function TvModeIqamahCountdown({
  iqamahRemainingSeconds,
  iqamahTotalSeconds,
  iqamahPaused,
  onIqamahTogglePause,
  onIqamahAddMinute,
  onIqamahSubMinute,
  isMalay,
  t,
  nextPrayerName,
}: TvModeIqamahCountdownProps) {
  const progress = iqamahRemainingSeconds / iqamahTotalSeconds;
  const strokeDashoffset = 283 * (1 - progress);

  return (
    <div className={cn(
      "bg-[var(--md-sys-color-surface-container)] rounded-[32px] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl border transition-all duration-500 active-pulse w-full max-w-sm mx-auto shrink-0",
      iqamahRemainingSeconds <= 60
        ? "border-[var(--md-sys-color-error)]/40 bg-gradient-to-br from-[var(--md-sys-color-error-container)]/10 via-[var(--md-sys-color-surface-container)] to-[var(--md-sys-color-error-container)]/5"
        : "border-[var(--md-sys-color-outline-variant)]/20"
    )}>
      {/* Radial ambient glow behind the ring */}
      <div className="absolute inset-0 bg-[var(--md-sys-color-primary)]/5 blur-[80px] rounded-full pointer-events-none z-0" />
      
      <div className="relative w-48 h-48 flex items-center justify-center z-10">
        {/* Progress Ring SVG */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle 
            className="text-[var(--md-sys-color-outline-variant)]/20 stroke-current" 
            cx="50" 
            cy="50" 
            fill="transparent" 
            r="45" 
            strokeWidth="5"
          />
          {/* Foreground progress */}
          <circle 
            className={cn(
              "progress-ring-circle stroke-current",
              iqamahRemainingSeconds <= 60 ? "text-[var(--md-sys-color-error)]" : "text-[var(--md-sys-color-primary)]"
            )}
            cx="50" 
            cy="50" 
            fill="transparent" 
            r="45" 
            strokeLinecap="round" 
            strokeWidth="5" 
            strokeDasharray="283" 
            strokeDashoffset={strokeDashoffset} 
            style={{ 
              filter: `drop-shadow(0 0 8px ${
                iqamahRemainingSeconds <= 60 
                  ? "var(--md-sys-color-error)" 
                  : "var(--md-sys-color-primary)"
              })` 
            }}
          />
        </svg>
        
        {/* Center label and timer digits */}
        <div className="flex flex-col items-center text-center z-20 px-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--md-sys-color-on-surface-variant)] mb-1">
            {nextPrayerName ? `${nextPrayerName} iqamah` : (isMalay ? "IQAMAH" : "IQAMAH")}
          </span>
          <span className={cn(
            "font-sans text-4xl font-black tracking-tight tabular-nums drop-shadow-md transition-colors duration-300",
            iqamahRemainingSeconds <= 60 ? "text-[var(--md-sys-color-error)] animate-pulse" : "text-[var(--md-sys-color-on-surface)]"
          )}>
            {Math.floor(iqamahRemainingSeconds / 60)}:
            {String(iqamahRemainingSeconds % 60).padStart(2, "0")}
          </span>
          {iqamahPaused && (
            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider mt-1 animate-pulse">
              {isMalay ? "DITANGGUH" : "PAUSED"}
            </span>
          )}
        </div>
      </div>

      {/* Control Buttons Panel */}
      <div className="flex items-center gap-4 mt-5 z-20 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIqamahSubMinute();
          }}
          className="w-9 h-9 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/20 transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-sm"
          title="-1 Min"
        >
          <Minus size={16} className="stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIqamahTogglePause();
          }}
          className={cn(
            "w-11 h-11 rounded-full transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-md hover:shadow-lg",
            iqamahRemainingSeconds <= 60
              ? "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]"
              : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
          )}
          title={iqamahPaused ? "Resume" : "Pause"}
        >
          {iqamahPaused ? (
            <Play size={18} className="fill-current ml-0.5" />
          ) : (
            <Pause size={18} className="fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIqamahAddMinute();
          }}
          className="w-9 h-9 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline-variant)]/20 transition-all flex items-center justify-center active:scale-90 cursor-pointer shadow-sm"
          title="+1 Min"
        >
          <Plus size={16} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Saff/Phone warning at bottom when under 60 seconds */}
      {iqamahRemainingSeconds <= 60 && (
        <div className="mt-4 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-error)]/10 border border-[var(--md-sys-color-error)]/20 text-center animate-pulse z-10">
          <span className="text-[9px] font-black tracking-wide text-[var(--md-sys-color-error)] uppercase">
            {isMalay ? "RAPATKAN SAF & SILENT TELEFON" : "CLOSE GAPS & SILENCE PHONES"}
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS FOR TV MODE CENTER WIDGETS
// ==========================================

interface TvModeRemindersWidgetProps {
  reminders: TvModeReminder[];
  interval: number;
  language: 'ms' | 'en';
  t: (key: any) => string;
  currentTime?: Date;
}

function TvModeRemindersWidget({ reminders, interval, language, t, currentTime }: TvModeRemindersWidgetProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const currentHour = currentTime ? currentTime.getHours() : new Date().getHours();
  const currentDay = currentTime ? currentTime.getDay() : new Date().getDay();

  const activeReminders = useMemo(() => {
    const filtered = (reminders || []).filter(r => {
      if (r.enabled === false) return false;
      
      // Day of week check
      if (r.daysOfWeek && r.daysOfWeek.length > 0) {
        if (!r.daysOfWeek.includes(currentDay)) return false;
      }
      
      // Hour range check
      if (r.startHour !== undefined && r.endHour !== undefined) {
        if (r.startHour <= r.endHour) {
          if (currentHour < r.startHour || currentHour > r.endHour) return false;
        } else {
          // Overnight range e.g., 22:00 to 04:00
          if (currentHour < r.startHour && currentHour > r.endHour) return false;
        }
      }
      return true;
    });

    if (filtered.length > 0) return filtered;

    return [
      {
        id: "d1",
        type: "hadith" as const,
        text: language === 'ms' 
          ? "Pahala solat berjemaah melebihi solat bersendirian sebanyak dua puluh tujuh darjah."
          : "Congregational prayer is 27 times better than praying alone.",
        title: "HR. Bukhari & Muslim"
      },
      {
        id: "d2",
        type: "quran" as const,
        text: language === 'ms'
          ? "Dan dirikanlah solat, tunaikanlah zakat dan rukuklah beserta orang-orang yang rukuk."
          : "And establish prayer and give zakah and bow with those who bow [in worship and obedience].",
        title: "Surah Al-Baqarah: 43"
      }
    ];
  }, [reminders, language, currentHour, currentDay]);

  // Loaded object URLs for IndexedDB binary images
  const [loadedAssetUrls, setLoadedAssetUrls] = useState<Record<string, string>>({});

  useEffect(() => {
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
        setLoadedAssetUrls(prev => {
          Object.values(prev).forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) {}
          });
          return urls;
        });
      }
    };
    
    loadAssets();
    
    return () => {
      active = false;
    };
  }, [activeReminders]);

  useEffect(() => {
    return () => {
      setLoadedAssetUrls(prev => {
        Object.values(prev).forEach(url => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        });
        return {};
      });
    };
  }, []);

  useEffect(() => {
    if (currentIdx >= activeReminders.length) {
      setCurrentIdx(0);
    }
  }, [activeReminders, currentIdx]);

  useEffect(() => {
    if (activeReminders.length <= 1) return;
    const currentReminder = activeReminders[currentIdx] || activeReminders[0];
    const slideDuration = (currentReminder?.duration ?? interval) * 1000;

    const timer = setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % activeReminders.length);
    }, slideDuration);
    return () => clearTimeout(timer);
  }, [activeReminders, currentIdx, interval]);

  if (activeReminders.length === 0) return null;

  const currentReminder = activeReminders[currentIdx] || activeReminders[0];

  const renderCard = () => {
    return (
      <TvModeReminderCard
        key={currentReminder.id}
        reminder={currentReminder}
        assetUrls={loadedAssetUrls}
        language={language}
        isTvMode={true}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        {renderCard()}
      </AnimatePresence>
    </div>
  );
}

interface TvModeSlideshowWidgetProps {
  urls: string;
  interval: number;
  language: 'ms' | 'en';
}

function TvModeSlideshowWidget({ urls, interval, language }: TvModeSlideshowWidgetProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const parsedUrls = useMemo(() => {
    if (!urls || !urls.trim()) return [];
    return urls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("http"));
  }, [urls]);

  useEffect(() => {
    if (currentIdx >= parsedUrls.length) {
      setCurrentIdx(0);
    }
  }, [parsedUrls, currentIdx]);

  useEffect(() => {
    if (parsedUrls.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % parsedUrls.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [parsedUrls, interval]);

  if (parsedUrls.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-surface-container)] rounded-[36px] border border-[var(--md-sys-color-outline)]/10 h-full space-y-3">
        <Tv size={48} className="text-[var(--md-sys-color-primary)] stroke-[1.5]" />
        <h4 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
          {language === 'ms' ? 'Tiada Imej Slaid' : 'No Slideshow Images'}
        </h4>
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
          {language === 'ms'
            ? 'Masukkan pautan URL imej poster atau banner di bahagian Tetapan untuk memaparkan slaid.'
            : 'Enter image URLs for posters or banners in the Settings to start the slideshow.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative rounded-[36px] overflow-hidden bg-black/40 h-full w-full">
      <AnimatePresence mode="wait">
        <motion.img
          key={parsedUrls[currentIdx]}
          src={parsedUrls[currentIdx]}
          alt={`Slide ${currentIdx + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
    </div>
  );
}

interface TvModeCameraWidgetProps {
  deviceId: string;
  language: 'ms' | 'en';
  t: (key: any) => string;
}

function TvModeCameraWidget({ deviceId, language, t }: TvModeCameraWidgetProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startCamera = async () => {
      setError(null);
      try {
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false, // Avoid feedback
        };
        const active = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = active;
        setStream(active);
        if (videoRef.current) {
          videoRef.current.srcObject = active;
        }
      } catch (err: any) {
        console.error("Failed to start camera:", err);
        setError(err.message || String(err));
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [deviceId]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-error-container)]/10 rounded-[36px] border border-[var(--md-sys-color-error)]/30 h-full space-y-3">
        <AlertCircle size={48} className="text-[var(--md-sys-color-error)] stroke-[1.5]" />
        <h4 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
          {language === 'ms' ? 'Ralat Kamera' : 'Camera Error'}
        </h4>
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
          {language === 'ms'
            ? 'Gagal memulakan suapan peranti kamera. Sila pastikan kebenaran diberikan dan peranti disambungkan.'
            : 'Failed to start camera stream. Please ensure permissions are granted and the device is connected.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative rounded-[36px] overflow-hidden bg-black/80 h-full w-full flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />
      <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-red-600/90 text-white font-black text-[10px] tracking-widest uppercase flex items-center gap-1.5 animate-pulse shadow-md pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full bg-white relative flex shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        </span>
        <span>LIVE FEED</span>
      </div>
    </div>
  );
}

export default TvModeView;
