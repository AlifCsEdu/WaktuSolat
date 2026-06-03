import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "motion/react";
import "@material/web/tabs/tabs.js";
import "@material/web/tabs/primary-tab.js";
import "@material/web/tabs/secondary-tab.js";
import { format, parse, addMonths, subMonths, startOfMonth, addDays, subDays, isSameDay, isSameWeek } from "date-fns";
import { ms, enUS } from "date-fns/locale";
import { PrayerData, PrayerKey } from "../types";
import { PRAYER_NAMES, PRAYER_ICONS } from "./PrayerSchedule";
import { Moon, Sun, Sunrise, Sunset, SunDim, SunMedium, X, Info, ChevronLeft, ChevronRight, Loader2, Calendar, CalendarDays, CalendarRange, Copy, Check, ListTree, Clock, PartyPopper } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppContext } from "../AppContext";
import { getHijriFormatted } from "../lib/holidays";

import { CalendarGridView } from "./calendar/CalendarGridView";
import { PrayerTimesListView } from "./calendar/PrayerTimesListView";
import { EventsListView } from "./calendar/EventsListView";
import { SelectedDayModal } from "./calendar/SelectedDayModal";
import { modalVariants, M3_EASING } from "../lib/motion";
import { useVisualStyle, useIconStroke } from "../hooks/useVisualStyle";

export type CalendarTab = "grid" | "list" | "public_holidays" | "islamic_events";
export type ListViewFilter = "daily" | "weekly" | "monthly";

const calendarVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    y: 10,
    transition: { duration: 0.15, ease: M3_EASING.emphasizedAccelerate as any }
  }
};

export function FullCalendar({
  isOpen,
  initialMonthData,
  selectedZone,
  onClose
}: {
  isOpen: boolean;
  initialMonthData: PrayerData[];
  selectedZone: string;
  onClose: () => void;
}) {
  const { t, settings } = useAppContext();
  const visualStyle = useVisualStyle();
  const iconStroke = useIconStroke();
  
  const [activeTab, setActiveTab] = useState<CalendarTab>("grid");
  const [view, setView] = useState<ListViewFilter>("monthly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const [dataCache, setDataCache] = useState<Record<string, PrayerData[]>>({
    [format(new Date(), "yyyy-MM")]: initialMonthData
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingState, setShowLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayData, setSelectedDayData] = useState<PrayerData | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<{
    key: PrayerKey,
    time: string,
    dateValue: string,
    hijriValue: string,
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const getPrayerDesc = (key: string) => {
    return t(`${key}Desc` as any);
  };

  useEffect(() => {
    let timer: any;
    if (isLoading) {
      timer = setTimeout(() => setShowLoadingState(true), 200);
    } else {
      setShowLoadingState(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMonthData = async (date: Date) => {
      const key = format(date, "yyyy-MM");
      if (dataCache[key]) return; // Already cached
      
      setIsLoading(true);
      setError(null);
      try {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const url = `/api/solat/${selectedZone}?year=${y}&month=${m}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed");
        
        let data;
        try {
          data = await res.json();
        } catch (e) {
          throw new Error("Invalid calendar JSON");
        }
        
        setDataCache(prev => ({
          ...prev,
          [key]: data.prayerTime || []
        }));
      } catch (err) {
        setError(t("failedToLoad"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthData(currentDate);
    
    if (activeTab === "list" && view === "weekly") {
      const mon = new Date(currentDate);
      const start = subDays(mon, mon.getDay());
      const end = addDays(mon, 6);
      
      if (start.getMonth() !== currentDate.getMonth()) fetchMonthData(start);
      if (end.getMonth() !== currentDate.getMonth()) fetchMonthData(end);
    }
  }, [currentDate, selectedZone, view, dataCache, isOpen, activeTab, t]);

  const handlePrev = () => {
    if (activeTab === "list" && view === "daily") setCurrentDate(prev => subDays(prev, 1));
    else if (activeTab === "list" && view === "weekly") setCurrentDate(prev => subDays(prev, 7));
    else setCurrentDate(prev => subMonths(startOfMonth(prev), 1));
  };
  
  const handleNext = () => {
    if (activeTab === "list" && view === "daily") setCurrentDate(prev => addDays(prev, 1));
    else if (activeTab === "list" && view === "weekly") setCurrentDate(prev => addDays(prev, 7));
    else setCurrentDate(prev => addMonths(startOfMonth(prev), 1));
  };

  // Pre-process Data
  const allAvailableData: PrayerData[] = [];
  Object.values(dataCache).forEach(arr => {
    if (Array.isArray(arr)) {
      allAvailableData.push(...arr);
    }
  });
  
  const displayData = allAvailableData.filter(day => {
    const d = parse(day.date, "dd-MMM-yyyy", new Date());
    if (activeTab === "list" && view === "daily") return isSameDay(d, currentDate);
    if (activeTab === "list" && view === "weekly") return isSameWeek(d, currentDate, { weekStartsOn: 1 });
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  }).sort((a, b) => parse(a.date, "dd-MMM-yyyy", new Date()).getTime() - parse(b.date, "dd-MMM-yyyy", new Date()).getTime());

  const uniqueMap = new Map<string, PrayerData>();
  displayData.forEach(item => uniqueMap.set(item.date, item));
  const uniqueDisplayData = Array.from(uniqueMap.values());

  const handleCopy = () => {
    if (uniqueDisplayData.length === 0) return;
    const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;

    let text = `${t("schedule")} - ${selectedZone}\n\n`;
    
    uniqueDisplayData.forEach(day => {
      const formattedHijri = getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, settings.hijriFormat || "both", settings.language, day.hijri);
      text += `${t("date")}: ${day.date.replace(/-/g, " ")} (${formattedHijri} - ${day.day})\n`;
      timesToDisplay.forEach(k => {
        text += `${t(k)}: ${day[k] ? day[k].substring(0, 5) : "--:--"}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  const isWallpaperActive = settings.wallpaperEnabled;

  return (
    <>
      <AnimatePresence>
        <motion.div
           variants={calendarVariants}
           initial="hidden"
           animate="visible"
           exit="exit"
           className={cn(
             "fixed inset-0 z-40 w-full h-full flex flex-col font-sans text-[var(--md-sys-color-on-background)] overflow-hidden transition-all duration-300 select-none",
             isWallpaperActive
               ? "bg-black/60 backdrop-blur-3xl"
               : visualStyle === 'glass'
                 ? "bg-[var(--glass-bg)]/85 backdrop-blur-[28px] border border-[var(--glass-border)]"
                 : "bg-[var(--md-sys-color-background)]",
             visualStyle === 'soft' && "shadow-[var(--soft-shadow-heavy)] bg-[var(--md-sys-color-background)]",
             visualStyle === 'retro' && "border-[4px] border-[var(--md-sys-color-on-surface)] rounded-none"
           )}
           style={{
             backgroundImage: !isWallpaperActive && visualStyle !== 'glass'
               ? "radial-gradient(var(--md-sys-color-outline-variant) 1px, transparent 1px)"
               : undefined,
             backgroundSize: "24px 24px"
           }}
        >
          {/* STICKY HEADER ZONE */}
          <div className={cn(
            "sticky top-0 z-50 border-b border-[var(--md-sys-color-outline)]/12 shadow-sm shrink-0 transition-all duration-300",
            isWallpaperActive ? "bg-black/20 backdrop-blur-md" : visualStyle === 'glass' ? "bg-white/5 backdrop-blur-md" : "bg-[var(--md-sys-color-surface)]/90 backdrop-blur-2xl"
          )}>
            <div className="max-w-7xl mx-auto w-full p-3 sm:p-4 lg:py-4 lg:px-6 flex flex-col gap-2.5 sm:gap-3.5">
              
              {/* Top Title & Close Button */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shrink-0 shadow-sm border border-[var(--md-sys-color-outline)]/10">
                    <CalendarRange size={24} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="md3-display-small sm:md3-display-medium font-black tracking-tighter text-[var(--md-sys-color-primary)] leading-none mb-0.5">
                      {t("calendar")}
                    </h2>
                    <p className="font-bold text-[var(--md-sys-color-on-surface-variant)] text-[10px] sm:text-xs uppercase tracking-widest opacity-85">
                      {t("extensiveCalendarDesc")}
                    </p>
                  </div>
                </div>

                <div className="hidden lg:flex flex-col items-end border-l border-[var(--md-sys-color-outline)]/12 pl-6 ml-auto mr-4 select-none font-mono">
                  <span className="text-3xl font-black text-[var(--md-sys-color-primary)] leading-none tracking-tighter">
                    {format(currentDate, "yyyy")}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] mt-1">
                    {format(currentDate, "MMMM", { locale: settings.language === 'ms' ? ms : enUS })}
                  </span>
                </div>

                {/* @ts-ignore */}
                <md-filled-tonal-icon-button
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  <X size={18} strokeWidth={iconStroke} />
                </md-filled-tonal-icon-button>
              </div>

              {/* Custom Bouncy Segmented Control */}
              <div className="w-full shrink-0 pt-2 pb-1">
                <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/5 rounded-[24px] sm:flex sm:rounded-full shadow-inner w-full sm:w-max mx-auto">
                  {[
                    { id: "grid", icon: CalendarDays, label: t("calendarGrid") },
                    { id: "list", icon: ListTree, label: t("schedule") },
                    { id: "public_holidays", icon: PartyPopper, label: t("publicHolidays") },
                    { id: "islamic_events", icon: Moon, label: t("islamicEvents") },
                  ].map((tab) => {
                    const isActive = tab.id === activeTab;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as CalendarTab)}
                        className={cn(
                          "relative overflow-hidden flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[10.5px] sm:text-sm font-black uppercase tracking-tight sm:tracking-wider rounded-xl sm:rounded-full transition-colors whitespace-nowrap cursor-pointer z-10 w-full sm:w-auto",
                          isActive ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]"
                        )}
                      >
                        {/* @ts-ignore */}
                        <md-ripple></md-ripple>
                        {isActive && (
                          <motion.div
                            layoutId="calendarTabIndicator"
                            className="absolute inset-0 bg-[var(--md-sys-color-primary)] rounded-xl sm:rounded-full shadow-md z-[-1]"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <Icon size={14} strokeWidth={iconStroke + 0.5} className="shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation and Date Controls Row */}
              {activeTab !== "public_holidays" && activeTab !== "islamic_events" && (
                <div className={cn(
                  activeTab === "grid" 
                    ? "flex items-center justify-center py-1 sm:py-2 shrink-0 w-full" 
                    : "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-low)] p-2.5 px-4 rounded-[20px] border border-[var(--md-sys-color-outline)]/5 shadow-sm transition-colors",
                  visualStyle === 'glass' && activeTab !== "grid" && "bg-[var(--glass-bg)]/30 backdrop-blur-sm border-[var(--glass-border)]"
                )}>
                  {activeTab === "list" ? (
                    <div className="flex bg-[var(--md-sys-color-surface-container-high)] p-1 rounded-xl shadow-inner shrink-0 overflow-x-auto no-scrollbar">
                      {(["daily", "weekly", "monthly"] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setView(v)}
                          className={cn(
                            "relative overflow-hidden px-4 py-1.5 rounded-lg font-black text-xs transition-all duration-200 whitespace-nowrap cursor-pointer",
                            view === v 
                              ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm" 
                              : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]"
                          )}
                        >
                          {/* @ts-ignore */}
                          <md-ripple></md-ripple>
                          {t(v as any)}
                        </button>
                      ))}
                    </div>
                  ) : activeTab === "grid" ? null : (
                    <div className="hidden sm:block text-[10px] font-bold opacity-0">.</div> 
                  )}
                  
                  <div className={cn(
                    "flex flex-wrap items-center gap-2.5 shrink-0",
                    activeTab === "grid" ? "justify-center w-full sm:w-auto" : "w-full sm:w-auto justify-center sm:justify-end"
                  )}>
                    {activeTab === 'list' && (
                      <div className="shrink-0 sm:mr-1">
                        {/* @ts-ignore */}
                        <md-filled-tonal-button
                          onClick={handleCopy}
                          disabled={uniqueDisplayData.length === 0}
                          title={t("copySchedule")}
                          className="shrink-0 cursor-pointer"
                          style={{
                            '--md-filled-tonal-button-container-height': '40px',
                            '--md-filled-tonal-button-container-shape': '20px',
                            '--md-filled-tonal-button-label-text-size': '13px',
                            '--md-filled-tonal-button-horizontal-padding': '16px',
                          } as any}
                        >
                          {isCopied ? <Check size={16} slot="icon" /> : <Copy size={16} slot="icon" />}
                          {isCopied ? t("copied") : t("copy")}
                        </md-filled-tonal-button>
                      </div>
                    )}
                    
                    {/* Jump to Today Button */}
                    {!(currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() && view === "monthly") && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                        className="shrink-0"
                      >
                        {/* @ts-ignore */}
                        <md-filled-tonal-button
                          onClick={() => setCurrentDate(new Date())}
                          className="shrink-0 cursor-pointer"
                          style={{
                            '--md-filled-tonal-button-container-height': '40px',
                            '--md-filled-tonal-button-container-shape': '20px',
                            '--md-filled-tonal-button-label-text-size': '13px',
                            '--md-filled-tonal-button-horizontal-padding': '16px',
                          } as any}
                        >
                          <Calendar size={16} slot="icon" strokeWidth={iconStroke + 0.5} />
                          {t("today") || "Today"}
                        </md-filled-tonal-button>
                      </motion.div>
                    )}

                    {/* Chunky Cassette Nav Block */}
                    <div className={cn(
                      "flex items-center gap-1.5 sm:gap-2 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] shrink-0 transition-all duration-250 hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_var(--md-sys-color-on-surface)]",
                      visualStyle === "retro" && "rounded-none",
                      visualStyle === "soft" && "shadow-[var(--soft-shadow-light)] border-[var(--md-sys-color-outline)]/10"
                    )}>
                      {/* @ts-ignore */}
                      <md-filled-icon-button 
                        onClick={handlePrev}
                        disabled={isLoading}
                        className="cursor-pointer"
                      >
                        <ChevronLeft size={20} strokeWidth={iconStroke} />
                      </md-filled-icon-button>
                      
                      <h3 className="text-xs sm:text-sm font-black min-w-[125px] sm:min-w-[145px] text-center uppercase tracking-widest text-[var(--md-sys-color-on-surface)] px-2 flex items-center justify-center gap-2 select-none font-mono">
                        {activeTab === "list" && view === "daily" 
                          ? format(currentDate, "dd MMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })
                          : activeTab === "list" && view === "weekly"
                            ? `${t("week")} ${format(currentDate, "w")}, ${format(currentDate, "yyyy")}`
                            : format(currentDate, "MMMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
                      </h3>
                      
                      {/* @ts-ignore */}
                      <md-filled-icon-button 
                        onClick={handleNext}
                        disabled={isLoading}
                        className="cursor-pointer"
                      >
                        <ChevronRight size={20} strokeWidth={iconStroke} />
                      </md-filled-icon-button>
                    </div>

                    {showLoadingState && <Loader2 size={20} className="animate-spin text-[var(--md-sys-color-primary)] shrink-0 ml-1" strokeWidth={3} />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SCROLLABLE CONTENT ZONE - Dynamically binds grid height to fit viewport without scrolling */}
          <div className={cn(
            "flex-1 w-full custom-scrollbar bg-transparent min-h-0",
            activeTab === "grid" 
              ? "p-2 sm:p-4 lg:p-5 overflow-hidden flex flex-col" 
              : "p-4 sm:p-5 lg:p-6 overflow-y-auto"
          )}>
            <div className={cn(
              "max-w-7xl mx-auto w-full h-full flex flex-col min-h-0",
              activeTab === "grid" && "flex-1"
            )}>
              {error && (
                <div className="w-full p-4 mb-4 text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] rounded-2xl font-black text-center shadow-xs text-xs uppercase tracking-wider">
                  {error}
                </div>
              )}

              {/* Main Tab Render Switcher */}
              <div className={cn(
                "flex-1 min-h-0 w-full animate-in fade-in zoom-in duration-200",
                activeTab === "grid" && "flex flex-col"
              )}>
                {activeTab === "grid" && (
                  <div className={cn(
                    "bg-[var(--md-sys-color-surface-container-low)] shadow-sm rounded-[32px] border border-[var(--md-sys-color-outline)]/10 p-2.5 sm:p-4 lg:p-5 flex-1 flex flex-col min-h-0 transition-all duration-300",
                    visualStyle === 'glass' && "bg-[var(--glass-bg)]/40 backdrop-blur-md border-[var(--glass-border)] shadow-inner"
                  )}>
                    <CalendarGridView 
                      currentDate={currentDate} 
                      monthData={uniqueDisplayData} 
                      isLoading={showLoadingState}
                      onSelectDay={(day) => setSelectedDayData(day)}
                    />
                  </div>
                )}
                {activeTab === "list" && (
                  <PrayerTimesListView 
                    data={uniqueDisplayData} 
                    view={view}
                    isLoading={showLoadingState}
                    onPrayerSelect={(p) => setSelectedPrayer(p)}
                  />
                )}
                {activeTab === "public_holidays" && (
                  <EventsListView currentDate={currentDate} type="public" />
                )}
                {activeTab === "islamic_events" && (
                  <EventsListView currentDate={currentDate} type="islamic" />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SelectedDayModal 
        day={selectedDayData} 
        onClose={() => setSelectedDayData(null)}
        onPrayerSelect={(k) => {
          if (selectedDayData) {
            setSelectedPrayer({
              key: k as PrayerKey,
              time: selectedDayData[k as PrayerKey] ? selectedDayData[k as PrayerKey]!.substring(0, 5) : "--:--",
              dateValue: selectedDayData.date,
              hijriValue: selectedDayData.hijri
            });
          }
        }}
      />

      {/* Selected Individual Prayer Modal */}
      <AnimatePresence>
        {(selectedPrayer) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={() => setSelectedPrayer(null)}
          >
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "bg-[var(--md-sys-color-surface)] w-full max-w-sm rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-2xl transition-all duration-300",
                visualStyle === "retro" && "border-[3px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[8px_8px_0px_0px_var(--md-sys-color-on-surface)]",
                visualStyle === "glass" && "bg-[var(--glass-bg)]/90 backdrop-blur-lg border border-[var(--glass-border)]",
                visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] border border-white/5"
              )}
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-tr from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-primary-container)] text-white p-6 md:p-8 relative overflow-hidden">
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedPrayer(null)}
                  className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/25 rounded-full transition-colors z-10 cursor-pointer"
                >
                  <X size={16} strokeWidth={iconStroke} />
                </motion.button>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  {(() => {
                    const Icon = PRAYER_ICONS[selectedPrayer.key] as any;
                    return <Icon size={42} className="mb-3 opacity-90 drop-shadow-md" />;
                  })()}
                  <h3 className="text-2xl font-black mb-1 drop-shadow-sm">{t(selectedPrayer.key as any)}</h3>
                  <div className="text-4xl font-mono font-bold tracking-tighter drop-shadow-md my-2">
                    {selectedPrayer.time}
                  </div>
                  <div className="text-[11px] opacity-85 mt-2 font-black uppercase tracking-wider">
                    {selectedPrayer.dateValue.replace(/-/g, " ")} • {getHijriFormatted(selectedPrayer.dateValue, settings.hijriMethod, settings.hijriAdjustment, settings.hijriFormat || "both", settings.language, selectedPrayer.hijriValue).split(" (")[0]}
                  </div>
                </div>
                
                {/* Background decorative circles */}
                <div className="absolute -top-24 -right-24 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-44 h-44 bg-black/5 rounded-full pointer-events-none" />
              </div>

              <div className="p-6 md:p-8 bg-[var(--md-sys-color-surface)]">
                <div className="flex gap-3.5 items-start">
                  <div className="p-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] rounded-full shrink-0">
                    <Info size={16} strokeWidth={iconStroke} />
                  </div>
                  <p className="text-[var(--md-sys-color-on-surface)] text-xs leading-relaxed font-semibold">
                    {getPrayerDesc(selectedPrayer.key)}
                  </p>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPrayer(null)}
                  className="w-full mt-6 py-2.5 px-4 bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-secondary-container)] hover:text-[var(--md-sys-color-on-secondary-container)] font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs border border-[var(--md-sys-color-outline)]/10"
                >
                  {t("close")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
