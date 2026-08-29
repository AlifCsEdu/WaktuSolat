<script lang="ts">
  import { cn } from "../../lib/utils";
  import { appSettings } from "../../state/settings.svelte";

  let { movement }: { movement: 'tick' | 'sweep' } = $props();

  let time = $state(new Date());

  $effect(() => {
    let frameId: number;
    let intervalId: ReturnType<typeof setInterval>;

    if (movement === 'sweep') {
      const animate = () => {
        time = new Date();
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
    } else {
      const updateTick = () => {
        const now = new Date();
        now.setMilliseconds(0);
        time = now;
      };
      updateTick();
      intervalId = setInterval(updateTick, 1000);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (intervalId) clearInterval(intervalId);
    };
  });

  let visualStyle = $derived(appSettings.settings.visualStyle || 'default');

  let seconds = $derived(time.getSeconds() + time.getMilliseconds() / 1000);
  let minutes = $derived(time.getMinutes() + seconds / 60);
  let hours = $derived((time.getHours() % 12) + minutes / 60);
</script>

<div class={cn(
  "relative w-full aspect-square shrink-0 mx-auto flex flex-col items-center justify-center transition-all duration-300 overflow-hidden",
  "w-[90%] sm:w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[360px]",
  "rounded-full bg-[var(--md-sys-color-surface-container-highest)] shadow-sm border-[1.5px] border-[var(--md-sys-color-outline-variant)]/20",
  visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
  visualStyle === 'glass' && "border-2 border-[var(--glass-border)] bg-[var(--glass-bg)]/35 backdrop-blur-[var(--glass-blur)] rounded-full shadow-none",
  visualStyle === 'soft' && "border border-white/10 shadow-[var(--soft-shadow-light)] bg-[var(--md-sys-color-surface-container-low)] rounded-full"
)}>
  <!-- Abstract Hour Blob - Enlarged for visibility -->
  <div 
    class={cn(
      "absolute w-[70%] h-[70%] rounded-full blur-2xl transition-all duration-1000 ease-linear origin-bottom-right",
      "bg-[var(--md-sys-color-primary)] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-35",
      visualStyle === 'retro' && "bg-[var(--md-sys-color-primary)] opacity-25 dark:opacity-20 blur-xl rounded-none",
      visualStyle === 'glass' && "bg-[var(--md-sys-color-primary)] opacity-40 dark:opacity-30 blur-3xl",
      visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)] opacity-35 dark:opacity-25 blur-2xl"
    )}
    style="transform: rotate({hours * 30}deg) translate(20%, -20%)"
  ></div>

  <!-- Abstract Minute Blob - Enlarged for visibility -->
  <div 
    class={cn(
      "absolute w-[50%] h-[50%] rounded-full blur-xl transition-all duration-500 ease-linear origin-bottom-left",
      "bg-[var(--md-sys-color-tertiary)] mix-blend-multiply dark:mix-blend-screen opacity-55 dark:opacity-40",
      visualStyle === 'retro' && "bg-[var(--md-sys-color-tertiary)] opacity-25 dark:opacity-20 blur-lg rounded-none",
      visualStyle === 'glass' && "bg-[var(--md-sys-color-tertiary)] opacity-45 dark:opacity-35 blur-2xl",
      visualStyle === 'soft' && "bg-[var(--md-sys-color-tertiary)] opacity-40 dark:opacity-30 blur-xl"
    )}
    style="transform: rotate({minutes * 6}deg) translate(-30%, -30%)"
  ></div>

  <!-- Secondary accent blob for richness -->
  <div 
    class={cn(
      "absolute w-[35%] h-[35%] rounded-full blur-lg transition-all duration-700 ease-linear origin-center",
      "bg-[var(--md-sys-color-secondary)] mix-blend-multiply dark:mix-blend-screen opacity-30 dark:opacity-20",
      visualStyle === 'retro' && "hidden",
      visualStyle === 'glass' && "bg-[var(--md-sys-color-secondary)] opacity-25 dark:opacity-20",
      visualStyle === 'soft' && "bg-[var(--md-sys-color-secondary)] opacity-20 dark:opacity-15"
    )}
    style="transform: rotate({seconds * 6}deg) translate(40%, 20%)"
  ></div>

  <!-- Abstract Second Dot - Orbiting ring -->
  <div class={cn(
    "absolute w-[80%] h-[80%] rounded-full border-[1.5px] border-dashed pointer-events-none z-10",
    "border-[var(--md-sys-color-outline-variant)]/25",
    visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)]/40 border-solid rounded-none",
    visualStyle === 'glass' && "border-white/10",
    visualStyle === 'soft' && "border-[var(--md-sys-color-outline-variant)]/15"
  )}>
    <div 
      class="absolute inset-0 z-20 origin-center"
      style="transform: rotate({seconds * 6}deg)"
    >
      <div class={cn(
        "w-4 h-4 sm:w-5 sm:h-5 rounded-full absolute -top-2 sm:-top-2.5 left-1/2 -translate-x-1/2 transition-all",
        "bg-[var(--md-sys-color-error)] shadow-[0_0_12px_var(--md-sys-color-error)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-error)] border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-none w-4 h-4",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-error)] shadow-[0_0_10px_rgba(244,63,94,0.6)]",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-error)] shadow-[0_0_8px_var(--md-sys-color-error)]"
      )}></div>
    </div>
  </div>

  <!-- Center Digital Display for functional readability -->
  <div class={cn(
    "relative z-30 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[var(--md-sys-shape-corner-large)] shadow-md border transition-all duration-300",
    "bg-[var(--md-sys-color-surface)]/85 backdrop-blur-md border-[var(--md-sys-color-outline-variant)]/15",
    visualStyle === 'retro' && "bg-[var(--md-sys-color-surface)] border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-[3px_3px_0px_var(--md-sys-color-on-surface)]",
    visualStyle === 'glass' && "bg-[var(--glass-bg)]/80 border-[var(--glass-border)] backdrop-blur-xl",
    visualStyle === 'soft' && "bg-[var(--md-sys-color-surface-container-lowest)] border-none shadow-[var(--soft-shadow-dark)]"
  )}>
     <span class={cn(
       "font-sans font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[var(--md-sys-color-on-surface)] tabular-nums select-none",
       visualStyle === 'retro' && "text-[var(--md-sys-color-on-surface)]",
       visualStyle === 'soft' && "text-[var(--md-sys-color-primary)]"
     )}>
        {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}
     </span>
  </div>

</div>
