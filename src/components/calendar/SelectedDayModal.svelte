<script lang="ts">
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../../lib/transitions";
  import { X, CalendarDays, Share2, Check, Clock, Moon, Sunrise, Sun, SunMedium, SunDim, Sunset } from "lucide-svelte";
  import type { PrayerData } from "../../types";
  import { getAllEventsForDay, getHijriFormatted } from "../../lib/holidays";
  import { cn } from "../../lib/utils";
  import { format, parse } from "date-fns";
  import { ms, enUS } from "date-fns/locale";
  import { appSettings } from "../../state/settings.svelte";
  import "@material/web/iconbutton/filled-tonal-icon-button.js";
  import "@material/web/button/filled-button.js";
  import "@material/web/ripple/ripple.js";

  let { day, onClose, onPrayerSelect } = $props<{
    day: PrayerData | null;
    onClose: () => void;
    onPrayerSelect: (k: string) => void;
  }>();

  const PRAYER_ICONS: Record<string, any> = {
    imsak: Moon,
    fajr: Sunrise,
    syuruk: Sun,
    dhuhr: SunMedium,
    asr: SunDim,
    maghrib: Sunset,
    isha: Moon,
  };

  const isMalay = $derived(appSettings.settings.language === "ms");
  const visualStyle = $derived(appSettings.settings.visualStyle);
  const iconStroke = $derived(visualStyle === "glass" || visualStyle === "soft" ? 1.5 : 2.5);
  const settings = $derived(appSettings.settings);
  const t = (key: string) => appSettings.t(key as any);

  let shareSuccess = $state(false);
  let nextPrayerInfo = $state<{ name: string; timeLeftStr: string; } | null>(null);

  const dateObj = $derived(day ? parse(day.date, "dd-MMM-yyyy", new Date()) : null);
  const isToday = $derived(day ? day.date === format(new Date(), "dd-MMM-yyyy") : false);
  const events = $derived(day && dateObj ? getAllEventsForDay(dateObj, day.hijri) : []);
  const timesToDisplay = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const;

  $effect(() => {
    if (!day || !isToday) {
      nextPrayerInfo = null;
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
      let nextKey: string | null = null;
      let nextTime: Date | null = null;
      
      for (const k of timesToDisplay) {
        const timeStr = (day as any)[k];
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
        nextPrayerInfo = {
          name: "isha",
          timeLeftStr: isMalay ? "Selesai" : "Completed"
        };
        return;
      }
      
      const diffMs = nextTime!.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      
      const pad = (n: number) => String(n).padStart(2, '0');
      
      nextPrayerInfo = {
        name: nextKey,
        timeLeftStr: `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
      };
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  });

  const handleShareDaySchedule = () => {
    if (!day) return;
    let text = `${day.date.replace(/-/g, " ")} (${getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, day.hijri)} - ${day.day})\n`;
    timesToDisplay.forEach(k => {
      text += `${t(k)}: ${(day as any)[k] ? (day as any)[k].substring(0, 5) : "--:--"}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      shareSuccess = true;
      setTimeout(() => shareSuccess = false, 2000);
    });
  };
</script>

{#if day && dateObj}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    in:fade={{ duration: 200 }} 
    out:fade={{ duration: 200 , isExit: true}}
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm sm:overflow-y-auto"
    onclick={onClose}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      in:fly={{ y: 200, duration: 400, opacity: 0 }}
      out:fly={{ y: 200, duration: 300, opacity: 0 , isExit: true}}
      class={cn(
        "bg-[var(--md-sys-color-surface)] w-full max-h-[92dvh] md:max-h-[80dvh] overflow-y-auto md:overflow-hidden custom-scrollbar max-w-lg md:max-w-3xl rounded-t-[40px] sm:rounded-[40px] md:rounded-[40px] shadow-2xl flex flex-col md:flex-row transition-all duration-300 relative",
        visualStyle === "retro" && "border-[4px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[12px_12px_0px_0px_var(--md-sys-color-on-surface)]",
        visualStyle === "glass" && "border-none",
        visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] rounded-t-[48px] sm:rounded-[48px] border border-[var(--md-sys-color-outline)]/5"
      )}
      onclick={e => e.stopPropagation()}
    >
      <!-- @ts-ignore -->
      <md-filled-tonal-icon-button
        onclick={onClose}
        class="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 cursor-pointer"
      >
        <X size={20} strokeWidth={iconStroke} />
      </md-filled-tonal-icon-button>

      <!-- Header Ticket (Editorial) -->
      <div class="bg-[var(--md-sys-color-surface-container-low)] p-6 sm:p-10 md:p-8 lg:p-10 relative border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[var(--md-sys-color-outline-variant)] select-none md:w-[310px] md:shrink-0 md:flex md:flex-col md:justify-between md:h-full">
        <!-- Ticket Punch Holes -->
        <div class="absolute w-8 h-8 rounded-full bg-neutral-950/90 z-20 -left-4 md:left-auto md:-right-4 bottom-[-16px] md:top-[-16px]"></div>
        <div class="absolute w-8 h-8 rounded-full bg-neutral-950/90 z-20 -right-4 bottom-[-16px] md:bottom-[-16px]"></div>

        <div class="flex flex-col md:justify-between justify-start h-full gap-6 md:gap-0 relative z-0">
           <!-- Top Section -->
           <div class="flex flex-col">
             {#if isToday}
               <span class="mb-4 self-start px-3 py-1 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-[var(--md-sys-color-primary)]/20">
                 <CalendarDays size={14} /> {t("today")}
               </span>
             {/if}
             
             <h2 class="md3-display-medium sm:md3-display-large font-black tracking-tighter text-[var(--md-sys-color-on-surface)] flex flex-col gap-1 leading-none">
               <span class="text-[var(--md-sys-color-primary)]">
                  {format(dateObj, "dd", { locale: isMalay ? ms : enUS })}
               </span>
               <span>
                  {format(dateObj, "MMMM yyyy", { locale: isMalay ? ms : enUS })}
               </span>
             </h2>

             <p class="font-semibold text-[var(--md-sys-color-on-surface-variant)] mt-3.5 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
               {#if !settings.hijriFormat || settings.hijriFormat === 'both' || settings.hijriFormat === 'text'}
                 <span class="font-black">{getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, day.hijri).split(" (")[0]}</span>
               {/if}
               {#if !settings.hijriFormat || settings.hijriFormat === 'both'}
                 <span class="opacity-40">•</span>
               {/if}
               {#if !settings.hijriFormat || settings.hijriFormat === 'both' || settings.hijriFormat === 'number'}
                 <span class="font-sans opacity-70 font-black">
                   {getHijriFormatted(day.date, settings.hijriMethod, settings.hijriAdjustment, "number", settings.language as any, day.hijri)}
                 </span>
               {/if}
               <span class="opacity-40">•</span>
               <span class="opacity-80 font-black uppercase tracking-wider">{format(dateObj, "EEEE", { locale: isMalay ? ms : enUS })}</span>
             </p>

             <!-- Countdown Widget -->
             {#if nextPrayerInfo}
               <div class="flex items-center gap-3 p-3 px-4 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/5 shadow-inner sm:max-w-xs md:w-full mt-5 font-sans">
                 <Clock size={16} class="text-[var(--md-sys-color-primary)] animate-pulse" />
                 <div class="flex flex-col leading-none">
                   <span class="text-[8px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">{t(nextPrayerInfo.name)} {isMalay ? "Seterusnya" : "Next"}</span>
                   <span class="text-sm font-black text-[var(--md-sys-color-primary)] mt-1">{nextPrayerInfo.timeLeftStr}</span>
                 </div>
               </div>
             {/if}
           </div>
           
           <!-- Bottom Section -->
           <div class="flex flex-wrap items-center gap-2 mt-4 md:mt-auto">
             <!-- @ts-ignore -->
             <md-filled-button
               onclick={handleShareDaySchedule}
               class="cursor-pointer"
               style="--md-filled-button-container-color: {shareSuccess ? '#25D366' : ''}; --md-filled-button-label-text-color: {shareSuccess ? '#ffffff' : ''}"
             >
               {#if shareSuccess}
                 <div slot="icon"><Check size={14} strokeWidth={3} /></div>
               {:else}
                 <div slot="icon"><Share2 size={14} /></div>
               {/if}
               {shareSuccess ? t("copied") : (isMalay ? "Kongsi Jadual" : "Share Schedule")}
             </md-filled-button>

             <!-- Event tags styled as outline pills -->
             {#if events.length > 0}
               {#each events as evt, i}
                 <div class={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-white shadow-xs border border-white/5", evt.type === 'public' ? 'bg-[var(--md-sys-color-error)]' : (evt.color || 'bg-[var(--md-sys-color-primary)]'))}>
                   {evt.title}
                 </div>
               {/each}
             {/if}
           </div>
        </div>
      </div>
      
      <!-- Editorial Grid Prayer Times Content -->
      <div class="p-6 sm:p-10 md:p-8 lg:p-10 bg-[var(--md-sys-color-surface)] md:flex-1 md:h-full md:overflow-y-auto custom-scrollbar flex flex-col min-h-0">
        <h3 class="text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-6 flex items-center gap-2 shrink-0">
          {isMalay ? "Waktu Solat" : "Prayer Times"}
          <div class="flex-1 h-px bg-[var(--md-sys-color-outline)]/10"></div>
        </h3>
        
        <div class="grid grid-cols-2 gap-3 sm:gap-4 pb-2">
          {#each timesToDisplay as k, idx}
            {@const Icon = PRAYER_ICONS[k]}
            {@const isNext = nextPrayerInfo && nextPrayerInfo.name === k}
            <button
              in:fly={{ y: 20, duration: 400, delay: idx * 50 }}
              onclick={() => onPrayerSelect(k)}
              class={cn(
                "flex flex-col items-start justify-center p-4 sm:p-5 border transition-colors duration-250 group cursor-pointer shadow-sm relative overflow-hidden",
                isNext
                  ? "bg-[var(--md-sys-color-primary-container)]/10 border-[var(--md-sys-color-primary)]/40 ring-1 ring-[var(--md-sys-color-primary)]/30 hover:bg-[var(--md-sys-color-primary-container)]/25"
                  : "bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/5 hover:border-[var(--md-sys-color-primary)]/30 hover:bg-[var(--md-sys-color-primary-container)]/10",
                visualStyle === "glass" && "border-none shadow-none",
                visualStyle === "retro" && "border-[3px] border-[var(--md-sys-color-on-surface)] rounded-none shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)]",
                visualStyle !== "retro" && "rounded-[24px] sm:rounded-[32px]"
              )}
            >
              <!-- @ts-ignore -->
              <md-ripple></md-ripple>
              {#if isNext}
                <span class="absolute top-3 right-3 px-2 py-0.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-md text-[8px] font-black uppercase tracking-wider shadow-xs z-10">
                  {isMalay ? "Seterusnya" : "Next"}
                </span>
              {/if}
              <Icon size={24} strokeWidth={iconStroke} class={cn("opacity-70 group-hover:opacity-100 mb-2 sm:mb-3 shrink-0 transition-opacity", isNext ? "text-[var(--md-sys-color-primary)] opacity-100" : "text-[var(--md-sys-color-primary)]")} />
              <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">{t(k)}</span>
              <span class="text-2xl sm:text-3xl font-black font-sans text-[var(--md-sys-color-on-surface)] mt-1 tracking-tighter">{(day as any)[k] ? (day as any)[k].substring(0, 5) : "--:--"}</span>
              
              <!-- Decorative Background Icon -->
              <Icon size={120} strokeWidth={iconStroke} class="absolute -right-6 -bottom-6 text-[var(--md-sys-color-on-surface)] opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none" />
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
