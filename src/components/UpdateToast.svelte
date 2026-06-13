<script lang="ts">
  import { m3Fly as fly } from "../lib/transitions";
  import { onMount } from "svelte";
  import GooeyBackground from "./GooeyBackground.svelte";

  let isMorphing = $state(false);
  onMount(() => {
    const timer = setTimeout(() => {
      isMorphing = true;
    }, 450);
    return () => clearTimeout(timer);
  });
  import { RefreshCw, X, Sparkles } from "lucide-svelte";
  import "@material/web/button/filled-button.js";
  import "@material/web/button/outlined-button.js";
  import { appSettings } from "../state/settings.svelte.ts";

  let { onAccept, onDismiss } = $props<{
    onAccept: () => void;
    onDismiss: () => void;
  }>();

  const t = (key: any) => appSettings.t(key);
</script>

<div 
  transition:fly={{ y: 50, duration: 400 }} 
  onoutrostart={() => isMorphing = false}
  class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] w-[90%] max-w-md"
>
  <div class="bg-[var(--md-sys-color-surface-container-highest)]/85 border border-[var(--md-sys-color-outline)]/20 shadow-2xl rounded-[28px] p-5 flex flex-col gap-4 backdrop-blur-xl transition-all duration-300 relative overflow-hidden">
    <GooeyBackground isMorphing={isMorphing} />
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] shadow-inner">
        <Sparkles size={24} class="stroke-[2.5]" />
      </div>
      <div class="flex-1 min-w-0 pt-0.5">
        <h4 class="font-bold text-[var(--md-sys-color-on-surface)] text-lg leading-tight tracking-wide">
          {t("updateAvailable" as any)}
        </h4>
        <p class="text-[var(--md-sys-color-on-surface-variant)] text-sm mt-1 leading-snug">
          {t("updateAvailableDesc" as any)}
        </p>
      </div>
      <button 
        onclick={onDismiss}
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
    
    <div class="flex items-center justify-end gap-3">
      <div>
        <!-- @ts-ignore -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-outlined-button onclick={onDismiss}>
          {t("updateLater" as any)}
        </md-outlined-button>
      </div>
      <div>
        <!-- @ts-ignore -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-filled-button onclick={onAccept}>
          <div class="flex items-center gap-1.5">
            <RefreshCw size={16} class="animate-spin-slow" />
            <span>{t("updateRefresh" as any)}</span>
          </div>
        </md-filled-button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  :global(.animate-spin-slow) {
    animation: spin-slow 8s linear infinite;
  }
</style>
