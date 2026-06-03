import { motion, AnimatePresence } from "motion/react";
import { X, CalendarDays, Info, Calendar } from "lucide-react";
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
  
  if (!day) return null;
  
  const dateObj = parse(day.date, "dd-MMM-yyyy", new Date());
  const isToday = day.date === format(new Date(), "dd-MMM-yyyy");
  const events = getAllEventsForDay(dateObj, day.hijri);
  const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;

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
            "bg-[var(--md-sys-color-surface)] w-full max-h-[92dvh] overflow-y-auto max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col transition-all duration-300",
            visualStyle === "retro" && "border-[4px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[12px_12px_0px_0px_var(--md-sys-color-on-surface)]",
            visualStyle === "glass" && "border-none",
            visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] rounded-t-[48px] sm:rounded-[48px] border border-[var(--md-sys-color-outline)]/5"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header Ticket (Editorial) */}
          <div className="bg-[var(--md-sys-color-surface-container-low)] p-6 sm:p-10 relative border-b border-[var(--md-sys-color-outline)]/8 select-none">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] rounded-full transition-colors z-10 shadow-sm cursor-pointer border border-[var(--md-sys-color-outline)]/5"
            >
              <X size={20} strokeWidth={iconStroke} />
            </motion.button>
            
            <div className="flex flex-col relative z-0">
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
               
               <p className="font-semibold text-[var(--md-sys-color-on-surface-variant)] mt-1.5 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
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
               
               {/* Event tags styled as outline pills */}
               {events.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 mt-3.5">
                   {events.map((evt, i) => (
                     <div key={i} className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-xs border border-white/5", evt.type === 'public' ? 'bg-[var(--md-sys-color-error)]' : (evt.color || 'bg-[var(--md-sys-color-primary)]'))}>
                       {evt.title}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
          
          {/* Editorial Grid Prayer Times Content */}
          <div className="p-6 sm:p-10 bg-[var(--md-sys-color-surface)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-6 flex items-center gap-2">
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
              className="grid grid-cols-2 gap-3 sm:gap-4"
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
