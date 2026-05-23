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
  
  // Build a grid starting from Monday
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
      // 2024-01-01 was a Monday
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

  // Staggered grid animations
  const gridContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.008,
      }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 10 },
    show: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring", damping: 22, stiffness: 300 } 
    }
  };

  return (
    <div className={cn("flex flex-col w-full h-full min-h-[420px] transition-opacity duration-300", isLoading && "opacity-40 pointer-events-none")}>
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-[var(--md-sys-color-outline)]/12 mb-3 pb-1 shrink-0">
        {dayNames.map((dayName, idx) => {
          const isWeekend = idx >= 5; // Saturday & Sunday
          return (
            <div key={dayName} className={cn(
              "py-3 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors",
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
      
      {/* Day Cells Grid */}
      <motion.div 
        variants={gridContainerVariants}
        initial="hidden"
        animate="show"
        key={currentDate.toISOString()} // Force animation on month changes
        className="grid grid-cols-7 flex-1 auto-rows-[minmax(68px,1fr)] sm:auto-rows-[minmax(84px,1fr)] lg:auto-rows-[minmax(115px,1fr)] gap-2 lg:gap-3"
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
          const hasIslamicEvent = events.some(e => e.type === 'islamic');

          return (
            <motion.div
              variants={cellVariants}
              whileHover={{ 
                scale: isCurrentMonth ? 1.04 : 1, 
                y: isCurrentMonth ? -3 : 0,
                zIndex: 10,
                boxShadow: "0 10px 25px -10px rgba(0,0,0,0.15)"
              }}
              whileTap={{ scale: isCurrentMonth ? 0.97 : 1 }}
              onClick={() => {
                if (pData) onSelectDay(pData);
              }}
              className={cn(
                "relative flex flex-col p-2.5 sm:p-3 rounded-2xl sm:rounded-[22px] transition-all cursor-pointer overflow-hidden border border-[var(--md-sys-color-outline)]/8 select-none group",
                isCurrentMonth 
                  ? "bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-primary-container)]/10 text-[var(--md-sys-color-on-surface)]" 
                  : "bg-[var(--md-sys-color-surface-container-lowest)]/40 opacity-30 text-[var(--md-sys-color-on-surface-variant)]/30 hover:opacity-50",
                isCurrentDay && "bg-gradient-to-tr from-[var(--md-sys-color-primary-container)] to-[var(--md-sys-color-primary-container)]/80 ring-2 ring-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] z-[2] shadow-md shadow-[var(--md-sys-color-primary)]/10 hover:bg-[var(--md-sys-color-primary-container)]",
                visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] transition-all shrink-0",
                visualStyle === "glass" && isCurrentMonth && "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]",
                visualStyle === "soft" && "shadow-[var(--soft-shadow-light)]"
              )}
            >
              {/* Top Row: Gregorian & Hijri Date */}
              <div className="flex justify-between items-start shrink-0">
                <span className={cn(
                  "text-sm sm:text-base lg:text-xl font-black tabular-nums tracking-tighter transition-all",
                  isCurrentDay && "text-[var(--md-sys-color-primary)] scale-110",
                  !isCurrentDay && hasPublicHoliday && isCurrentMonth && "text-[var(--md-sys-color-error)]",
                  isCurrentMonth && !isCurrentDay && !hasPublicHoliday && "group-hover:text-[var(--md-sys-color-primary)]"
                )}>
                  {formattedDate}
                </span>
                
                {hijriParts && isCurrentMonth && (
                  <span className="text-[9px] sm:text-[10px] font-black text-[var(--md-sys-color-on-surface-variant)] opacity-50 mt-0.5 tabular-nums group-hover:text-[var(--md-sys-color-primary)] transition-colors">
                     {parseInt(hijriParts[2], 10)}
                  </span>
                )}
              </div>
              
              {/* Event indicators (Clean dot/badge indicators that never crowd text!) */}
              <div className="flex-1 flex flex-col justify-end w-full mt-2 space-y-1">
                {/* Horizontal row of colorful event dots on small screens */}
                <div className="flex gap-1 justify-center sm:justify-start items-center h-2 overflow-hidden">
                  {events.map((evt, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
                        evt.type === 'public' 
                          ? "bg-[var(--md-sys-color-error)]" 
                          : "bg-[var(--md-sys-color-primary)]"
                      )}
                      title={evt.title}
                    />
                  ))}
                </div>

                {/* Styled text description list for larger screens */}
                <div className="hidden lg:flex flex-col gap-1 w-full mt-1 overflow-hidden shrink-0">
                  {events.slice(0, 1).map((evt, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-lg truncate font-black tracking-wider uppercase text-white shadow-xs w-full text-center sm:text-left select-none",
                        evt.type === 'public' 
                          ? "bg-[var(--md-sys-color-error)]" 
                          : "bg-[var(--md-sys-color-primary)]"
                      )}
                      title={evt.title}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {events.length > 1 && (
                    <div className="text-[8px] font-black uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-65 ml-1 self-start">
                      +{events.length - 1} {settings.language === 'ms' ? 'lagi' : 'more'}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
