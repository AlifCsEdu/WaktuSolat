import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, isToday } from "date-fns";
import { ms, enUS } from "date-fns/locale";
import { motion } from "motion/react";
import { PrayerData } from "../../types";
import { getAllEventsForDay } from "../../lib/holidays";
import { cn } from "../../lib/utils";
import { useAppContext } from "../../AppContext";
import { useVisualStyle } from "../../hooks/useVisualStyle";

interface CalendarGridViewProps {
  currentDate: Date;
  monthData: PrayerData[];
  onSelectDay: (day: PrayerData) => void;
  isLoading?: boolean;
}

export function CalendarGridView({ currentDate, monthData, onSelectDay, isLoading }: CalendarGridViewProps) {
  const { settings } = useAppContext();
  const visualStyle = useVisualStyle();
  
  // Build 6-row calendar grid starting from Monday
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = useMemo(() => {
    const list = [];
    let day = startDate;
    while (day <= endDate) {
      list.push(day);
      day = addDays(day, 1);
    }
    return list;
  }, [startDate, endDate]);
  
  const dayNames = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      return format(addDays(new Date(2024, 0, 1), i), "EEEE", { locale: settings.language === 'ms' ? ms : enUS });
    });
  }, [settings.language]);
  
  // Lookup map to quickly retrieve prayer times by date string
  const dataMap = useMemo(() => {
    const map = new Map<string, PrayerData>();
    monthData.forEach(d => {
      map.set(d.date.toLowerCase(), d);
    });
    return map;
  }, [monthData]);

  const toJakimDateString = (d: Date) => {
     return format(d, "dd-MMM-yyyy").toLowerCase();
  };

  return (
    <div className={cn("flex flex-col w-full h-full min-h-0 flex-1 transition-opacity duration-300", isLoading && "opacity-40 pointer-events-none")}>
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-[var(--md-sys-color-outline)]/12 mb-1 sm:mb-2 pb-0.5 sm:pb-1 shrink-0">
        {dayNames.map((dayName, idx) => {
          const isWeekend = idx >= 5; 
          return (
            <div key={dayName} className={cn(
              "py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-black uppercase tracking-widest transition-colors select-none",
              isWeekend 
                ? "text-[var(--md-sys-color-error)]" 
                : "text-[var(--md-sys-color-on-surface-variant)]/70"
            )}>
              <span className="hidden sm:inline">{dayName}</span>
              <span className="sm:hidden">{dayName.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      
      {/* Day Cells Grid - Scroll-free h-full flex layout */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        <motion.div 
          key={currentDate.toISOString()} // Key resets animation on month change
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.015,
                delayChildren: 0.05
              }
            }
          }}
          className="grid grid-cols-7 grid-rows-6 gap-1.5 sm:gap-2 h-full w-full justify-items-center items-center sm:justify-items-stretch sm:items-stretch"
        >
          {days.map((d, i) => {
            const isCurrentMonth = isSameMonth(d, monthStart);
            const isCurrentDay = isToday(d);
            const formattedDate = format(d, "d");
            
            const jakimDateStr = toJakimDateString(d);
            const pData = dataMap.get(jakimDateStr);
            
            let hijriParts = null;
            let events: any[] = [];
            
            if (pData) {
              const hijriDate = pData.hijri; 
              hijriParts = hijriDate.split('-');
              events = getAllEventsForDay(d, hijriDate);
            } else {
              events = getAllEventsForDay(d, null);
            }
            
            const hasPublicHoliday = events.some(e => e.type === 'public');
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <motion.div
                key={d.toISOString()}
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 10 },
                  visible: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }
                }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ y: 1, scale: 0.98 }}
                onClick={() => {
                  if (pData) onSelectDay(pData);
                }}
                className={cn(
                  "relative flex flex-col items-center sm:items-stretch transition-all duration-250 border select-none group cursor-pointer overflow-hidden",
                  // Sizing: Very squircular/pill shaped
                  "w-full aspect-square max-w-[44px] sm:max-w-none sm:aspect-auto sm:h-full justify-center sm:justify-between p-1.5 sm:p-2.5",
                  "rounded-full sm:rounded-[24px] lg:rounded-[28px]",
                  // Colors
                  isCurrentMonth 
                    ? "text-[var(--md-sys-color-on-surface)]" 
                    : "opacity-35 text-[var(--md-sys-color-on-surface-variant)]/20",
                  isCurrentDay 
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-md shadow-[var(--md-sys-color-primary)]/20 font-bold z-[2]"
                    : isCurrentMonth
                      ? "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container-highest)] hover:border-[var(--md-sys-color-primary)]/30 border-[var(--md-sys-color-outline)]/5 text-[var(--md-sys-color-on-surface)]"
                      : "bg-transparent border-transparent",
                  // Tactile shadow
                  isCurrentMonth && !isCurrentDay && "shadow-[2px_2px_0px_0px_var(--md-sys-color-outline-variant)] hover:shadow-[4px_4px_0px_0px_var(--md-sys-color-primary)]/25",
                  // Visual Styles adaptation
                  visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)] sm:hover:translate-y-[-2px] sm:hover:shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]",
                  visualStyle === "glass" && "border-none shadow-none",
                  visualStyle === "soft" && !isCurrentDay && "shadow-[var(--soft-shadow-light)]"
                )}
                style={{
                  backgroundImage: !isCurrentMonth
                    ? "radial-gradient(var(--md-sys-color-outline-variant) 1px, transparent 1px)"
                    : isWeekend && !isCurrentDay
                      ? "repeating-linear-gradient(45deg, color-mix(in srgb, var(--md-sys-color-primary-container) 8%, transparent) 0, color-mix(in srgb, var(--md-sys-color-primary-container) 8%, transparent) 1.5px, transparent 1.5px, transparent 8px)"
                      : undefined,
                  backgroundSize: !isCurrentMonth ? "8px 8px" : undefined
                }}
              >
                {/* @ts-ignore */}
                <md-ripple></md-ripple>
                {/* Top Row: Date labels */}
                <div className="flex justify-center sm:justify-between items-center sm:items-start shrink-0 w-full z-10 relative">
                  <span className={cn(
                    "text-sm sm:text-lg lg:text-2xl font-black tabular-nums tracking-tighter transition-all",
                    isCurrentDay ? "text-[var(--md-sys-color-on-primary)]" : !isCurrentMonth ? "text-[var(--md-sys-color-on-surface-variant)]/40" : "",
                    !isCurrentDay && hasPublicHoliday && isCurrentMonth && "text-[var(--md-sys-color-error)] group-hover:text-[var(--md-sys-color-on-error-container)]",
                  )}>
                    {formattedDate}
                  </span>
                  
                  {hijriParts && isCurrentMonth && (
                    <span className={cn(
                      "hidden sm:inline text-[9px] font-black opacity-50 tabular-nums transition-colors",
                      isCurrentDay 
                        ? "text-[var(--md-sys-color-on-primary)] opacity-80" 
                        : "text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)]"
                    )}>
                       {parseInt(hijriParts[2], 10)}
                    </span>
                  )}
                </div>
                
                {/* Event Indicators Row */}
                <div className="flex flex-col justify-end w-full shrink-0 mt-0.5 sm:mt-auto z-10 relative">
                  {/* Distinctive Badges for desktop */}
                  <div className="hidden lg:flex flex-col gap-1 w-full overflow-hidden">
                    {events.slice(0, 2).map((evt, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-[6px] truncate font-black tracking-wider uppercase shadow-xs w-full text-left select-none",
                          evt.type === 'public' 
                            ? isCurrentDay ? "bg-white/20 text-white" : "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]" 
                            : isCurrentDay ? "bg-black/10 text-white" : "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]"
                        )}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[9px] px-1 font-black text-[var(--md-sys-color-on-surface-variant)]/60">
                        +{events.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Expressive Dots for mobile/tablet */}
                  <div className="flex lg:hidden gap-1 justify-center sm:justify-start items-center h-2 overflow-hidden mt-1">
                    {events.slice(0, 3).map((evt, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
                          evt.type === 'public' 
                            ? isCurrentDay ? "bg-white" : "bg-[var(--md-sys-color-error)]" 
                            : isCurrentDay ? "bg-white/80" : "bg-[var(--md-sys-color-tertiary)]"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
