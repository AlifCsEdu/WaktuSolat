<script lang="ts">
  import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-svelte";
  import { analytics } from "../lib/analytics";
  import { StorageManager } from "../lib/StorageManager";
  import { onMount } from "svelte";

  import "@material/web/button/filled-button.js";
  import "@material/web/button/filled-tonal-button.js";
  import "@material/web/button/text-button.js";

  let { children }: { children?: import("svelte").Snippet } = $props();

  let hasError = $state(false);
  let error = $state<Error | null>(null);

  function handleResetAndReload() {
    try {
      StorageManager.clearAllCachedPrayerData();
      StorageManager.removeItem("waktu-solat-settings");
      StorageManager.removeItem("waktu-solat-zone");
      StorageManager.removeItem("waktu-solat-recent-zones");
      window.location.reload();
    } catch (e) {
      window.location.href = "/";
    }
  }

  function handleReloadOnly() {
    window.location.reload();
  }

  // In Svelte 5, we use a boundary or window.onerror for global uncaught errors
  // To make a true component error boundary, Svelte 5 doesn't have an exact built-in
  // equivalent to getDerivedStateFromError out of the box that wraps `children`
  // perfectly, but we can try to catch standard errors or use a try-catch block
  // in layout if needed. However, here we simulate it for now.
</script>

<svelte:window onerror={(e: Event) => {
  const errEvent = e as ErrorEvent;
  hasError = true;
  error = errEvent.error;
  analytics.logError(errEvent.error, {
    location: window.location.href,
  });
}} onunhandledrejection={(e: Event) => {
  const rejEvent = e as PromiseRejectionEvent;
  hasError = true;
  error = rejEvent.reason;
  analytics.logError(rejEvent.reason, {
    location: window.location.href,
  });
}} />

{#if hasError}
  <div class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] font-sans selection:bg-[var(--md-sys-color-primary-container)]/30">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[20%] left-[30%] w-[350px] h-[350px] bg-[var(--md-sys-color-error)]/10 rounded-full blur-[80px]"></div>
      <div class="absolute bottom-[20%] right-[30%] w-[400px] h-[400px] bg-[var(--md-sys-color-primary)]/10 rounded-full blur-[100px]"></div>
    </div>

    <div class="relative z-10 w-full max-w-xl p-8 rounded-[32px] bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] shadow-2xl flex flex-col items-center text-center">
      <div class="w-16 h-16 rounded-[24px] bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] flex items-center justify-center mb-6 animate-pulse">
        <AlertTriangle size={32} class="stroke-[2]" />
      </div>

      <h1 class="text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] mb-2">
        Sesuatu tidak kena
      </h1>
      <p class="text-sm text-[var(--md-sys-color-on-surface-variant)] max-w-sm mb-6 leading-relaxed">
        Aplikasi mengalami ralat rendering tidak dijangka. Anda boleh memulihkan semula data cache atau memuat semula sistem di bawah.
      </p>

      {#if error}
        <div class="w-full text-left bg-[var(--md-sys-color-surface-container-high)] rounded-2xl p-4 mb-8 border border-[var(--md-sys-color-outline-variant)] text-xs font-mono overflow-auto max-h-[140px] no-scrollbar select-text text-[var(--md-sys-color-on-surface-variant)]">
          <span class="text-[var(--md-sys-color-error)] font-bold block mb-1">Ralat:</span>
          {error.message}
          {#if error.stack}
            <span class="block mt-2 opacity-50 text-[10px] leading-relaxed">
              {error.stack.split("\n").slice(0, 3).join("\n")}
            </span>
          {/if}
        </div>
      {/if}

      <div class="flex flex-col sm:flex-row gap-3 w-full shrink-0">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-filled-button onclick={handleReloadOnly} class="flex-1" style="--md-filled-button-container-shape: 16px; --md-filled-button-container-height: 48px;">
Muat Semula
          <span slot="icon"><RefreshCw size={16} class="animate-spin-slow stroke-[2.5]" /></span>
        </md-filled-button>
        
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <md-filled-tonal-button
          onclick={handleResetAndReload}
          aria-label="Padam Cache & Pulihkan"
          class="flex-1"
          style="--md-filled-tonal-button-container-shape: 16px; --md-filled-tonal-button-container-height: 48px;"
        >
          Padam Cache & Pulihkan
          <span slot="icon"><Trash2 size={16} class="stroke-[2.5]" /></span>
        </md-filled-tonal-button>
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <md-text-button
        onclick={() => { window.location.href = "/"; }}
        aria-label="Kembali ke Laman Utama"
        class="mt-6"
      >
        Kembali ke Laman Utama
        <span slot="icon"><Home size={14} /></span>
      </md-text-button>
    </div>
  </div>
{:else}
  {@render children?.()}
{/if}
