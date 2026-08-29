<script lang="ts">
  import { cn } from "../../lib/utils";
  import { appSettings } from "../../state/settings.svelte";

  let { movement = 'sweep' }: { movement?: 'tick' | 'sweep' } = $props();

  let time = $state(new Date());

  $effect(() => {
    if (movement === 'sweep') {
      let frame: number;
      const animate = () => {
        time = new Date();
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    } else {
      const updateTick = () => {
        const now = new Date();
        now.setMilliseconds(0);
        time = now;
      };
      updateTick();
      const interval = setInterval(updateTick, 1000);
      return () => clearInterval(interval);
    }
  });

  let visualStyle = $derived(appSettings.settings.visualStyle);

  let seconds = $derived(time.getSeconds() + time.getMilliseconds() / 1000);
  let minutes = $derived(time.getMinutes() + seconds / 60);
  let hours = $derived((time.getHours() % 12) + minutes / 60);
</script>

<div class={cn(
  "relative w-full aspect-square shrink-0 mx-auto flex flex-col items-center justify-center transition-all duration-300",
  // Size limits (Optimized for Mobile & Desktop)
  "w-[90%] sm:w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[360px]",
  
  // Default Style: Circular Dial
  "rounded-full bg-[var(--md-sys-color-surface)] shadow-inner",
  
  visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
  visualStyle === 'glass' && "border-2 border-[var(--glass-border)] bg-[var(--glass-bg)]/35 backdrop-blur-[var(--glass-blur)] rounded-full shadow-none",
  visualStyle === 'soft' && "border border-[var(--md-sys-color-outline-variant)]/10 bg-[var(--md-sys-color-surface-container-lowest)] shadow-[var(--soft-shadow-light)] rounded-full"
)}>
  
  <!-- Swiss Hour Ticks - Thick and long -->
  {#each Array(12) as _, i}
    <div
      class="absolute inset-0 pointer-events-none"
      style="transform: rotate({i * 30}deg)"
    >
      <div class={cn(
        "w-[5px] h-[16px] sm:w-[6.5px] sm:h-[20px] mx-auto mt-1 sm:mt-1.5 transition-colors",
        "bg-[var(--md-sys-color-on-surface)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)] rounded-none w-[6px] h-[18px]",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]/90",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)]"
      )}></div>
    </div>
  {/each}
  
  <!-- Swiss Minute Ticks - Sharp & highly legible -->
  {#each Array(60) as _, i}
    {#if i % 5 !== 0}
      <div
        class="absolute inset-0 pointer-events-none"
        style="transform: rotate({i * 6}deg)"
      >
        <div class={cn(
          "w-[2px] h-[5.5px] sm:w-[3px] sm:h-[6.5px] mx-auto mt-1 sm:mt-1.5 transition-colors",
          "bg-[var(--md-sys-color-on-surface-variant)]/80",
          visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)]/75 rounded-none w-[2px] h-[6px]",
          visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]/60",
          visualStyle === 'soft' && "bg-[var(--md-sys-color-on-surface-variant)]/40"
        )}></div>
      </div>
    {/if}
  {/each}

  <!-- Center dot/axis -->
  <div class={cn(
    "absolute top-1/2 left-1/2 w-4.5 h-4.5 sm:w-5 sm:h-5 -ml-2.25 sm:-ml-2.5 -mt-2.25 sm:-mt-2.5 rounded-full z-20 shadow-md transition-colors",
    "bg-[var(--md-sys-color-on-surface)]",
    visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)] border-2 border-white shadow-none",
    visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]",
    visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)]"
  )}></div>

  <!-- Hands -->
  <div class="absolute inset-0 pointer-events-none">
    <!-- Hour Hand - Thick rectangular blade -->
    <div
      class={cn(
        "absolute top-[28%] left-1/2 w-[7px] sm:w-[9px] h-[30%] -ml-[3.5px] sm:-ml-[4.5px] origin-[50%_73.3%] z-10 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
        "bg-[var(--md-sys-color-on-surface)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-primary)] border border-white rounded-none",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]/95",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)]"
      )}
      style="transform: rotate({hours * 30}deg)"
    ></div>
    
    <!-- Minute Hand - Longer rectangular blade -->
    <div
      class={cn(
        "absolute top-[12%] left-1/2 w-[5.5px] sm:w-[7px] h-[48%] -ml-[2.75px] sm:-ml-[3.5px] origin-[50%_79.1%] z-10 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
        "bg-[var(--md-sys-color-on-surface)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-secondary)] border border-white rounded-none",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]/85",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-secondary)]"
      )}
      style="transform: rotate({minutes * 6}deg)"
    ></div>
    
    <!-- Iconic Swiss Red sweep second hand with red disc tip -->
    <div
      class={cn(
        "absolute top-[10%] left-1/2 w-[2px] h-[55%] -ml-[1px] origin-[50%_72.7%] z-20 transition-colors shadow-[0_4px_12px_rgba(255,0,0,0.2)]",
        "bg-[var(--md-sys-color-error)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-error)] w-[2.5px] rounded-none",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-error)] shadow-[0_0_8px_rgba(244,63,94,0.6)]",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-error)]"
      )}
      style="transform: rotate({seconds * 6}deg)"
    >
       <!-- Red disk at the tip -->
       <div class={cn(
         "absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm",
         "bg-[var(--md-sys-color-error)]",
         visualStyle === 'retro' && "bg-[var(--md-sys-color-error)] border border-white rounded-none w-4 h-4",
         visualStyle === 'glass' && "bg-[var(--md-sys-color-error)] shadow-[0_0_6px_rgba(244,63,94,0.6)]",
         visualStyle === 'soft' && "bg-[var(--md-sys-color-error)]"
       )}></div>
    </div>
  </div>
</div>
