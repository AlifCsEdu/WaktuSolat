<script lang="ts">
  import {
    format,
    startOfWeek,
    addDays,
    startOfMonth,
    endOfMonth,
    endOfWeek,
    isSameMonth,
    isToday,
  } from "date-fns";
  import { ms, enUS } from "date-fns/locale";
  import type { PrayerData } from "../../types";
  import { getAllEventsForDay } from "../../lib/holidays";
  import { cn } from "../../lib/utils";
  import { appSettings } from "../../state/settings.svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../../lib/transitions";
  import { cubicOut } from "svelte/easing";

  let {
    currentDate,
    monthData,
    onSelectDay,
    isLoading = false,
  }: {
    currentDate: Date;
    monthData: PrayerData[];
    onSelectDay: (day: PrayerData) => void;
    isLoading?: boolean;
  } = $props();

  let settings = $derived(appSettings.settings);
  let visualStyle = $derived(settings.visualStyle);

  // Build 6-row calendar grid starting from Monday
  let monthStart = $derived(startOfMonth(currentDate));
  let monthEnd = $derived(endOfMonth(monthStart));
  let startDate = $derived(startOfWeek(monthStart, { weekStartsOn: 1 }));
  let endDate = $derived(endOfWeek(monthEnd, { weekStartsOn: 1 }));

  let days = $derived.by(() => {
    const list = [];
    let day = startDate;
    while (day <= endDate) {
      list.push(day);
      day = addDays(day, 1);
    }
    return list;
  });

  let dayNames = $derived.by(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      return format(addDays(new Date(2024, 0, 1), i), "EEEE", {
        locale: settings.language === "ms" ? ms : enUS,
      });
    });
  });

  // Lookup map to quickly retrieve prayer times by date string
  let dataMap = $derived.by(() => {
    const map = new Map<string, PrayerData>();
    monthData.forEach((d) => {
      map.set(d.date.toLowerCase(), d);
    });
    return map;
  });

  const toJakimDateString = (d: Date) => {
    return format(d, "dd-MMM-yyyy").toLowerCase();
  };
</script>

<div
  class={cn(
    "flex flex-col w-full h-full min-h-0 flex-1 transition-opacity duration-300",
    isLoading && "opacity-40 pointer-events-none"
  )}
>
  <!-- Week Day Headers -->
  <div
    class="grid grid-cols-7 border-b border-[var(--md-sys-color-outline)]/12 mb-1 sm:mb-2 pb-0.5 sm:pb-1 shrink-0"
  >
    {#each dayNames as dayName, idx}
      {@const isWeekend = idx >= 5}
      <div
        class={cn(
          "py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-black uppercase tracking-widest transition-colors select-none",
          isWeekend
            ? "text-[var(--md-sys-color-error)]"
            : "text-[var(--md-sys-color-on-surface-variant)]/70"
        )}
      >
        <span class="hidden sm:inline">{dayName}</span>
        <span class="sm:hidden">{dayName.slice(0, 3)}</span>
      </div>
    {/each}
  </div>

  <!-- Day Cells Grid - Scroll-free h-full flex layout -->
  <div class="flex-1 min-h-0 w-full overflow-hidden relative">
    {#key currentDate.toISOString()}
      <div
        in:fade={{ duration: 200, delay: 50 }}
        class="grid grid-cols-7 grid-rows-6 gap-1.5 sm:gap-2 h-full w-full justify-items-center items-center sm:justify-items-stretch sm:items-stretch"
      >
        {#each days as d, i (d.toISOString())}
          {@const isCurrentMonth = isSameMonth(d, monthStart)}
          {@const isCurrentDay = isToday(d)}
          {@const formattedDate = format(d, "d")}
          {@const jakimDateStr = toJakimDateString(d)}
          {@const pData = dataMap.get(jakimDateStr)}
          
          {@const hijriParts = pData ? pData.hijri.split('-') : null}
          {@const events = pData ? getAllEventsForDay(d, pData.hijri) : getAllEventsForDay(d, null)}
          {@const hasPublicHoliday = events.some((e) => e.type === "public")}
          {@const dayOfWeek = d.getDay()}
          {@const isWeekend = dayOfWeek === 0 || dayOfWeek === 6}

          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            in:fly={{ y: 10, duration: 400, delay: i * 15 + 50, easing: cubicOut }}
            onclick={() => {
              if (pData) onSelectDay(pData);
            }}
            class={cn(
              "relative flex flex-col items-center sm:items-stretch transition-all duration-250 border select-none group cursor-pointer overflow-hidden",
              "hover:-translate-y-[2px] hover:scale-[1.02] active:translate-y-[1px] active:scale-[0.98]",
              "w-full aspect-square max-w-[44px] sm:max-w-none sm:aspect-auto sm:h-full justify-center sm:justify-between p-1.5 sm:p-2.5",
              "rounded-full sm:rounded-[24px] lg:rounded-[28px]",
              isCurrentMonth
                ? "text-[var(--md-sys-color-on-surface)]"
                : "opacity-35 text-[var(--md-sys-color-on-surface-variant)]/20",
              isCurrentDay
                ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-md shadow-[var(--md-sys-color-primary)]/20 font-bold z-[2]"
                : isCurrentMonth
                  ? "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container-highest)] hover:border-[var(--md-sys-color-primary)]/30 border-[var(--md-sys-color-outline)]/5 text-[var(--md-sys-color-on-surface)]"
                  : "bg-transparent border-transparent",
              isCurrentMonth &&
                !isCurrentDay &&
                "shadow-[2px_2px_0px_0px_var(--md-sys-color-outline-variant)] hover:shadow-[4px_4px_0px_0px_var(--md-sys-color-primary)]/25",
              visualStyle === "retro" &&
                "border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)] sm:hover:translate-y-[-2px] sm:hover:shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]",
              visualStyle === "glass" && "border-none shadow-none",
              visualStyle === "soft" &&
                !isCurrentDay &&
                "shadow-[var(--soft-shadow-light)]"
            )}
            style:background-image={!isCurrentMonth
              ? "radial-gradient(var(--md-sys-color-outline-variant) 1px, transparent 1px)"
              : isWeekend && !isCurrentDay
                ? "repeating-linear-gradient(45deg, color-mix(in srgb, var(--md-sys-color-primary-container) 8%, transparent) 0, color-mix(in srgb, var(--md-sys-color-primary-container) 8%, transparent) 1.5px, transparent 1.5px, transparent 8px)"
                : undefined}
            style:background-size={!isCurrentMonth ? "8px 8px" : undefined}
          >
            <!-- svelte-ignore a11y_missing_attribute -->
            <md-ripple></md-ripple>
            <!-- Top Row: Date labels -->
            <div class="flex justify-center sm:justify-between items-center sm:items-start shrink-0 w-full z-10 relative">
              <span
                class={cn(
                  "text-sm sm:text-lg lg:text-2xl font-black tabular-nums tracking-tighter transition-all",
                  isCurrentDay
                    ? "text-[var(--md-sys-color-on-primary)]"
                    : !isCurrentMonth
                      ? "text-[var(--md-sys-color-on-surface-variant)]/40"
                      : "",
                  !isCurrentDay &&
                    hasPublicHoliday &&
                    isCurrentMonth &&
                    "text-[var(--md-sys-color-error)] group-hover:text-[var(--md-sys-color-on-error-container)]"
                )}
              >
                {formattedDate}
              </span>

              {#if hijriParts && isCurrentMonth}
                <span
                  class={cn(
                    "hidden sm:inline text-[9px] font-black opacity-50 tabular-nums transition-colors",
                    isCurrentDay
                      ? "text-[var(--md-sys-color-on-primary)] opacity-80"
                      : "text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)]"
                  )}
                >
                  {parseInt(hijriParts[2], 10)}
                </span>
              {/if}
            </div>

            <!-- Event Indicators Row -->
            <div class="flex flex-col justify-end w-full shrink-0 mt-0.5 sm:mt-auto z-10 relative">
              <!-- Distinctive Badges for desktop -->
              <div class="hidden lg:flex flex-col gap-1 w-full overflow-hidden">
                {#each events.slice(0, 2) as evt, idx}
                  <div
                    class={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-[6px] truncate font-black tracking-wider uppercase shadow-xs w-full text-left select-none",
                      evt.type === "public"
                        ? isCurrentDay
                          ? "bg-white/20 text-white"
                          : "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]"
                        : isCurrentDay
                          ? "bg-black/10 text-white"
                          : "bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]"
                    )}
                    title={evt.title}
                  >
                    {evt.title}
                  </div>
                {/each}
                {#if events.length > 2}
                  <div class="text-[9px] px-1 font-black text-[var(--md-sys-color-on-surface-variant)]/60">
                    +{events.length - 2} more
                  </div>
                {/if}
              </div>

              <!-- Expressive Dots for mobile/tablet -->
              <div class="flex lg:hidden gap-1 justify-center sm:justify-start items-center h-2 overflow-hidden mt-1">
                {#each events.slice(0, 3) as evt, idx}
                  <div
                    class={cn(
                      "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
                      evt.type === "public"
                        ? isCurrentDay
                          ? "bg-white"
                          : "bg-[var(--md-sys-color-error)]"
                        : isCurrentDay
                          ? "bg-white/80"
                          : "bg-[var(--md-sys-color-tertiary)]"
                    )}
                  ></div>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/key}
  </div>
</div>
