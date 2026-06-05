import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Compass, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { useAppContext } from "../AppContext";
import { cn } from "../lib/utils";
import "@material/web/button/filled-tonal-button.js";

export function SolatMode({
  prayerName,
  remainingSeconds,
  showClock = true,
  showQibla = true,
  isDuaStage = false,
  isTvMode = false,
  onExit,
}: {
  prayerName: string;
  remainingSeconds: number;
  showClock?: boolean;
  showQibla?: boolean;
  isDuaStage?: boolean;
  isTvMode?: boolean;
  onExit: () => void;
}) {
  const { t } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showExitButton, setShowExitButton] = useState(false);
  const [exitTapCount, setExitTapCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // TV Remote controls/keyboard wake-up event listener
  useEffect(() => {
    if (!isTvMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setShowExitButton(true);
      setExitTapCount((prev) => {
        if (prev < 1) {
          return 1;
        } else {
          onExit();
          return 0;
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTvMode, onExit]);

  // Show exit button on tap/click and hide after 4 seconds
  useEffect(() => {
    if (showExitButton) {
      const timeout = setTimeout(() => {
        setShowExitButton(false);
        setExitTapCount(0);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [showExitButton]);

  // Handle temporary tap count reset for the exit button
  useEffect(() => {
    if (exitTapCount > 0) {
      const timeout = setTimeout(() => setExitTapCount(0), 2000);
      return () => clearTimeout(timeout);
    }
  }, [exitTapCount]);

  // Dhikr cycling for the Dua stage
  const [dhikrIndex, setDhikrIndex] = useState(0);
  useEffect(() => {
    if (isDuaStage) {
      const interval = setInterval(() => {
        setDhikrIndex((prev) => (prev + 1) % 3);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [isDuaStage]);

  const handleContainerClick = () => {
    setShowExitButton(true);
  };

  const handleExitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (exitTapCount < 1) {
      setExitTapCount(1);
    } else {
      onExit();
      setExitTapCount(0);
    }
  };

  const formattedClock = format(currentTime, "HH:mm");

  const dhikrs = [
    t("solatModeDuaDhikr1"),
    t("solatModeDuaDhikr2"),
    t("solatModeDuaDhikr3")
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleContainerClick}
      className={cn(
        "fixed inset-0 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] flex flex-col items-center justify-between cursor-pointer select-none overflow-hidden",
        isTvMode ? "z-[10000] p-12 sm:p-20" : "z-[500] p-8 sm:p-12"
      )}
    >
      {/* Calm ambient breathing backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 pointer-events-none" />
      
      {/* Subtle pulsing color blob in center */}
      <motion.div
        animate={{
          scale: isDuaStage ? [1, 1.1, 1] : [1, 1.2, 1],
          opacity: isDuaStage ? [0.05, 0.1, 0.05] : [0.08, 0.15, 0.08],
        }}
        transition={{
          repeat: Infinity,
          duration: isDuaStage ? 12 : 8,
          ease: "easeInOut",
        }}
        className="absolute w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full bg-[var(--md-sys-color-primary)]/10 blur-[120px] pointer-events-none"
      />

      {/* Top Header: Solat Mode Indicator & Clock */}
      <div className="w-full flex items-center justify-between z-10">
        <div className={cn(
          "flex items-center text-[var(--md-sys-color-on-surface-variant)] font-extrabold tracking-widest uppercase bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] rounded-full",
          isTvMode ? "gap-3.5 text-sm lg:text-base px-6 py-3" : "gap-2 text-xs px-4 py-2"
        )}>
          <span className={cn(
            "rounded-full bg-[var(--md-sys-color-primary)]",
            isTvMode ? "w-3 h-3" : "w-2 h-2",
            isDuaStage ? 'opacity-80' : 'animate-pulse'
          )}></span>
          {isDuaStage ? "Dua & Remembrance" : "Solat Sedang Berlangsung"}
        </div>
        
        {showClock && (
          <div className={cn(
            "flex items-center text-[var(--md-sys-color-on-surface)] font-black tracking-tight bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/50",
            isTvMode ? "gap-3.5 text-3xl px-6 py-3 rounded-3xl" : "gap-2 text-xl px-4 py-2 rounded-2xl"
          )}>
            <Clock size={isTvMode ? 26 : 18} className="text-[var(--md-sys-color-on-surface-variant)] shrink-0" />
            <span className="font-mono">{formattedClock}</span>
          </div>
        )}
      </div>

      {/* Center Section: Transition dynamically between Praying Mode and Dua Screensaver */}
      <AnimatePresence mode="wait">
        {!isDuaStage ? (
          <motion.div
            key="prayer-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className={cn(
              "flex flex-col items-center justify-center text-center my-auto z-10",
              isTvMode ? "gap-10" : "gap-6"
            )}
          >
            <span className={cn(
              "text-[var(--md-sys-color-primary)]/80 font-black uppercase",
              isTvMode ? "text-lg sm:text-xl lg:text-2xl tracking-[0.5em]" : "text-xs sm:text-sm tracking-[0.4em]"
            )}>
              {t("solatModeHeading")}
            </span>
            
            <motion.h1
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={cn(
                "font-black tracking-tight text-[var(--md-sys-color-on-surface)]",
                isTvMode ? "text-7xl sm:text-8xl lg:text-[7.5rem] xl:text-[9.5rem]" : "text-5xl sm:text-7xl lg:text-8xl"
              )}
            >
              {prayerName}
            </motion.h1>

            <p className={cn(
              "text-[var(--md-sys-color-on-surface-variant)] font-medium tracking-wide leading-relaxed",
              isTvMode ? "text-xl sm:text-2xl lg:text-3xl max-w-3xl mt-4" : "text-sm sm:text-base max-w-sm mt-2"
            )}>
              {t("solatModeInstruction")}
            </p>

            {/* Elegant static divider */}
            <div className={cn(
              "rounded bg-[var(--md-sys-color-primary)]/30",
              isTvMode ? "w-32 h-1.5 mt-8" : "w-16 h-0.5 mt-4"
            )} />
          </motion.div>
        ) : (
          <motion.div
            key="dua-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className={cn(
              "flex flex-col items-center justify-center text-center my-auto z-10",
              isTvMode ? "gap-10" : "gap-8"
            )}
          >
            <span className={cn(
              "text-[var(--md-sys-color-primary)]/80 font-black uppercase",
              isTvMode ? "text-lg sm:text-xl lg:text-2xl tracking-[0.5em]" : "text-xs sm:text-sm tracking-[0.4em]"
            )}>
              {t("solatModeDuaHeading")}
            </span>

            {/* Calligraphic Dhikr Screen */}
            <div className={cn(
              "flex items-center justify-center px-4",
              isTvMode ? "min-h-[220px]" : "min-h-[140px]"
            )}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={dhikrIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className={cn(
                    "font-serif text-[var(--md-sys-color-tertiary)] font-bold leading-relaxed tracking-wide drop-shadow-[0_2px_15px_rgba(var(--md-sys-color-tertiary-rgb),0.15)]",
                    isTvMode ? "text-5xl sm:text-7xl lg:text-[6.5rem] xl:text-[8rem]" : "text-3.5xl sm:text-5.5xl lg:text-6.5xl"
                  )}
                >
                  {dhikrs[dhikrIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <p className={cn(
              "text-[var(--md-sys-color-on-surface-variant)]/80 font-semibold tracking-wide leading-relaxed animate-pulse",
              isTvMode ? "text-lg sm:text-xl lg:text-2.5xl max-w-3xl mt-4" : "text-xs sm:text-sm max-w-md mt-2"
            )}>
              {t("solatModeDuaInstruction")}
            </p>

            {/* Elegant static divider */}
            <div className={cn(
              "rounded bg-[var(--md-sys-color-primary)]/20",
              isTvMode ? "w-24 h-1.5 mt-6" : "w-12 h-0.5 mt-2"
            )} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Qibla & Exit Panel */}
      <div className={cn(
        "w-full flex flex-col items-center z-10",
        isTvMode ? "gap-8" : "gap-6"
      )}>
        {showQibla && (
          <div className={cn(
            "flex items-center text-[var(--md-sys-color-on-surface-variant)] font-semibold tracking-wider bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40",
            isTvMode ? "gap-3.5 text-lg lg:text-xl px-8 py-4 rounded-[24px]" : "gap-2.5 text-sm px-5 py-3 rounded-full"
          )}>
            <Compass size={isTvMode ? 24 : 16} className="text-[var(--md-sys-color-primary)]/80 shrink-0 animate-spin-slow" />
            <span>Kiblat: 292.41° (Barat Laut)</span>
          </div>
        )}

        <div className={cn(
          "text-[var(--md-sys-color-on-surface-variant)]/60 font-medium h-4",
          isTvMode ? "text-base lg:text-lg" : "text-xs"
        )}>
          Automatik tamat dalam {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
        </div>
      </div>

      {/* Overlay dismiss panel with Accidental Dismiss Protection */}
      <AnimatePresence>
        {showExitButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute inset-x-0 mx-auto w-fit z-20 flex flex-col items-center",
              isTvMode ? "bottom-36 gap-4" : "bottom-24 gap-2"
            )}
          >
            {/* @ts-ignore */}
            <md-filled-tonal-button
              onClick={handleExitClick}
              className="shadow-xl"
              style={{ 
                '--md-filled-tonal-button-container-shape': isTvMode ? '32px' : '24px', 
                '--md-filled-tonal-button-container-height': isTvMode ? '64px' : '48px',
                '--md-filled-tonal-button-label-text-size': isTvMode ? '16px' : '14px'
              } as any}
            >
              <X slot="icon" size={isTvMode ? 22 : 16} className="stroke-[2.5]" />
              {exitTapCount > 0 
                ? (isTvMode ? t("wakeUpPrompt") : t("doubleTapExit")) 
                : t("exitSolatMode")}
            </md-filled-tonal-button>
            {exitTapCount > 0 && (
              <motion.span 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-[var(--md-sys-color-on-error-container)] font-bold bg-[var(--md-sys-color-error-container)] px-4 py-2 rounded-full shadow-sm text-center",
                  isTvMode ? "text-sm" : "text-[10px]"
                )}
              >
                {isTvMode ? t("wakeUpPrompt") : t("doubleTapExit")}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
