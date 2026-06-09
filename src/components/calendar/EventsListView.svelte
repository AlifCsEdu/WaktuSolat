<script lang="ts">
import { format, eachDayOfInterval, startOfYear, endOfYear, startOfDay } from "date-fns";
import { ms, enUS } from "date-fns/locale";
import { CalendarDays, AlertCircle, CheckCircle2, Clock } from "lucide-svelte";
import { getAllEventsForDay } from "../../lib/holidays";
import { cn } from "../../lib/utils";

import { appSettings } from "../../state/settings.svelte";
import { themeState } from "../../state/theme.svelte";

let { currentDate, type } = $props<{
  currentDate: Date;
  type: "public" | "islamic" | "all";
}>();

const visualStyle = $derived(appSettings.settings.visualStyle);
const iconStroke = $derived(visualStyle === "glass" || visualStyle === "soft" ? 1.5 : 2.5);
const isMalay = $derived(appSettings.settings.language === "ms");

// Generate all events for the current year
const eventsList = $derived.by(() => {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const days = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  const list: { date: Date, title: string, type: 'public' | 'islamic', color?: string }[] = [];
  
  days.forEach(d => {
    const evs = getAllEventsForDay(d, null);
    evs.forEach(ev => {
      // Very basic filtering based on type string.
      const evType = ev.type;
      if (type === "all" || type === evType) {
        list.push({ date: d, title: ev.title, type: evType, color: ev.color });
      }
    });
  });
  
  return list;
});

const today = $derived(startOfDay(new Date()));
</script>

<div class="space-y-4">
  {#if eventsList.length === 0}
    <div class="flex flex-col items-center justify-center py-12 text-[var(--md-sys-color-on-surface-variant)] opacity-70">
      <CalendarDays size={48} strokeWidth={iconStroke} class="mb-4" />
      <p class="text-sm font-bold uppercase tracking-widest">{isMalay ? "Tiada acara ditemui" : "No events found"}</p>
    </div>
  {:else}
    {#each eventsList as event, i}
      {@const isPast = event.date < today}
      {@const isTodayEvent = event.date.getTime() === today.getTime()}
      <div 
        class={cn(
          "flex items-start gap-4 p-4 sm:p-5 transition-all duration-300",
          visualStyle === "retro" ? "border-2 border-[var(--md-sys-color-on-surface)]" : "bg-[var(--md-sys-color-surface-container)] rounded-[24px] border border-[var(--md-sys-color-outline)]/10",
          isPast ? "opacity-60 grayscale-[0.5]" : "",
          isTodayEvent ? "ring-2 ring-[var(--md-sys-color-primary)] ring-offset-2 ring-offset-[var(--md-sys-color-surface)]" : ""
        )}
      >
        <!-- Date Badge -->
        <div class={cn(
          "flex flex-col items-center justify-center min-w-[3.5rem] p-2 rounded-xl shrink-0",
          visualStyle === "retro" ? "border-2 border-[var(--md-sys-color-on-surface)]" : "bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]"
        )}>
          <span class="text-[10px] font-black uppercase tracking-widest">{format(event.date, "MMM", { locale: isMalay ? ms : enUS })}</span>
          <span class="text-xl sm:text-2xl font-black font-sans leading-none mt-0.5">{format(event.date, "d")}</span>
        </div>
        
        <!-- Details -->
        <div class="flex-1 min-w-0 pt-1">
          <div class="flex items-center gap-2 mb-1">
            {#if isTodayEvent}
              <span class="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] text-[9px] font-black uppercase tracking-wider shrink-0">
                {isMalay ? "HARI INI" : "TODAY"}
              </span>
            {/if}
            <span class="text-[10px] sm:text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider truncate">
              {event.type === 'public' ? (isMalay ? "Cuti Umum" : "Public Holiday") : (isMalay ? "Hari Islam" : "Islamic Date")}
            </span>
          </div>
          <h4 class={cn(
            "font-black text-sm sm:text-base leading-snug",
            isPast ? "text-[var(--md-sys-color-on-surface-variant)]" : "text-[var(--md-sys-color-on-surface)]"
          )}>
            {event.title}
          </h4>
          <p class="text-[11px] sm:text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1 font-medium">
            {format(event.date, "EEEE, d MMMM yyyy", { locale: isMalay ? ms : enUS })}
          </p>
        </div>
        
        <!-- Status Icon -->
        <div class="shrink-0 pt-2 opacity-50">
          {#if isPast}
            <CheckCircle2 size={18} strokeWidth={iconStroke} />
          {:else if isTodayEvent}
            <AlertCircle size={18} strokeWidth={iconStroke} class="text-[var(--md-sys-color-tertiary)] opacity-100" />
          {:else}
            <Clock size={18} strokeWidth={iconStroke} />
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>
