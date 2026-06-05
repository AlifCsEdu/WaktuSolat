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
  Settings
} from "lucide-react";
import { PrayerData, GeneralSettings, TvModeReminder } from "../types";
import { cn } from "../lib/utils";
import { getHijriFormatted } from "../lib/holidays";
import { getMosqueLogoBlob } from "../lib/db";
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
  onSettingsClick,
}: TvModeViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [showEscToast, setShowEscToast] = useState(true);
  const isMalay = settings.language === "ms";
  const [isMobile, setIsMobile] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const showCenterWidget = settings.tvModeCenterWidget && settings.tvModeCenterWidget !== 'none';

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
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

  // Clock calculations
  const timeString = format(currentTime, settings.timeFormat === "12h" ? "h:mm:ss" : "HH:mm:ss");
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

  useEffect(() => {
    const intervalSec = settings.tvModeReminderInterval ?? 15;
    const timer = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [announcements, settings.tvModeReminderInterval]);

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

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface)] select-none overflow-hidden font-sans">
      
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

      {/* Dynamic Background Light Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45vw] h-[45vw] bg-[var(--md-sys-color-primary)]/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[50vw] h-[50vw] bg-[var(--md-sys-color-secondary)]/8 rounded-full blur-[120px]" />
      </div>

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
      <div className="relative z-10 flex items-center justify-between px-10 py-5 bg-[var(--md-sys-color-surface-container-low)]/40 backdrop-blur-xl border-b border-[var(--md-sys-color-outline-variant)]/20 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-black tracking-tighter text-[var(--md-sys-color-primary)] flex items-center gap-4">
            {settings.mosqueLogoEnabled && logoUrl ? (
              <div className="h-12 w-12 flex items-center justify-center bg-transparent shrink-0">
                <img
                  src={logoUrl}
                  alt="Mosque Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={() => setLogoUrl(null)}
                />
              </div>
            ) : (
              <Tv className="w-8 h-8 text-[var(--md-sys-color-primary)]" />
            )}
            <span>{settings.mosqueName || "AlurWaktu TV"}</span>
          </h1>
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-sm font-bold border border-[var(--md-sys-color-outline-variant)]/40">
            <MapPin size={16} className="text-[var(--md-sys-color-primary)]" />
            <span className="truncate max-w-[200px]">{currentLocationName || t("selectedZone")}</span>
            <span className="font-mono text-xs opacity-60">({selectedZone})</span>
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

      {/* Main Split Grid */}
      <div className="flex-1 relative z-10 flex flex-row items-stretch p-8 gap-8 min-h-0 w-full">
        
        {/* Left Container: Clock & Announcements */}
        <div className={cn(
          "flex flex-col justify-between items-stretch gap-6 min-w-0",
          showCenterWidget ? "flex-[0.8]" : "flex-[1.2]"
        )}>
          
          {/* Main Massive Clock Panel */}
          <div className="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-10 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
            
            {/* Top Info row (dates) */}
            <div className="flex flex-col items-center mb-6">
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

            {/* Massive Ticking Digital Clock */}
            <div className="flex items-baseline justify-center select-text">
              <span className="text-[6.5rem] sm:text-[8rem] lg:text-[10rem] font-mono font-black tracking-tighter leading-none tabular-nums text-[var(--md-sys-color-on-surface)]">
                {timeString.split(":")[0]}:{timeString.split(":")[1]}
              </span>
              <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tighter text-[var(--md-sys-color-on-surface)]/60 ml-2 select-none tabular-nums">
                :{timeString.split(":")[2]}
              </span>
              {ampm && (
                <span className="ml-4 text-3xl lg:text-4xl font-black uppercase text-[var(--md-sys-color-primary)] tracking-widest">
                  {ampm}
                </span>
              )}
            </div>

            {/* Next Prayer Countdown Sub-panel */}
            {nextPrayerName && (
              <div className="mt-8 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/60 backdrop-blur-md border border-[var(--md-sys-color-outline-variant)]/20 px-8 py-3 rounded-3xl w-full max-w-md shadow-sm">
                <span className="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                  {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                </span>
                <span className="text-4xl sm:text-5xl font-mono font-black text-[var(--md-sys-color-primary)] tracking-tight mt-1 tabular-nums">
                  {countdownString}
                </span>
              </div>
            )}
          </div>

          {/* Weather Widget */}
          <div className="shrink-0 rounded-[32px] overflow-hidden">
            <WeatherWidget selectedZone={selectedZone} userCoords={userCoords} currentLocationName={currentLocationName} />
          </div>

          {/* Dynamic Iqamah Countdown Banner */}
          <AnimatePresence>
            {iqamahCountdownActive && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={onIqamahTogglePause}
                className={cn(
                  "rounded-[32px] p-6 flex flex-col items-center justify-center border shadow-2xl relative overflow-hidden cursor-pointer select-none transition-all duration-300 active:scale-[0.99]",
                  iqamahRemainingSeconds <= 60
                    ? "bg-gradient-to-r from-[var(--md-sys-color-error)] via-orange-600 to-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] border-[var(--md-sys-color-error)]/25 animate-pulse"
                    : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10"
                )}
              >
                {/* Flashing ambient effect */}
                <div className="absolute inset-0 bg-white/5" />
                
                {/* Plus 1 minute button */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent toggling pause
                      onIqamahAddMinute();
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md",
                      iqamahRemainingSeconds <= 60
                        ? "bg-white/30 hover:bg-white/45 text-white"
                        : "bg-[var(--md-sys-color-on-primary)]/20 hover:bg-[var(--md-sys-color-on-primary)]/35 text-[var(--md-sys-color-on-primary)]"
                    )}
                    title="+1 Min"
                  >
                    <Plus size={20} className="stroke-[3]" />
                  </button>
                </div>

                {/* Status text with play/pause indicators */}
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] font-black opacity-90 relative z-10">
                  {iqamahPaused ? (
                    <Play size={16} className="fill-current animate-pulse shrink-0" />
                  ) : (
                    <Pause size={16} className="fill-current shrink-0" />
                  )}
                  <span>
                    {iqamahPaused
                      ? (isMalay ? "IQAMAH DITANGGUH (KETIK UNTUK SAMBUNG)" : "IQAMAH PAUSED (TAP TO RESUME)")
                      : iqamahRemainingSeconds <= 60
                      ? (isMalay ? "SILA RAPATKAN SAF & SENYAPKAN TELEFON" : "PLEASE STRAIGHTEN ROWS & SILENCE PHONES")
                      : (isMalay ? "BERSEDIA UNTUK SOLAT (IQAMAH)" : "PREPARE FOR PRAYER (IQAMAH)")}
                  </span>
                </div>

                {/* Large countdown time */}
                <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight mt-2 relative z-10 tabular-nums">
                  {Math.floor(iqamahRemainingSeconds / 60)}:
                  {String(iqamahRemainingSeconds % 60).padStart(2, "0")}
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full",
                      iqamahRemainingSeconds <= 60 ? "bg-white" : "bg-[var(--md-sys-color-on-primary)]/80"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, ((iqamahTotalSeconds - iqamahRemainingSeconds) / iqamahTotalSeconds) * 100))}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Running announcement banner */}
          {!showCenterWidget && (
            <div className="h-28 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/10 rounded-[32px] p-6 shadow-md overflow-hidden flex items-center relative transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/15">
              <div className="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-high)]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-[var(--md-sys-color-outline-variant)]/20 shadow-sm z-10 flex items-center gap-2">
                <BookOpen size={20} className="stroke-[2.5]" />
                <span className="text-xs font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
              </div>
              
              <div className="flex-1 pl-44 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentAnnouncementIdx}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="text-lg font-bold text-[var(--md-sys-color-on-surface-variant)] leading-snug tracking-tight text-left"
                  >
                    {announcements[currentAnnouncementIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Center Container: Active Center Widget (Reminders, Slideshow, Camera) */}
        {showCenterWidget && (
          <div className="flex-[1.4] flex flex-col justify-stretch items-stretch min-w-0 bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20">
            {settings.tvModeCenterWidget === 'reminders' && (
              <TvModeRemindersWidget
                reminders={settings.tvModeRemindersList || []}
                interval={settings.tvModeReminderInterval ?? 15}
                language={settings.language}
                t={t}
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

        {/* Right Container: Massive Prayer Schedule list */}
        <div className={cn(
          "flex flex-col justify-between items-stretch bg-[var(--md-sys-color-surface-container-low)]/30 backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/15 rounded-[48px] p-8 shadow-2xl min-w-0 transition-all duration-500 hover:border-[var(--md-sys-color-primary)]/20",
          showCenterWidget ? "flex-[0.8]" : "flex-[0.9]"
        )}>
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
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.02] z-10"
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
                      <span className="px-3 py-1 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase">
                        {isMalay ? "SEKARANG" : "ACTIVE"}
                      </span>
                    )}
                    
                    {/* Next prayer highlight badge */}
                    {isNext && (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] text-[9px] font-black tracking-widest uppercase animate-pulse">
                        {isMalay ? "SELEPAS INI" : "UP NEXT"}
                      </span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "font-mono text-2xl sm:text-3xl lg:text-4xl tracking-tighter relative z-10 tabular-nums",
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
}

function TvModeRemindersWidget({ reminders, interval, language, t }: TvModeRemindersWidgetProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const activeReminders = useMemo(() => {
    if (reminders && reminders.length > 0) return reminders;
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
  }, [reminders, language]);

  useEffect(() => {
    if (currentIdx >= activeReminders.length) {
      setCurrentIdx(0);
    }
  }, [activeReminders, currentIdx]);

  useEffect(() => {
    if (activeReminders.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeReminders.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [activeReminders, interval]);

  if (activeReminders.length === 0) return null;

  const currentReminder = activeReminders[currentIdx] || activeReminders[0];

  const renderCard = () => {
    switch (currentReminder.type) {
      case 'hadith':
        return (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-primary-container)]/20 border border-[var(--md-sys-color-primary)]/30 rounded-[36px] relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--md-sys-color-primary)]/5 rounded-full blur-2xl pointer-events-none" />
            <BookOpen size={48} className="text-[var(--md-sys-color-primary)] mb-6 stroke-[1.5]" />
            <span className="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-primary)] mb-3">
              {language === 'ms' ? 'HADITH RIWAYAT' : 'AUTHENTIC HADITH'}
            </span>
            <p className="text-2xl font-serif italic text-[var(--md-sys-color-on-surface)] leading-relaxed max-w-xl font-medium">
              "{currentReminder.text}"
            </p>
            {currentReminder.title && (
              <span className="text-sm font-bold text-[var(--md-sys-color-on-surface-variant)] mt-6 bg-[var(--md-sys-color-surface)] px-4 py-1.5 rounded-full ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm">
                {currentReminder.title}
              </span>
            )}
          </motion.div>
        );

      case 'quran':
        return (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-amber-500/5 border border-amber-500/35 rounded-[36px] relative overflow-hidden h-full"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <Sparkles size={48} className="text-amber-500 mb-6 stroke-[1.5]" />
            <span className="text-xs uppercase tracking-[0.25em] font-black text-amber-600 dark:text-amber-400 mb-3">
              {language === 'ms' ? 'FIRMAN ALLAH (AL-QURAN)' : 'REVELATION (AL-QURAN)'}
            </span>
            <p className="text-2xl font-serif italic text-[var(--md-sys-color-on-surface)] leading-relaxed max-w-xl font-medium">
              "{currentReminder.text}"
            </p>
            {currentReminder.title && (
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-6 bg-amber-500/10 px-4 py-1.5 rounded-full shadow-sm">
                {currentReminder.title}
              </span>
            )}
          </motion.div>
        );

      case 'warning':
        return (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[var(--md-sys-color-error-container)]/10 border border-[var(--md-sys-color-error)]/35 rounded-[36px] relative overflow-hidden h-full"
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-500 via-transparent to-red-500 opacity-20 pointer-events-none" />
            <VolumeX size={48} className="text-[var(--md-sys-color-error)] mb-6 stroke-[1.5]" />
            <span className="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-error)] mb-3">
              {language === 'ms' ? 'PERINGATAN MESRA' : 'KIND REMINDER'}
            </span>
            <p className="text-2xl font-sans font-black text-[var(--md-sys-color-on-surface)] leading-relaxed max-w-xl">
              {currentReminder.text}
            </p>
            {currentReminder.title && (
              <span className="text-sm font-bold text-[var(--md-sys-color-error)] mt-6 bg-[var(--md-sys-color-error-container)]/30 px-4 py-1.5 rounded-full shadow-sm">
                {currentReminder.title}
              </span>
            )}
          </motion.div>
        );

      case 'info':
        return (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-blue-500/5 border border-blue-500/35 rounded-[36px] relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <Tv size={48} className="text-blue-500 mb-6 stroke-[1.5]" />
            <span className="text-xs uppercase tracking-[0.25em] font-black text-blue-600 dark:text-blue-400 mb-3">
              {language === 'ms' ? 'MAKLUMAN MASJID' : 'MOSQUE ANNOUNCEMENT'}
            </span>
            {currentReminder.title && (
              <h4 className="text-xl font-black text-[var(--md-sys-color-on-surface)] mb-2">
                {currentReminder.title}
              </h4>
            )}
            <p className="text-xl font-sans font-semibold text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-xl">
              {currentReminder.text}
            </p>
          </motion.div>
        );

      case 'donation':
        return (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col sm:flex-row items-center justify-between p-8 bg-rose-500/5 border border-rose-500/35 rounded-[36px] relative overflow-hidden h-full gap-6"
          >
            <div className="flex-1 flex flex-col justify-center items-start text-left">
              <Heart size={40} className="text-rose-500 mb-4 stroke-[1.5] animate-pulse" />
              <span className="text-xs uppercase tracking-[0.25em] font-black text-rose-600 dark:text-rose-400 mb-2">
                {language === 'ms' ? 'SUMBANGAN IMARAH' : 'MOSQUE DONATION'}
              </span>
              {currentReminder.title && (
                <h4 className="text-xl font-black text-[var(--md-sys-color-on-surface)] mb-2">
                  {currentReminder.title}
                </h4>
              )}
              <p className="text-lg font-sans font-semibold text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                {currentReminder.text}
              </p>
            </div>
            {currentReminder.imageUrl && (
              <div className="w-40 h-40 shrink-0 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg ring-4 ring-rose-500/10 pointer-events-none">
                <img
                  src={currentReminder.imageUrl}
                  alt="Donation QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
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
