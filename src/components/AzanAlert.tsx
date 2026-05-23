import { motion } from "motion/react";
import { Volume2, X, Bell } from "lucide-react";
import { useAppContext } from "../AppContext";
import { format } from "date-fns";
import { useState, useEffect } from "react";

export function AzanAlert({
  prayerName,
  prayerTime,
  remainingSeconds,
  style = "standard",
  onDismiss,
}: {
  prayerName: string;
  prayerTime: Date;
  remainingSeconds: number;
  style: "dramatic" | "standard" | "modern" | "subtle" | "minimal";
  onDismiss: () => void;
}) {
  const { t, settings } = useAppContext();
  const [dismissTapCount, setDismissTapCount] = useState(0);

  useEffect(() => {
    if (dismissTapCount > 0) {
      const tId = setTimeout(() => setDismissTapCount(0), 2000);
      return () => clearTimeout(tId);
    }
  }, [dismissTapCount]);

  const handleDismiss = () => {
    if (dismissTapCount < 1) {
      setDismissTapCount(1);
    } else {
      onDismiss();
      setDismissTapCount(0);
    }
  };

  const formattedTime = format(
    prayerTime,
    settings.timeFormat === "12h" ? "hh:mm a" : "HH:mm"
  );

  if (style === "subtle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[300] w-[90%] max-w-sm"
      >
        <div className="bg-[var(--md-sys-color-primary-container)] border border-[var(--md-sys-color-primary)]/20 shadow-2xl rounded-[24px] p-4 flex items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 animate-bounce">
              <Bell size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-bold text-[var(--md-sys-color-on-primary-container)] text-base leading-tight">
                {t("azanAlertTitle", { prayer: prayerName })}
              </h4>
              <p className="text-[var(--md-sys-color-on-primary-container)]/70 text-xs mt-0.5">
                {formattedTime} • Tutup dalam {remainingSeconds}s
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-on-primary-container)] shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    );
  }

  if (style === "modern") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -80, x: "-50%", scale: 0.95 }}
        animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
        exit={{ opacity: 0, y: -40, x: "-50%", scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-md"
      >
        <div className="bg-[var(--md-sys-color-surface-container-highest)]/90 backdrop-blur-2xl border border-[var(--md-sys-color-primary)]/15 shadow-2xl rounded-[32px] p-3.5 pl-5 flex items-center justify-between gap-4 ring-1 ring-black/5 relative overflow-hidden">
          {/* Subtle slow pulsing background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--md-sys-color-primary)]/5 via-transparent to-[var(--md-sys-color-primary)]/5 animate-pulse" />
          
          <div className="flex items-center gap-3.5 relative z-10 min-w-0 flex-1">
            {/* Animated ringing bell */}
            <div className="w-11 h-11 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 shadow-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <Bell size={22} className="stroke-[2.5] animate-bounce" />
            </div>
            
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                {t("azanAlertTitle", { prayer: "" }).trim()}
              </span>
              <h4 className="font-black text-[var(--md-sys-color-on-surface)] text-base tracking-tight leading-tight truncate">
                {prayerName} • {formattedTime}
              </h4>
              
              {/* Dynamic visual time remaining progress bar */}
              <div className="w-full h-1 bg-[var(--md-sys-color-outline-variant)]/30 rounded-full mt-1.5 overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--md-sys-color-primary)]"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(remainingSeconds / (settings.azanAlertDuration || 20)) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              onClick={onDismiss}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] text-[var(--md-sys-color-on-surface-variant)] shadow-sm transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (style === "minimal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 right-6 z-[300]"
      >
        <div className="bg-black/90 text-white backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg flex items-center gap-3 select-none">
          {/* Pulsing visual dot indicator */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          
          <span className="text-[11px] font-black tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            {prayerName} <span className="opacity-60">{formattedTime}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[8px] font-bold tabular-nums">
              {remainingSeconds}s
            </span>
          </span>
          
          <button
            onClick={onDismiss}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white shrink-0 transition-colors cursor-pointer"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    );
  }

  if (style === "standard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 inset-x-0 z-[300] w-full p-4 sm:p-6"
      >
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[var(--md-sys-color-primary-container)] via-[var(--md-sys-color-primary-container)] to-[var(--md-sys-color-secondary-container)] border border-[var(--md-sys-color-primary)]/20 shadow-2xl rounded-[32px] p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-2xl">
          {/* Animated concentric decorative rings */}
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full border-4 border-[var(--md-sys-color-primary)]/5 animate-ping pointer-events-none" />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
              <Volume2 size={32} className="stroke-[2.5] animate-pulse" />
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10 px-3 py-1 rounded-full">
                MASUK WAKTU SOLAT
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--md-sys-color-on-primary-container)] tracking-tight mt-1.5 leading-none">
                Sila bersedia untuk Azan {prayerName}
              </h2>
              <p className="text-[var(--md-sys-color-on-primary-container)]/70 text-sm mt-1 font-semibold">
                Waktu Azan: {formattedTime} • Automatik tutup dalam {remainingSeconds}s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <button
              onClick={handleDismiss}
              className="px-5 py-3 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 relative group overflow-hidden"
            >
              <X size={16} className="stroke-[2.5]" />
              <span>
                {dismissTapCount > 0 ? t("doubleTapExit") : t("dismissAlert")}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Dramatic full-screen alert
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-gradient-to-br from-[var(--md-sys-color-background)] via-[var(--md-sys-color-surface-container-high)] to-[var(--md-sys-color-primary-container)] flex flex-col items-center justify-between p-8 sm:p-12 text-[var(--md-sys-color-on-background)] overflow-hidden select-none"
    >
      {/* Top linear progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--md-sys-color-primary)]/10 z-50">
        <motion.div 
          className="h-full bg-[var(--md-sys-color-primary)] shadow-[0_0_12px_var(--md-sys-color-primary)]"
          initial={{ width: "100%" }}
          animate={{ width: `${(remainingSeconds / (settings.azanAlertDuration || 20)) * 100}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      {/* Concentric pulsing background ripples (Audio Visualizer Ripples) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.12] z-0">
        <motion.div 
          animate={{ scale: [1, 2, 1], opacity: [0.1, 0.4, 0.1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border-2 border-[var(--md-sys-color-primary)]"
        />
        <motion.div 
          animate={{ scale: [1.2, 2.4, 1.2], opacity: [0.05, 0.25, 0.05] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          className="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border border-[var(--md-sys-color-primary)]"
        />
        <motion.div 
          animate={{ scale: [0.8, 1.6, 0.8], opacity: [0.15, 0.5, 0.15] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
          className="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full border-4 border-[var(--md-sys-color-primary)]"
        />
      </div>

      {/* Elegant Mosque silhouette background (High-DPI Inline SVG) */}
      <div className="absolute bottom-0 inset-x-0 h-[25vh] pointer-events-none z-0 flex items-end">
        <svg viewBox="0 0 1200 220" className="w-full h-full text-[var(--md-sys-color-primary)] opacity-[0.04]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,220 L1200,220 L1200,180 L1150,180 L1150,120 L1140,105 L1140,50 L1130,50 L1130,35 L1120,50 L1110,50 L1110,105 L1100,120 L1100,180 L920,180 L920,150 C920,120 870,105 850,105 C830,105 780,120 780,150 L780,180 L680,180 L680,70 L660,55 L660,30 L650,30 L650,15 L640,30 L630,30 L630,55 L610,70 L610,180 L590,180 L590,70 L570,55 L570,30 L560,30 L560,15 L550,30 L540,30 L540,55 L520,70 L520,180 L420,180 L420,150 C420,120 370,105 350,105 C330,105 280,120 280,150 L280,180 L100,180 L100,120 L90,105 L90,50 L80,50 L80,35 L70,50 L60,50 L60,105 L50,120 L50,180 L0,180 Z" />
        </svg>
      </div>

      {/* Top section: remaining seconds */}
      <div className="flex justify-between items-center w-full z-10 relative">
        <div className="flex items-center gap-2 text-[var(--md-sys-color-primary)] font-black tracking-widest text-[10px] sm:text-xs uppercase bg-[var(--md-sys-color-primary-container)] border border-[var(--md-sys-color-primary)]/20 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[var(--md-sys-color-primary)] animate-ping"></span>
          Mosque Display Mode
        </div>
        <div className="text-[var(--md-sys-color-on-background)]/60 text-xs sm:text-sm font-semibold">
          Tutup dalam {remainingSeconds}s
        </div>
      </div>

      {/* Center: Hero Adhan details */}
      <div className="flex flex-col items-center text-center z-10 gap-6 my-auto relative">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[var(--md-sys-color-primary-container)] border-4 border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] flex items-center justify-center shadow-[0_0_50px_var(--md-sys-color-primary-container)]"
        >
          <Volume2 size={48} className="stroke-[2.5]" />
        </motion.div>

        <div className="flex flex-col gap-2">
          <span className="text-[var(--md-sys-color-primary)] font-black uppercase tracking-[0.3em] text-xs sm:text-sm">
            MASUK WAKTU SOLAT
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--md-sys-color-on-background)]">
            {prayerName}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--md-sys-color-on-surface-variant)] font-bold tracking-wide mt-1">
            Waktu Azan: {formattedTime}
          </p>
        </div>

        <p className="text-[var(--md-sys-color-on-background)]/75 text-xs sm:text-sm max-w-md font-medium tracking-wide animate-pulse">
          Sila diam diri untuk mendengar panggilan solat yang suci.
        </p>
      </div>

      {/* Bottom: Close / Dismiss with Accidental Close Protection */}
      <div className="z-10 w-full max-w-xs relative flex flex-col items-center gap-2">
        <button
          onClick={handleDismiss}
          className="w-full py-4 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-black text-sm sm:text-base shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden"
        >
          <X size={20} className="stroke-[2.5]" />
          <span>
            {dismissTapCount > 0 ? t("doubleTapExit") : t("dismissAlert")}
          </span>
        </button>
        {dismissTapCount > 0 && (
          <motion.span 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[var(--md-sys-color-primary)] text-xs font-bold bg-[var(--md-sys-color-primary-container)] px-3 py-1 rounded-full shadow-sm"
          >
            {t("doubleTapExit")}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
