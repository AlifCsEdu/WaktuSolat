<script lang="ts">
  import { format } from "date-fns";
  import { appSettings } from "../../state/settings.svelte";
  import { cn } from "../../lib/utils";

  let time = $state(new Date());

  $effect(() => {
    const updateTick = () => {
      const now = new Date();
      now.setMilliseconds(0);
      time = now;
    };
    updateTick();
    const interval = setInterval(updateTick, 1000);
    return () => clearInterval(interval);
  });

  let settings = $derived(appSettings.settings);
  let visualStyle = $derived(settings.visualStyle);
</script>

<div class={cn(
  "relative w-full overflow-hidden p-[var(--sys-spacing-edge)] mb-[var(--sys-spacing-section)] min-h-[120px] sm:min-h-[145px] lg:min-h-[165px] xl:min-h-[180px] max-h-[26vh] flex flex-col justify-between transition-all duration-300",
  "bg-[var(--md-sys-color-primary)] rounded-[var(--md-sys-shape-corner-extra-large)] shadow-md",
  visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none md3-shape-extra-large bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)]",
  visualStyle === 'glass' && "bg-[var(--glass-bg)]/35 backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] text-[var(--md-sys-color-on-surface)] rounded-[var(--md-sys-shape-corner-extra-large)]",
  visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border border-white/20 bg-[var(--md-sys-color-surface-container-low)] rounded-[var(--md-sys-shape-corner-extra-large)]"
)}>
  
  <!-- Subtle gradient overlay -->
  {#if visualStyle === 'default'}
    <div class="absolute inset-0 opacity-10 pointer-events-none">
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-transparent to-black"></div>
    </div>
  {/if}
  
  <!-- Wide stacked digits layout -->
  <div class="flex items-baseline gap-3 sm:gap-4 lg:gap-6 relative z-10 w-full">
    <span class={cn(
      "md3-display-large font-black drop-shadow-md select-none font-sans tabular-nums leading-[0.85]",
      "text-[var(--md-sys-color-on-primary)]",
      visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)] drop-shadow-none",
      visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
      visualStyle === 'soft' && "text-[var(--md-sys-color-primary)]"
    )}>
      {format(time, settings.timeFormat === "12h" ? "hh" : "HH")}
    </span>
    <span class={cn(
      "md3-display-large font-black opacity-40 drop-shadow-sm select-none font-sans tabular-nums leading-[0.85]",
      "text-[var(--md-sys-color-on-primary)]",
      visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]/70 drop-shadow-none",
      visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)]/50",
      visualStyle === 'soft' && "text-[var(--md-sys-color-secondary)]/60"
    )}>
      {format(time, "mm")}
    </span>
  </div>

  <!-- Seconds spinner & AM/PM bottom bar -->
  <div class="flex items-center justify-between w-full mt-3 sm:mt-4 relative z-10">
    <div class="flex items-center gap-2 sm:gap-3">
      <div class="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
        <!-- Spinning Outer Ring -->
        <div
          class={cn(
            "absolute inset-0 rounded-full border-[3px] animate-spin",
            "border-[var(--md-sys-color-on-primary)]/20 border-t-[var(--md-sys-color-on-primary)]",
            visualStyle === 'retro' && "border-[var(--md-sys-color-on-surface)]/20 border-t-[var(--md-sys-color-on-surface)] rounded-none border-2",
            visualStyle === 'glass' && "border-[var(--md-sys-color-on-surface)]/15 border-t-[var(--md-sys-color-on-surface)]",
            visualStyle === 'soft' && "border-[var(--md-sys-color-primary)]/15 border-t-[var(--md-sys-color-primary)]"
          )}
          style="animation-duration: 60s"
        ></div>
        <!-- Seconds Text -->
        <span class={cn(
          "relative text-[10px] sm:text-xs font-black select-none font-sans tabular-nums",
          "text-[var(--md-sys-color-on-primary)]",
          visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]",
          visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)]",
          visualStyle === 'soft' && "text-[var(--md-sys-color-primary)]"
        )}>
          {format(time, "ss")}
        </span>
      </div>
      {#if settings.timeFormat === "12h"}
         <span class={cn(
           "text-sm sm:text-base font-black uppercase tracking-widest select-none font-sans",
           "text-[var(--md-sys-color-on-primary)]",
           visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]",
           visualStyle === 'glass' && "text-[var(--md-sys-color-on-surface)]",
           visualStyle === 'soft' && "text-[var(--md-sys-color-primary)] opacity-95"
         )}>{format(time, "a")}</span>
      {/if}
    </div>
  </div>
</div>
