<script lang="ts">
  import { appSettings } from '../state/settings.svelte';
  import { format, parse, addMonths, subMonths, startOfMonth, addDays, subDays, isSameDay, isSameWeek } from "date-fns";
  import { ms, enUS } from "date-fns/locale";
  import type { PrayerData, PrayerKey } from "../types";
  import { Moon, Sun, Sunrise, Sunset, SunDim, SunMedium, X, Info, ChevronLeft, ChevronRight, Loader2, Calendar, CalendarDays, CalendarRange, Copy, Check, ListTree, Clock, PartyPopper } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { getHijriFormatted } from "../lib/holidays";

  import CalendarGridView from "./calendar/CalendarGridView.svelte";
  import PrayerTimesListView from "./calendar/PrayerTimesListView.svelte";
  import EventsListView from "./calendar/EventsListView.svelte";
  import SelectedDayModal from "./calendar/SelectedDayModal.svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide, m3Scale as scale, send, receive } from "../lib/transitions";
  import { portal } from "../lib/portal";
  import { Button, IconButton } from "$lib/components/ui";
  import { ripple } from "$lib/actions/ripple";

  let { 
    isOpen, 
    initialMonthData, 
    selectedZone, 
    onClose 
  } = $props<{
    isOpen: boolean;
    initialMonthData: PrayerData[];
    selectedZone: string;
    onClose: () => void;
  }>();

  let activeTab = $state<"grid" | "list" | "public_holidays" | "islamic_events">("grid");
  let view = $state<"daily" | "weekly" | "monthly">("monthly");
  let currentDate = $state<Date>(new Date());

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

  $effect(() => {
    if (!isOpen) return;

    const fetchMonthData = async (date: Date) => {
      const key = format(date, "yyyy-MM");
      if (dataCache[key]) return; // Already cached
      
      isLoading = true;
      error = null;
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
        error = t("failedToLoad");
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

{#if isOpen}
  <div
    use:portal
    class="fixed inset-0 z-[9000] w-full h-full overflow-hidden select-none"
  >
    <!-- Backdrop -->
    <div
      transition:fade={{ duration: 300 }}
      class={cn(
        "absolute inset-0 transition-all duration-300",
        isWallpaperActive
          ? "bg-black/60 backdrop-blur-3xl"
          : visualStyle === 'glass'
            ? "bg-[var(--glass-bg)]/85 backdrop-blur-[28px] border border-[var(--glass-border)]"
            : "bg-[var(--md-sys-color-background)]",
        visualStyle === 'soft' && "shadow-[var(--soft-shadow-heavy)] bg-[var(--md-sys-color-background)]",
        visualStyle === 'retro' && "border-[4px] border-[var(--md-sys-color-on-surface)] rounded-none bg-[var(--md-sys-color-background)]"
      )}
      style:background-image={!isWallpaperActive && visualStyle !== 'glass' ? "radial-gradient(var(--md-sys-color-outline-variant) 1px, transparent 1px)" : undefined}
      style:background-size="24px 24px"
    ></div>

    <!-- Content Wrapper -->
    <div
      transition:fly={{ y: 20, duration: 300 }}
      class="relative z-10 w-full h-full flex flex-col font-sans text-[var(--md-sys-color-on-background)]"
      style:view-transition-name={isOpen ? 'calendar-transition' : 'none'}
    >
      <!-- STICKY HEADER ZONE -->
      <div class={cn(
        "sticky top-0 z-50 border-b border-[var(--md-sys-color-outline)]/12 shadow-sm shrink-0 transition-all duration-300",
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

          <div class="hidden lg:flex flex-col items-end border-l border-[var(--md-sys-color-outline)]/12 pl-6 ml-auto mr-4 select-none font-mono">
            <span class="text-3xl font-black text-[var(--md-sys-color-primary)] leading-none tracking-tighter">
              {format(currentDate, "yyyy")}
            </span>
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] mt-1">
              {format(currentDate, "MMMM", { locale: settings.language === 'ms' ? ms : enUS })}
            </span>
          </div>

          <IconButton
            variant="tonal"
            onclick={onClose}
            ariaLabel="Close"
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

              <!-- Chunky Cassette Nav Block -->
              <div class={cn(
                "flex items-center gap-1.5 sm:gap-2 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] shrink-0 transition-all duration-250 hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_var(--md-sys-color-on-surface)]",
                visualStyle === "retro" && "rounded-none",
                visualStyle === "soft" && "shadow-[var(--soft-shadow-light)] border-[var(--md-sys-color-outline)]/10"
              )}>
                <IconButton
                  variant="filled"
                  onclick={handlePrev}
                  disabled={isLoading}
                  ariaLabel="Previous"
                >
                  {#snippet children()}
                    <ChevronLeft size={20} strokeWidth={iconStroke} />
                  {/snippet}
                </IconButton>

                <div class="flex items-center justify-center min-w-[120px] px-2 h-8 bg-[var(--md-sys-color-surface)] rounded-xl border border-[var(--md-sys-color-outline)]/10 font-mono font-black text-xs uppercase tracking-widest text-[var(--md-sys-color-on-surface)] overflow-hidden relative">
                  <div class="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--md-sys-color-on-surface)_1px,_transparent_1px)] bg-[size:4px_4px] pointer-events-none"></div>
                  {#key `${format(currentDate, "MMMM yyyy")}-${view}-${activeTab}`}
                    <div
                      transition:fly={{ y: 10, duration: 200 }}
                      class="truncate relative z-10"
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

                <IconButton
                  variant="filled"
                  onclick={handleNext}
                  disabled={isLoading}
                  ariaLabel="Next"
                >
                  {#snippet children()}
                    <ChevronRight size={20} strokeWidth={iconStroke} />
                  {/snippet}
                </IconButton>
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
                    {currentDate}
                    monthData={uniqueDisplayData} 
                    isLoading={showLoadingState}
                    onSelectDay={(day) => selectedDayData = day}
                  />
                </div>
              {:else if activeTab === "list"}
                <PrayerTimesListView 
                  data={uniqueDisplayData} 
                  {view}
                  isLoading={showLoadingState}
                  onPrayerSelect={(p) => selectedPrayer = p}
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
  </div>
</div>
{/if}

<SelectedDayModal 
  day={selectedDayData} 
  onClose={() => selectedDayData = null}
  onPrayerSelect={(k) => {
    if (selectedDayData) {
      selectedPrayer = {
        key: k as PrayerKey,
        time: selectedDayData[k as keyof PrayerData] ? (selectedDayData[k as keyof PrayerData] as string).substring(0, 5) : "--:--",
        dateValue: selectedDayData.date,
        hijriValue: selectedDayData.hijri
      };
    }
  }}
/>

<!-- Selected Individual Prayer Modal -->
{#if selectedPrayer}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    use:portal
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
    onclick={() => selectedPrayer = null}
  >
    <div 
      transition:scale={{ duration: 300, start: 0.95 }}
      class={cn(
        "bg-[var(--md-sys-color-surface)] w-full max-w-sm rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-2xl transition-all duration-300",
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
