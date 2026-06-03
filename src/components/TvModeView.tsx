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
  X
} from "lucide-react";
import { PrayerData, GeneralSettings } from "../types";
import { cn } from "../lib/utils";
import { getHijriFormatted } from "../lib/holidays";

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
}: TvModeViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMalay = settings.language === "ms";

  // Screen Wake Lock API Integration
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
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

  // Rotational hadith reminders (changing every 15s)
  const announcements = useMemo(() => {
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
  }, [isMalay]);

  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [announcements]);

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
      
      {/* Dynamic Background Light Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45vw] h-[45vw] bg-[var(--md-sys-color-primary)]/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[50vw] h-[50vw] bg-[var(--md-sys-color-secondary)]/8 rounded-full blur-[120px]" />
      </div>

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-10 py-5 bg-[var(--md-sys-color-surface-container-low)]/40 backdrop-blur-xl border-b border-[var(--md-sys-color-outline-variant)]/20 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-black tracking-tighter text-[var(--md-sys-color-primary)] flex items-center gap-3">
            <Tv className="w-8 h-8 text-[var(--md-sys-color-primary)]" />
            <span>AlurWaktu TV</span>
          </h1>
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-sm font-bold border border-[var(--md-sys-color-outline-variant)]/40">
            <MapPin size={16} className="text-[var(--md-sys-color-primary)]" />
            <span className="truncate max-w-[200px]">{currentLocationName || t("selectedZone")}</span>
            <span className="font-mono text-xs opacity-60">({selectedZone})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick controls */}
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
        <div className="flex-[1.2] flex flex-col justify-between items-stretch gap-6 min-w-0">
          
          {/* Main Massive Clock Panel */}
          <div className="flex-1 flex flex-col justify-center items-center bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-[48px] p-10 shadow-lg relative overflow-hidden group">
            
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
              <div className="mt-8 flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)]/50 border border-[var(--md-sys-color-outline-variant)]/20 px-8 py-3 rounded-3xl w-full max-w-md shadow-sm">
                <span className="text-xs uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-on-surface-variant)]">
                  {isMalay ? "HITUNG MUNDUR" : "COUNTDOWN"} — {nextPrayerName}
                </span>
                <span className="text-4xl sm:text-5xl font-mono font-black text-[var(--md-sys-color-primary)] tracking-tight mt-1 tabular-nums">
                  {countdownString}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Iqamah Countdown Banner */}
          <AnimatePresence>
            {iqamahCountdownActive && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-[32px] p-6 flex flex-col items-center justify-center border border-[var(--md-sys-color-primary)]/10 shadow-2xl relative overflow-hidden"
              >
                {/* Flashing ambient effect */}
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
                <span className="text-sm uppercase tracking-[0.3em] font-black opacity-85 relative z-10">
                  {isMalay ? "BERSEDIA UNTUK SOLAT (IQAMAH)" : "PREPARE FOR PRAYER (IQAMAH)"}
                </span>
                <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight mt-1 relative z-10 tabular-nums">
                  {Math.floor(iqamahRemainingSeconds / 60)}:
                  {String(iqamahRemainingSeconds % 60).padStart(2, "0")}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Running announcement banner */}
          <div className="h-28 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-[32px] p-6 shadow-sm overflow-hidden flex items-center relative">
            <div className="absolute left-6 text-[var(--md-sys-color-primary)] shrink-0 bg-[var(--md-sys-color-surface-container-low)] pr-4 z-10 flex items-center gap-2">
              <BookOpen size={24} className="stroke-[2.5]" />
              <span className="text-sm font-black uppercase tracking-widest">{isMalay ? "PERINGATAN" : "REMINDER"}:</span>
            </div>
            
            <div className="flex-1 pl-36 overflow-hidden relative">
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
        </div>

        {/* Right Container: Massive Prayer Schedule list */}
        <div className="flex-[0.9] flex flex-col justify-between items-stretch bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-[48px] p-8 shadow-lg min-w-0">
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
                    "flex items-center justify-between px-6 py-4 rounded-[24px] border transition-all relative overflow-hidden flex-1",
                    isCurrent
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]/10 shadow-lg scale-[1.02] z-10"
                      : isNext
                      ? "bg-[var(--md-sys-color-primary-container)]/30 text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]/20"
                      : "bg-[var(--md-sys-color-surface)]/50 border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]"
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
export default TvModeView;
