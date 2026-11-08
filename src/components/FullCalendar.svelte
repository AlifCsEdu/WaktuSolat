<script lang="ts">
  import { appSettings } from '../state/settings.svelte';
  import { format, parse, addMonths, subMonths, startOfMonth, addDays, subDays, isSameDay, isSameWeek } from "date-fns";
  import { ms, enUS } from "date-fns/locale";
  import type { PrayerData, PrayerKey } from "../types";
  import { Moon, Sun, Sunrise, Sunset, SunDim, SunMedium, X, Info, ChevronLeft, ChevronRight, Loader2, Calendar, CalendarDays, CalendarRange, Copy, Check, ListTree, Clock, PartyPopper, Share2 } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { getHijriFormatted, getAllEventsForDay } from "../lib/holidays";
  import { getOfflinePrayers } from "../lib/db";
  import { StorageManager } from "../lib/StorageManager";

  import CalendarGridView from "./calendar/CalendarGridView.svelte";
  import PrayerTimesListView from "./calendar/PrayerTimesListView.svelte";
  import EventsListView from "./calendar/EventsListView.svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide, m3Scale as scale, send, receive } from "../lib/transitions";
  import { Button, IconButton } from "$lib/components/ui";
  import { ripple } from "$lib/actions/ripple";

  let { 
    selectedZone,
    initialDate = null,
    onBack,
    onClose = onBack,
    isOpen = true,
    initialMonthData = []
  } = $props<{
    selectedZone: string;
    initialDate?: string | null;
    onBack?: () => void;
    onClose?: () => void;
    isOpen?: boolean;
    initialMonthData?: PrayerData[];
  }>();

  let activeTab = $state<"grid" | "list" | "public_holidays" | "islamic_events">("grid");
  let view = $state<"daily" | "weekly" | "monthly">("monthly");

  function parseInitialDate(dateStr?: string | null): Date {
    if (dateStr) {
      try {
        const d = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (!isNaN(d.getTime())) return d;
      } catch {}
    }
    return new Date();
  }

  let currentDate = $state<Date>(parseInitialDate(initialDate));

  $effect(() => {
    if (initialDate) {
      const d = parseInitialDate(initialDate);
      if (!isNaN(d.getTime())) {
        currentDate = d;
      }
    }
  });

  let prevTab = $state<string>("grid");
  let slideDirection = $state<number>(0);

  $effect(() => {
    const tabOrder = ["grid", "list", "public_holidays", "islamic_events"];
    const prevIndex = tabOrder.indexOf(prevTab);
    const currIndex = tabOrder.indexOf(activeTab);
    if (currIndex !== prevIndex) {
      slideDirection = currIndex > prevIndex ? 1 : -1;
      prevTab = activeTab;
    }
  });
  
  let dataCache = $state<Record<string, PrayerData[]>>({});
  
  $effect(() => {
    if (initialMonthData && initialMonthData.length >= 28) {
      const key = format(new Date(), "yyyy-MM");
      if (!dataCache[key]) {
        dataCache[key] = initialMonthData;
      }
    }
  });
  
  let isLoading = $state(false);
  let showLoadingState = $state(false);
  let error = $state<string | null>(null);

  let selectedDayData = $state<PrayerData | null>(null);
  let selectedPrayer = $state<{
    key: PrayerKey,
    time: string,
    dateValue: string,
    hijriValue: string,
  } | null>(null);
  let isCopied = $state(false);

  let settings = $derived(appSettings.settings);
  let visualStyle = $derived(settings.visualStyle || 'default');
  let iconStroke = $derived(visualStyle === 'retro' ? 3 : visualStyle === 'glass' || visualStyle === 'soft' ? 1.5 : 2);
  let isWallpaperActive = $derived(settings.wallpaperEnabled);

  const t = (key: string) => appSettings.t(key as any);
  const getPrayerDesc = (key: string) => t(`${key}Desc`);

  const PRAYER_ICONS: Record<string, any> = {
    imsak: Moon,
    fajr: SunDim,
    syuruk: Sunrise,
    dhuhr: Sun,
    asr: SunMedium,
    maghrib: Sunset,
    isha: Moon
  };

  $effect(() => {
    let timer: any;
    if (isLoading) {
      timer = setTimeout(() => showLoadingState = true, 200);
    } else {
      showLoadingState = false;
    }
    return () => clearTimeout(timer);
  });

  const loadFromOfflineCache = async (date: Date): Promise<boolean> => {
    const targetKey = format(date, "yyyy-MM");
    try {
      // 1. Try IndexedDB
      const cached = await getOfflinePrayers(selectedZone);
      if (cached && Array.isArray(cached.prayerTime) && cached.prayerTime.length > 0) {
        // Partition all available cached months into dataCache
        const partitioned: Record<string, PrayerData[]> = {};
        for (const pt of cached.prayerTime) {
          try {
            const d = parse(pt.date, "dd-MMM-yyyy", new Date());
            const k = format(d, "yyyy-MM");
            if (!partitioned[k]) partitioned[k] = [];
            partitioned[k].push(pt);
          } catch {}
        }
        
        if (partitioned[targetKey] && partitioned[targetKey].length > 0) {
          dataCache = { ...dataCache, ...partitioned };
          error = null;
          return true;
        }
      }

      // 2. Secondary fallback: StorageManager localStorage cache
      const localData = StorageManager.getCachedPrayerData(selectedZone);
      if (Array.isArray(localData) && localData.length > 0) {
        const matchingDays = localData.filter(pt => {
          try {
            const d = parse(pt.date, "dd-MMM-yyyy", new Date());
            return format(d, "yyyy-MM") === targetKey;
          } catch {
            return false;
          }
        });
        if (matchingDays.length > 0) {
          dataCache = { ...dataCache, [targetKey]: matchingDays };
          error = null;
          return true;
        }
      }
    } catch (e) {
      console.warn("Failed to load calendar data from offline cache:", e);
    }
    return false;
  };

  $effect(() => {
    if (!isOpen) return;

    const fetchMonthData = async (date: Date) => {
      const key = format(date, "yyyy-MM");
      if (dataCache[key] && dataCache[key].length > 0) {
        error = null;
        return;
      }
      
      isLoading = true;
      error = null;

      // If offline, read directly from IndexedDB without network delay
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const loaded = await loadFromOfflineCache(date);
        if (!loaded) {
          error = t("failedToLoad");
        }
        isLoading = false;
        return;
      }

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
        
        dataCache = { ...dataCache, [key]: data.prayerTime || [] };
      } catch (err) {
        const recovered = await loadFromOfflineCache(date);
        if (!recovered) {
          error = t("failedToLoad");
        }
      } finally {
        isLoading = false;
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
  });

  const handlePrev = () => {
    if (activeTab === "list" && view === "daily") currentDate = subDays(currentDate, 1);
    else if (activeTab === "list" && view === "weekly") currentDate = subDays(currentDate, 7);
    else currentDate = subMonths(startOfMonth(currentDate), 1);
  };
  
  const handleNext = () => {
    if (activeTab === "list" && view === "daily") currentDate = addDays(currentDate, 1);
    else if (activeTab === "list" && view === "weekly") currentDate = addDays(currentDate, 7);
    else currentDate = addMonths(startOfMonth(currentDate), 1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
    }
  };

  const handleWindowKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (selectedPrayer) {
        selectedPrayer = null;
      } else if (selectedDayData) {
        selectedDayData = null;
      } else {
        onClose();
      }
    }
  };

  let allAvailableData = $derived.by(() => {
    const res: PrayerData[] = [];
    Object.values(dataCache).forEach(arr => {
      if (Array.isArray(arr)) {
        res.push(...arr);
      }
    });
    return res;
  });

  let displayData = $derived(allAvailableData.filter(day => {
    const d = parse(day.date, "dd-MMM-yyyy", new Date());
    if (activeTab === "list" && view === "daily") return isSameDay(d, currentDate);
    if (activeTab === "list" && view === "weekly") return isSameWeek(d, currentDate, { weekStartsOn: 1 });
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  }).sort((a, b) => parse(a.date, "dd-MMM-yyyy", new Date()).getTime() - parse(b.date, "dd-MMM-yyyy", new Date()).getTime()));

  let uniqueDisplayData = $derived.by(() => {
    const uniqueMap = new Map<string, PrayerData>();
    displayData.forEach(item => uniqueMap.set(item.date, item));
    return Array.from(uniqueMap.values());
  });

  let currentHijriMonthRange = $derived.by(() => {
    if (uniqueDisplayData.length === 0) return "";
    const first = uniqueDisplayData[0];
    const last = uniqueDisplayData[uniqueDisplayData.length - 1];
    const h1 = getHijriFormatted(first.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language, first.hijri);
    const h2 = getHijriFormatted(last.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language, last.hijri);
    const m1 = h1.split(" ")[1] || "";
    const m2 = h2.split(" ")[1] || "";
    const y = h2.split(" ")[2] || "";
    if (m1 && m2 && m1 !== m2) {
      return `${m1} – ${m2} ${y}`;
    }
    return `${m1 || m2} ${y}`;
  });

  let initialDateResolved = $state(!initialDate);
  let lastInitialDate = $state(initialDate);

  // Track initialDate prop changes (e.g. browser back/forward)
  $effect(() => {
    if (initialDate !== lastInitialDate) {
      lastInitialDate = initialDate;
      initialDateResolved = !initialDate;
      if (!initialDate) {
        selectedDayData = null;
      }
    }
  });

  // Pick up initialDate param into selectedDayData once data arrives
  $effect(() => {
    if (!initialDateResolved && initialDate) {
      const currentMonthKey = format(currentDate, "yyyy-MM");
      const monthLoaded = dataCache[currentMonthKey] !== undefined;

      if (monthLoaded || uniqueDisplayData.length > 0) {
        try {
          const parsed = parse(initialDate, 'yyyy-MM-dd', new Date());
          const targetDateStr = format(parsed, 'dd-MMM-yyyy');
          const found = uniqueDisplayData.find(d => d.date.toLowerCase() === targetDateStr.toLowerCase());
          if (found) {
            selectedDayData = found;
          }
        } catch {}
        initialDateResolved = true;
      } else if (error) {
        // Stop waiting if fetching encountered an error
        initialDateResolved = true;
      }
    }
  });

  // Synchronize URL search params with selectedDayData
  $effect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;

      if (selectedDayData) {
        try {
          const d = parse(selectedDayData.date, "dd-MMM-yyyy", new Date());
          const formatted = format(d, 'yyyy-MM-dd');
          if (url.searchParams.get('date') !== formatted) {
            url.searchParams.set('date', formatted);
            changed = true;
          }
        } catch {}
      } else if (initialDateResolved) {
        // Only remove ?date= if initial date resolution has finished
        if (url.searchParams.has('date')) {
          url.searchParams.delete('date');
          changed = true;
        }
      }

      if (changed) {
        window.history.replaceState({}, '', url.toString());
      }
    }
  });

  let selectedDayDateObj = $derived(selectedDayData ? parse(selectedDayData.date, "dd-MMM-yyyy", new Date()) : null);
  let selectedDayEvents = $derived(selectedDayData && selectedDayDateObj ? getAllEventsForDay(selectedDayDateObj, selectedDayData.hijri) : []);
  let isTodaySelected = $derived(selectedDayData ? selectedDayData.date === format(new Date(), "dd-MMM-yyyy") : false);
  let dayShareSuccess = $state(false);

  const handleShareSelectedDay = () => {
    if (!selectedDayData) return;
    const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;
    let text = `${selectedDayData.date.replace(/-/g, " ")} (${getHijriFormatted(selectedDayData.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, selectedDayData.hijri)} - ${selectedDayData.day})\n`;
    timesToDisplay.forEach(k => {
      const val = (selectedDayData as any)[k];
      text += `${t(k)}: ${val ? val.substring(0, 5) : "--:--"}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      dayShareSuccess = true;
      setTimeout(() => dayShareSuccess = false, 2000);
    });
  };

  const handleCopy = () => {
    if (uniqueDisplayData.length === 0) return;
    const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;

    let text = `${t("schedule")} - ${selectedZone}\n\n`;
    
    uniqueDisplayData.forEach(day => {
      const formattedHijri = getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, settings.hijriFormat || "both", settings.language, day.hijri);
      text += `${t("date")}: ${day.date.replace(/-/g, " ")} (${formattedHijri} - ${day.day})\n`;
      timesToDisplay.forEach(k => {
        const timeValue = day[k as keyof PrayerData] as string;
        text += `${t(k)}: ${timeValue ? timeValue.substring(0, 5) : "--:--"}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      isCopied = true;
      setTimeout(() => isCopied = false, 2000);
    });
  };

  const TABS = [
    { id: "grid", icon: CalendarDays, label: t("calendarGrid") },
    { id: "list", icon: ListTree, label: t("schedule") },
    { id: "public_holidays", icon: PartyPopper, label: t("publicHolidays") },
    { id: "islamic_events", icon: Moon, label: t("islamicEvents") },
  ] as const;
  
  const VIEWS = ["daily", "weekly", "monthly"] as const;
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<div
  class="relative w-full flex-1 flex flex-col min-h-0 font-sans text-[var(--md-sys-color-on-background)] bg-[var(--md-sys-color-background)] select-none"
  style:view-transition-name="calendar-transition"
>
  <!-- STICKY HEADER ZONE -->
  <div class={cn(
    "sticky top-0 z-30 border-b border-[var(--md-sys-color-outline)]/12 shadow-sm shrink-0 transition-all duration-300",
    isWallpaperActive ? "bg-black/20 backdrop-blur-md" : visualStyle === 'glass' ? "bg-white/5 backdrop-blur-md" : "bg-[var(--md-sys-color-surface)]/90 backdrop-blur-2xl"
  )}>
  <div class="max-w-7xl mx-auto w-full p-3 sm:p-4 lg:py-4 lg:px-6 flex flex-col gap-2.5 sm:gap-3.5">
    
    <!-- Top Title & Close Button -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shrink-0 shadow-sm border border-[var(--md-sys-color-outline)]/10">
          <CalendarRange size={24} class="stroke-[2.5]" />
        </div>
        <div>
          <h2 class="md3-display-small sm:md3-display-medium font-black tracking-tighter text-[var(--md-sys-color-primary)] leading-none mb-0.5">
            {t("calendar")}
          </h2>
          <p class="font-bold text-[var(--md-sys-color-on-surface-variant)] text-[10px] sm:text-xs uppercase tracking-widest opacity-85">
            {t("extensiveCalendarDesc")}
          </p>
        </div>
      </div>

      <div class="hidden lg:flex flex-col items-end border-l border-[var(--md-sys-color-outline)]/12 pl-6 ml-auto mr-4 select-none font-sans">
        <span class="text-3xl font-black text-[var(--md-sys-color-primary)] leading-none tracking-tighter">
          {format(currentDate, "yyyy")}
        </span>
        <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] mt-1">
          {format(currentDate, "MMMM", { locale: settings.language === 'ms' ? ms : enUS })}
        </span>
        {#if currentHijriMonthRange}
          <span class="text-[10px] font-bold text-[var(--md-sys-color-tertiary)] uppercase tracking-wider mt-0.5">
            {currentHijriMonthRange}
          </span>
        {/if}
      </div>

      <IconButton
        variant="tonal"
        onclick={() => {
          if (onBack) onBack();
          else if (onClose) onClose();
        }}
        ariaLabel="Close"
        title="Close"
      >
        {#snippet children()}
          <X size={18} strokeWidth={iconStroke} />
        {/snippet}
      </IconButton>
    </div>

    <!-- Custom Bouncy Segmented Control -->
        <div class="w-full shrink-0 pt-2 pb-1">
          <div class="grid grid-cols-2 gap-1.5 p-1.5 bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/5 rounded-[24px] sm:flex sm:rounded-full shadow-inner w-full sm:w-max mx-auto">
            {#each TABS as tab (tab.id)}
              {@const isActive = tab.id === activeTab}
              {@const Icon = tab.icon}
              <button
                use:ripple
                onclick={() => activeTab = tab.id}
                class={cn(
                  "relative overflow-hidden flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[10.5px] sm:text-sm font-black uppercase tracking-tight sm:tracking-wider rounded-xl sm:rounded-full transition-colors whitespace-nowrap cursor-pointer z-10 w-full sm:w-auto",
                  isActive ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]"
                )}
              >
                {#if isActive}
                  <div
                    in:receive={{ key: 'active-calendar-tab' }}
                    out:send={{ key: 'active-calendar-tab' }}
                    class="absolute inset-0 bg-[var(--md-sys-color-primary)] rounded-xl sm:rounded-full shadow-md z-[-1]"
                  ></div>
                {/if}
                <Icon size={14} strokeWidth={iconStroke + 0.5} class="shrink-0" />
                <span class="truncate">{tab.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Navigation and Date Controls Row -->
        {#if activeTab !== "public_holidays" && activeTab !== "islamic_events"}
          <div class={cn(
            activeTab === "grid" 
              ? "flex items-center justify-center py-1 sm:py-2 shrink-0 w-full" 
              : "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-low)] p-2.5 px-4 rounded-[20px] border border-[var(--md-sys-color-outline)]/5 shadow-sm transition-colors",
            visualStyle === 'glass' && activeTab !== "grid" && "bg-[var(--glass-bg)]/30 backdrop-blur-sm border-[var(--glass-border)]"
          )}>
            {#if activeTab === "list"}
              <div class="flex bg-[var(--md-sys-color-surface-container-high)] p-1 rounded-xl shadow-inner shrink-0 overflow-x-auto no-scrollbar">
                {#each VIEWS as v (v)}
                  <button
                    use:ripple
                    onclick={() => view = v}
                    class={cn(
                      "relative overflow-hidden px-4 py-1.5 rounded-lg font-black text-xs transition-all duration-200 whitespace-nowrap cursor-pointer",
                      view === v 
                        ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm" 
                        : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]"
                    )}
                  >
                    {t(v)}
                  </button>
                {/each}
              </div>
            {:else if activeTab !== "grid"}
              <div class="hidden sm:block text-[10px] font-bold opacity-0">.</div> 
            {/if}
            
            <div class={cn(
              "flex flex-wrap items-center gap-2.5 shrink-0",
              activeTab === "grid" ? "justify-center w-full sm:w-auto" : "w-full sm:w-auto justify-center sm:justify-end"
            )}>
              {#if activeTab === 'list'}
                <div class="shrink-0 sm:mr-1">
                  <Button
                    variant="tonal"
                    onclick={handleCopy}
                    disabled={uniqueDisplayData.length === 0}
                    title={t("copySchedule")}
                  >
                    {#snippet leadingIcon()}
                      {#if isCopied}
                        <Check size={16} />
                      {:else}
                        <Copy size={16} />
                      {/if}
                    {/snippet}
                    {isCopied ? t("copied") : t("copy")}
                  </Button>
                </div>
              {/if}
              
              <!-- Jump to Today Button -->
              {#if !(currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() && view === "monthly")}
                <div
                  transition:scale={{ duration: 200, start: 0.8 }}
                  class="shrink-0"
                >
                  <Button
                    variant="tonal"
                    onclick={() => currentDate = new Date()}
                  >
                    {#snippet leadingIcon()}
                      <Calendar size={16} strokeWidth={iconStroke + 0.5} />
                    {/snippet}
                    {t("today") || "Today"}
                  </Button>
                </div>
              {/if}

              <!-- Material 3 Expressive Floating Pill Nav Container -->
              <div class={cn(
                "flex items-center gap-1 sm:gap-1.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/30 shadow-xs p-1 shrink-0 transition-all duration-200",
                visualStyle === "glass" && "bg-[var(--glass-bg)]/60 backdrop-blur-md border-[var(--glass-border)]"
              )}>
                <button
                  type="button"
                  use:ripple
                  onclick={handlePrev}
                  disabled={isLoading}
                  aria-label="Previous"
                  class="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft size={20} strokeWidth={iconStroke} />
                </button>

                <div class="flex items-center justify-center min-w-[130px] sm:min-w-[150px] px-3 h-9 font-sans font-bold text-sm sm:text-base tracking-tight text-[var(--md-sys-color-on-surface)] overflow-hidden relative select-none">
                  {#key `${format(currentDate, "MMMM yyyy")}-${view}-${activeTab}`}
                    <div
                      transition:fly={{ y: 8, duration: 200 }}
                      class="truncate relative z-10 font-bold"
                    >
                      {#if activeTab === "list"}
                        {#if view === "daily"}
                          {format(currentDate, "dd MMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
                        {:else if view === "weekly"}
                          {format(subDays(currentDate, currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1), "dd MMM")} - {format(addDays(currentDate, 7 - (currentDate.getDay() === 0 ? 7 : currentDate.getDay())), "dd MMM", { locale: settings.language === 'ms' ? ms : enUS })}
                        {:else}
                          {format(currentDate, "MMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
                        {/if}
                      {:else}
                        {format(currentDate, "MMMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
                      {/if}
                    </div>
                  {/key}
                </div>

                <button
                  type="button"
                  use:ripple
                  onclick={handleNext}
                  disabled={isLoading}
                  aria-label="Next"
                  class="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronRight size={20} strokeWidth={iconStroke} />
                </button>
              </div>

              {#if showLoadingState}
                <Loader2 size={20} class="animate-spin text-[var(--md-sys-color-primary)] shrink-0 ml-1" strokeWidth={3} />
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- SCROLLABLE CONTENT ZONE -->
    <div class={cn(
      "flex-1 w-full custom-scrollbar bg-transparent min-h-0",
      activeTab === "grid" 
        ? "p-2 sm:p-4 lg:p-5 overflow-hidden flex flex-col" 
        : "p-4 sm:p-5 lg:p-6 overflow-y-auto"
    )}>
      <div class={cn(
        "max-w-7xl mx-auto w-full h-full flex flex-col min-h-0",
        activeTab === "grid" && "flex-1"
      )}>
        {#if error}
          <div class="w-full p-4 mb-4 text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] rounded-2xl font-black text-center shadow-xs text-xs uppercase tracking-wider">
            {error}
          </div>
        {/if}

        <!-- Main Tab Render Switcher -->
        <div class="flex-1 min-h-0 w-full relative">
          {#key activeTab}
            <div
              in:fly={{ x: slideDirection * 120, duration: 350, delay: 80, force: true }}
              out:fly={{ x: -slideDirection * 120, duration: 250, force: true }}
              class={cn(
                "w-full h-full",
                activeTab === "grid" && "flex flex-col flex-1 min-h-0"
              )}
            >
              {#if activeTab === "grid"}
                <div class={cn(
                  "bg-[var(--md-sys-color-surface-container-low)] shadow-sm rounded-[32px] border border-[var(--md-sys-color-outline)]/10 p-2.5 sm:p-4 lg:p-5 flex-1 flex flex-col min-h-0 transition-all duration-300",
                  visualStyle === 'glass' && "bg-[var(--glass-bg)]/40 backdrop-blur-md border-[var(--glass-border)] shadow-inner"
                )}>
                  <CalendarGridView 
                    bind:currentDate
                    monthData={uniqueDisplayData} 
                    isLoading={showLoadingState}
                    onSelectDay={(day) => selectedDayData = day}
                    onNavigateDate={(d) => currentDate = d}
                  />
                </div>
              {:else if activeTab === "list"}
                <PrayerTimesListView 
                  data={uniqueDisplayData} 
                  {view}
                  isLoading={showLoadingState}
                  onPrayerSelect={(p: any) => selectedPrayer = p}
                />
              {:else if activeTab === "public_holidays"}
                <EventsListView {currentDate} type="public" />
              {:else if activeTab === "islamic_events"}
                <EventsListView {currentDate} type="islamic" />
              {/if}
            </div>
          {/key}
        </div>
      </div>
    </div>

  <!-- Expressive M3 Day Sheet for Selected Date (Mobile Bottom Sheet / Desktop Side Sheet) -->
  {#if selectedDayData && selectedDayDateObj}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
      onclick={() => selectedDayData = null}
    ></div>

    <!-- Expressive M3 Bottom (mobile) / Side (desktop) Sheet -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:fly={{ y: 80, duration: 280 }}
      out:fly={{ y: 80, duration: 200, isExit: true }}
      class={cn(
        "fixed z-50 transition-all duration-300",
        // Mobile: Bottom Sheet with drag pill
        "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[36px] bg-[var(--md-sys-color-surface)] border-t border-[var(--md-sys-color-outline-variant)]/30 shadow-2xl flex flex-col overflow-hidden",
        // Desktop: Docked side sheet on right
        "md:inset-auto md:top-20 md:right-6 md:bottom-6 md:w-[460px] md:max-h-none md:rounded-[36px] md:border md:border-[var(--md-sys-color-outline-variant)]/25 md:shadow-2xl"
      )}
      onclick={e => e.stopPropagation()}
    >
      <!-- Drag Pill (Mobile Only) -->
      <div class="w-12 h-1.5 rounded-full bg-[var(--md-sys-color-outline-variant)]/60 mx-auto mt-3 mb-1 shrink-0 md:hidden"></div>

      <!-- Sheet Header -->
      <div class="p-5 pb-3 sm:p-6 sm:pb-4 border-b border-[var(--md-sys-color-outline-variant)]/15 shrink-0 flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            {#if isTodaySelected}
              <span class="px-2.5 py-0.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-[10px] font-black uppercase tracking-wider">
                {t("today")}
              </span>
            {/if}
            <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
              {format(selectedDayDateObj, "EEEE", { locale: settings.language === 'ms' ? ms : enUS })}
            </span>
          </div>
          <h3 class="text-2xl sm:text-3xl font-black text-[var(--md-sys-color-primary)] tracking-tight leading-none">
            {format(selectedDayDateObj, "dd MMMM yyyy", { locale: settings.language === 'ms' ? ms : enUS })}
          </h3>
          <p class="text-xs font-bold text-[var(--md-sys-color-tertiary)] uppercase tracking-wider mt-1">
            {getHijriFormatted(selectedDayData.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, selectedDayData.hijri).split(" (")[0]}
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <IconButton
            variant="tonal"
            shape="circle"
            size="sm"
            onclick={handleShareSelectedDay}
            title={dayShareSuccess ? t("copied") : (settings.language === 'ms' ? "Kongsi Jadual" : "Share Schedule")}
            ariaLabel={dayShareSuccess ? t("copied") : (settings.language === 'ms' ? "Kongsi Jadual" : "Share Schedule")}
          >
            {#snippet children()}
              {#if dayShareSuccess}
                <Check size={16} class="text-[#25D366]" />
              {:else}
                <Share2 size={16} />
              {/if}
            {/snippet}
          </IconButton>
          <IconButton
            variant="tonal"
            shape="circle"
            size="sm"
            onclick={() => selectedDayData = null}
            ariaLabel="Close"
            title="Close"
          >
            {#snippet children()}
              <X size={16} />
            {/snippet}
          </IconButton>
        </div>
      </div>

      <!-- Events badges if any -->
      {#if selectedDayEvents.length > 0}
        <div class="px-5 py-2.5 bg-[var(--md-sys-color-surface-container-low)] flex flex-wrap gap-1.5 border-b border-[var(--md-sys-color-outline-variant)]/10 shrink-0">
          {#each selectedDayEvents as evt}
            <span class={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-xs", evt.type === 'public' ? 'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]' : (evt.color || 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'))}>
              {evt.title}
            </span>
          {/each}
        </div>
      {/if}

      <!-- Sheet Content: 7 Prayer Times Grid -->
      <div class="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5">
        {#each ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as pKey}
          {@const Icon = PRAYER_ICONS[pKey]}
          {@const timeVal = (selectedDayData as any)[pKey] ? (selectedDayData as any)[pKey].substring(0, 5) : "--:--"}
          <button
            use:ripple
            onclick={() => {
              if (selectedDayData) {
                selectedPrayer = {
                  key: pKey as PrayerKey,
                  time: timeVal,
                  dateValue: selectedDayData.date,
                  hijriValue: selectedDayData.hijri
                };
              }
            }}
            class="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-primary-container)]/20 transition-all border border-[var(--md-sys-color-outline-variant)]/15 group cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon size={18} strokeWidth={iconStroke} />
              </div>
              <div class="text-left">
                <div class="text-xs font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface)]">
                  {t(pKey)}
                </div>
                <div class="text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                  {getPrayerDesc(pKey)}
                </div>
              </div>
            </div>
            <span class="text-lg font-mono font-black text-[var(--md-sys-color-primary)] tabular-nums">
              {timeVal}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Selected Individual Prayer Modal -->
  {#if selectedPrayer}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      transition:fade={{ duration: 150 }}
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onclick={() => selectedPrayer = null}
    >
      <div 
        transition:scale={{ duration: 250, start: 0.95 }}
        class={cn(
          "bg-[var(--md-sys-color-surface)] w-full max-w-sm rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-2xl transition-all duration-300 border border-[var(--md-sys-color-outline-variant)]/30",
          visualStyle === "retro" && "border-[3px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[8px_8px_0px_0px_var(--md-sys-color-on-surface)]",
          visualStyle === "glass" && "bg-[var(--glass-bg)]/90 backdrop-blur-lg border border-[var(--glass-border)]",
          visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] border border-white/5"
        )}
        onclick={e => e.stopPropagation()}
      >
        <div class="bg-gradient-to-tr from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-primary-container)] text-white p-6 md:p-8 relative overflow-hidden">
          <button 
            onclick={() => selectedPrayer = null}
            class="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/25 rounded-full transition-colors z-10 cursor-pointer hover:rotate-90 hover:scale-110 active:scale-90"
          >
            <X size={16} strokeWidth={iconStroke} />
          </button>
          
          <div class="relative z-10 flex flex-col items-center text-center">
            {#if PRAYER_ICONS[selectedPrayer.key]}
              {@const Icon = PRAYER_ICONS[selectedPrayer.key]}
              <Icon size={42} class="mb-3 opacity-90 drop-shadow-md" />
            {/if}
            <h3 class="text-2xl font-black mb-1 drop-shadow-sm">{t(selectedPrayer.key)}</h3>
            <div class="text-4xl font-mono font-bold tracking-tighter drop-shadow-md my-2">
              {selectedPrayer.time}
            </div>
            <div class="text-[11px] opacity-85 mt-2 font-black uppercase tracking-wider">
              {selectedPrayer.dateValue.replace(/-/g, " ")} • {getHijriFormatted(selectedPrayer.dateValue, settings.hijriMethod, settings.hijriAdjustment, settings.hijriFormat || "both", settings.language, selectedPrayer.hijriValue).split(" (")[0]}
            </div>
          </div>
          
          <!-- Background decorative circles -->
          <div class="absolute -top-24 -right-24 w-44 h-44 bg-white/5 rounded-full pointer-events-none"></div>
          <div class="absolute -bottom-24 -left-24 w-44 h-44 bg-black/5 rounded-full pointer-events-none"></div>
        </div>

        <div class="p-6 md:p-8 bg-[var(--md-sys-color-surface)]">
          <div class="flex gap-3.5 items-start">
            <div class="p-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] rounded-full shrink-0">
              <Info size={16} strokeWidth={iconStroke} />
            </div>
            <p class="text-[var(--md-sys-color-on-surface)] text-xs leading-relaxed font-semibold">
              {getPrayerDesc(selectedPrayer.key)}
            </p>
          </div>
          
          <button 
            onclick={() => selectedPrayer = null}
            class="w-full mt-6 py-2.5 px-4 bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-secondary-container)] hover:text-[var(--md-sys-color-on-secondary-container)] font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs border border-[var(--md-sys-color-outline)]/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
