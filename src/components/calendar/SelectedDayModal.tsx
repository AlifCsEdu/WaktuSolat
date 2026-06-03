import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CalendarDays, Info, Calendar, Share2, Check, Clock } from "lucide-react";
import { PrayerData } from "../../types";
import { PRAYER_NAMES, PRAYER_ICONS } from "../PrayerSchedule";
import { getAllEventsForDay, getHijriFormatted } from "../../lib/holidays";
import { cn } from "../../lib/utils";
import { format, parse } from "date-fns";
import { ms, enUS } from "date-fns/locale";
import { useAppContext } from "../../AppContext";
import { useVisualStyle, useIconStroke } from "../../hooks/useVisualStyle";

interface SelectedDayModalProps {
  day: PrayerData | null;
  onClose: () => void;
  onPrayerSelect: (k: string) => void;
}

export function SelectedDayModal({ day, onClose, onPrayerSelect }: SelectedDayModalProps) {
  const { t, settings } = useAppContext();
  const isMalay = settings.language === "ms";
  const visualStyle = useVisualStyle();
  const iconStroke = useIconStroke();
  
  const [shareSuccess, setShareSuccess] = useState(false);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    name: string;
    timeLeftStr: string;
  } | null>(null);

  const dateObj = day ? parse(day.date, "dd-MMM-yyyy", new Date()) : null;
  const isToday = day ? day.date === format(new Date(), "dd-MMM-yyyy") : false;

  useEffect(() => {
    if (!day || !isToday) {
      setNextPrayerInfo(null);
      return;
    }

    const parsePrayerTime = (timeStr: string, date: Date) => {
      if (!timeStr) return null;
      const [h, m, s] = timeStr.split(":").map(Number);
      const d = new Date(date);
      d.setHours(h, m, s || 0, 0);
      return d;
    };

    const updateTimer = () => {
      const now = new Date();
      const prayers = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;
      
      let nextKey: string | null = null;
      let nextTime: Date | null = null;
      
      for (const k of prayers) {
        const timeStr = day[k];
        if (timeStr) {
          const pTime = parsePrayerTime(timeStr, now);
          if (pTime && pTime > now) {
            nextKey = k;
            nextTime = pTime;
            break;
          }
        }
      }
      
      if (!nextKey) {
        setNextPrayerInfo({
          name: "isha",
          timeLeftStr: isMalay ? "Selesai" : "Completed"
        });
        return;
      }
      
      const diffMs = nextTime!.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      
      const pad = (n: number) => String(n).padStart(2, '0');
      
      setNextPrayerInfo({
        name: nextKey,
        timeLeftStr: `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [day, isToday, isMalay]);

  if (!day || !dateObj) return null;

  const events = getAllEventsForDay(dateObj, day.hijri);
  const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;

  const handleShareDaySchedule = () => {
    let text = `${day.date.replace(/-/g, " ")} (${getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language, day.hijri)} - ${day.day})\n`;
    timesToDisplay.forEach(k => {
      text += `${t(k)}: ${day[k] ? day[k].substring(0, 5) : "--:--"}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm sm:overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ y: "100%", opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={cn(
            "bg-[var(--md-sys-color-surface)] w-full max-h-[92dvh] md:max-h-[80dvh] overflow-y-auto md:overflow-hidden custom-scrollbar max-w-lg md:max-w-3xl rounded-t-[40px] sm:rounded-[40px] md:rounded-[40px] shadow-2xl flex flex-col md:flex-row transition-all duration-300 relative",
            visualStyle === "retro" && "border-[4px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[12px_12px_0px_0px_var(--md-sys-color-on-surface)]",
            visualStyle === "glass" && "border-none",
            visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] rounded-t-[48px] sm:rounded-[48px] border border-[var(--md-sys-color-outline)]/5"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* @ts-ignore */}
          <md-filled-tonal-icon-button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 cursor-pointer"
          >
            <X size={20} strokeWidth={iconStroke} />
          </md-filled-tonal-icon-button>

          {/* Header Ticket (Editorial) */}
          <div className="bg-[var(--md-sys-color-surface-container-low)] p-6 sm:p-10 md:p-8 lg:p-10 relative border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[var(--md-sys-color-outline-variant)] select-none md:w-[310px] md:shrink-0 md:flex md:flex-col md:justify-between md:h-full">
            {/* Ticket Punch Holes */}
            <div className="absolute w-8 h-8 rounded-full bg-neutral-950/90 z-20 -left-4 md:left-auto md:-right-4 bottom-[-16px] md:top-[-16px]" />
            <div className="absolute w-8 h-8 rounded-full bg-neutral-950/90 z-20 -right-4 bottom-[-16px] md:bottom-[-16px]" />

            <div className="flex flex-col md:justify-between justify-start h-full gap-6 md:gap-0 relative z-0">
               {/* Top Section */}
               <div className="flex flex-col">
                 {isToday && (
                   <span className="mb-4 self-start px-3 py-1 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-[var(--md-sys-color-primary)]/20">
                     <CalendarDays size={14} /> {t("today")}
                   </span>
                 )}
                 
                 <h2 className="md3-display-medium sm:md3-display-large font-black tracking-tighter text-[var(--md-sys-color-on-surface)] flex flex-col gap-1 leading-none">
                   <span className="text-[var(--md-sys-color-primary)]">
                      {format(dateObj, "dd", { locale: settings.language === 'ms' ? ms : enUS })}
                   </span>
                   <span>
                      {format(dateObj, "MMMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
                   </span>
                 </h2>

                 <p className="font-semibold text-[var(--md-sys-color-on-surface-variant)] mt-3.5 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                   {(!settings.hijriFormat || settings.hijriFormat === 'both' || settings.hijriFormat === 'text') && (
                     <span className="font-black">{getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language, day.hijri).split(" (")[0]}</span>
                   )}
                   {(!settings.hijriFormat || settings.hijriFormat === 'both') && (
                     <span className="opacity-40">•</span>
                   )}
                   {(!settings.hijriFormat || settings.hijriFormat === 'both' || settings.hijriFormat === 'number') && (
                     <span className="font-mono opacity-70 font-black">
                       {getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "number", settings.language, day.hijri)}
                     </span>
                   )}
                   <span className="opacity-40">•</span>
                   <span className="opacity-80 font-black uppercase tracking-wider">{format(dateObj, "EEEE", { locale: settings.language === 'ms' ? ms : enUS })}</span>
                 </p>

                 {/* Countdown Widget */}
                 {nextPrayerInfo && (
                   <div className="flex items-center gap-3 p-3 px-4 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/5 shadow-inner sm:max-w-xs md:w-full mt-5 font-mono">
                     <Clock size={16} className="text-[var(--md-sys-color-primary)] animate-pulse" />
                     <div className="flex flex-col leading-none">
                       <span className="text-[8px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">{t(nextPrayerInfo.name as any)} {isMalay ? "Seterusnya" : "Next"}</span>
                       <span className="text-sm font-black text-[var(--md-sys-color-primary)] mt-1">{nextPrayerInfo.timeLeftStr}</span>
                     </div>
                   </div>
                 )}
               </div>
               
               {/* Bottom Section */}
               <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-auto">
                 {/* @ts-ignore */}
                 <md-filled-button
                   onClick={handleShareDaySchedule}
                   className="cursor-pointer"
                   style={{
                     "--md-filled-button-container-color": shareSuccess ? "#25D366" : undefined,
                     "--md-filled-button-label-text-color": shareSuccess ? "#ffffff" : undefined
                   }}
                 >
                   {shareSuccess ? <Check size={14} slot="icon" strokeWidth={3} /> : <Share2 size={14} slot="icon" />}
                   {shareSuccess ? t("copied") : (isMalay ? "Kongsi Jadual" : "Share Schedule")}
                 </md-filled-button>

                 {/* Event tags styled as outline pills */}
                 {events.length > 0 && events.map((evt, i) => (
                   <div key={i} className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-white shadow-xs border border-white/5", evt.type === 'public' ? 'bg-[var(--md-sys-color-error)]' : (evt.color || 'bg-[var(--md-sys-color-primary)]'))}>
                     {evt.title}
                   </div>
                 ))}
               </div>
            </div>
          </div>
          
          {/* Editorial Grid Prayer Times Content */}
          <div className="p-6 sm:p-10 md:p-8 lg:p-10 bg-[var(--md-sys-color-surface)] md:flex-1 md:h-full md:overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-6 flex items-center gap-2 shrink-0">
              {isMalay ? "Waktu Solat" : "Prayer Times"}
              <div className="flex-1 h-px bg-[var(--md-sys-color-outline)]/10" />
            </h3>
            
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              className="grid grid-cols-2 gap-3 sm:gap-4 pb-2"
            >
              {timesToDisplay.map((k) => {
                const Icon = PRAYER_ICONS[k] as React.ComponentType<any>;
                return (
                  <motion.button
                    key={k}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.9 },
                      visible: { 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPrayerSelect(k)}
                    className={cn(
                      "flex flex-col items-start justify-center p-4 sm:p-5 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline)]/5 hover:border-[var(--md-sys-color-primary)]/30 hover:bg-[var(--md-sys-color-primary-container)]/10 rounded-[24px] sm:rounded-[32px] transition-colors duration-250 group cursor-pointer shadow-sm relative overflow-hidden",
                      visualStyle === "glass" && "border-none",
                      visualStyle === "retro" && "border-[3px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]"
                    )}
                  >
                    {/* @ts-ignore */}
                    <md-ripple></md-ripple>
                    <Icon size={24} strokeWidth={iconStroke} className="text-[var(--md-sys-color-primary)] opacity-70 group-hover:opacity-100 mb-2 sm:mb-3 shrink-0 transition-opacity" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">{t(k)}</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[var(--md-sys-color-on-surface)] mt-1 tracking-tighter">{day[k] ? day[k].substring(0, 5) : "--:--"}</span>
                    
                    {/* Decorative Background Icon */}
                    <Icon size={120} strokeWidth={iconStroke} className="absolute -right-6 -bottom-6 text-[var(--md-sys-color-on-surface)] opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none" />
                  </motion.button>
                )
              })}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
