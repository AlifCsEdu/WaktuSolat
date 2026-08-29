<script lang="ts">
  import { cn } from "../../lib/utils";
  import { createTime, createVisualStyle } from "./clockState.svelte";

  let { movement = 'sweep' }: { movement?: 'tick' | 'sweep' } = $props();

  const timeState = createTime(() => movement);
  const visualStyleState = createVisualStyle();

  let seconds = $derived(timeState.value.getSeconds() + timeState.value.getMilliseconds() / 1000);
  let minutes = $derived(timeState.value.getMinutes() + seconds / 60);
  let hours = $derived((timeState.value.getHours() % 12) + minutes / 60);
  
  let visualStyle = $derived(visualStyleState.value);
</script>

<div class={cn(
  "relative w-full aspect-square shrink-0 mx-auto flex flex-col items-center justify-center transition-all duration-300",
  "w-[90%] sm:w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[360px]",
  "rounded-full border-[1.5px] border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface)] shadow-inner",
  visualStyle === 'retro' && "border-[3px] border-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
  visualStyle === 'glass' && "border-2 border-[var(--glass-border)] bg-[var(--glass-bg)]/35 backdrop-blur-[var(--glass-blur)] rounded-full shadow-none",
  visualStyle === 'soft' && "border border-[var(--md-sys-color-outline-variant)]/10 bg-[var(--md-sys-color-surface-container-lowest)] shadow-[var(--soft-shadow-light)] rounded-full"
)}>
  
  {#each Array(12) as _, i}
    <div
      class="absolute inset-0 pointer-events-none"
      style="transform: rotate({i * 30}deg)"
    >
      <div class={cn(
        "w-2 sm:w-2.5 h-4.5 sm:h-5.5 mx-auto mt-2 rounded-full opacity-80",
        "bg-[var(--md-sys-color-on-surface-variant)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)] opacity-95 w-3 h-6 rounded-none",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)] opacity-90",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)] opacity-70"
      )}></div>
    </div>
  {/each}
  
  {#each Array(60) as _, i}
    {#if i % 5 !== 0}
      <div
        class="absolute inset-0 pointer-events-none"
        style="transform: rotate({i * 6}deg)"
      >
        <div class={cn(
          "w-[1px] sm:w-[1.5px] h-2 sm:h-2.5 mx-auto mt-2 rounded-full opacity-55",
          "bg-[var(--md-sys-color-on-surface-variant)]",
          visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)] opacity-80 w-[1.5px] h-2.5 rounded-none",
          visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)] opacity-65",
          visualStyle === 'soft' && "bg-[var(--md-sys-color-on-surface-variant)] opacity-40"
        )}></div>
      </div>
    {/if}
  {/each}

  <div class={cn(
    "absolute top-1/2 left-1/2 w-4.5 h-4.5 sm:w-5 sm:h-5 -ml-2.25 sm:-ml-2.5 -mt-2.25 sm:-mt-2.5 rounded-full z-30 shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
    "bg-[var(--md-sys-color-on-surface)]",
    visualStyle === 'retro' && "bg-[var(--md-sys-color-on-surface)] border-2 border-white shadow-none",
    visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]",
    visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)] shadow-[var(--soft-shadow-light)]"
  )}></div>
  <div class="absolute top-1/2 left-1/2 w-2.5 h-2.5 -ml-1.25 -mt-1.25 bg-[var(--md-sys-color-error)] rounded-full z-40 pointer-events-none"></div>

  <div class="absolute inset-0 pointer-events-none">
    <div
      class={cn(
        "absolute top-[28%] left-1/2 w-3.5 sm:w-4.5 h-[30%] rounded-full -ml-[1.75px] sm:-ml-[2.25px] origin-[50%_73.3%] z-10 shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
        "bg-[var(--md-sys-color-primary)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-primary)] border-2 border-[var(--md-sys-color-on-surface)] rounded-none w-4 sm:w-5 -ml-2 sm:-ml-2.5",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)] border border-white/20",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-primary)] shadow-sm"
      )}
      style="transform: rotate({hours * 30}deg)"
    ></div>
    
    <div
      class={cn(
        "absolute top-[12%] left-1/2 w-2.5 sm:w-3.25 h-[48%] rounded-full -ml-[1.25px] sm:-ml-[1.625px] origin-[50%_79.1%] z-10 shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]",
        "bg-[var(--md-sys-color-on-surface)] opacity-95",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-secondary)] border-2 border-[var(--md-sys-color-on-surface)] rounded-none w-3 sm:w-3.75 -ml-1.5 sm:-ml-[1.875px]",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-on-surface)]/85 border border-white/10",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-secondary)] opacity-80"
      )}
      style="transform: rotate({minutes * 6}deg)"
    ></div>
    
    <div
      class={cn(
        "absolute top-[8%] left-1/2 w-[2px] h-[55%] rounded-full -ml-[1px] origin-[50%_76.3%] z-20 shadow-[0_4px_12px_rgba(255,0,0,0.2)]",
        "bg-[var(--md-sys-color-error)]",
        visualStyle === 'retro' && "bg-[var(--md-sys-color-error)] w-[2.5px] rounded-none",
        visualStyle === 'glass' && "bg-[var(--md-sys-color-error)] shadow-[0_0_8px_var(--md-sys-color-error)]",
        visualStyle === 'soft' && "bg-[var(--md-sys-color-error)]"
      )}
      style="transform: rotate({seconds * 6}deg)"
    ></div>
  </div>
</div>
