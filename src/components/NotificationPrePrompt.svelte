<script lang="ts">
  import { onMount } from "svelte";
  import { BellRing, Check, X } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { fade, fly } from "svelte/transition";
  import { StorageManager } from "../lib/StorageManager";

  let {
    isOpen,
    onClose,
    onConfirm,
    language
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    language: "ms" | "en";
  } = $props();

  let visualStyle = $state<string>("default");

  onMount(() => {
    const stored = StorageManager.getVisualStyle();
    if (stored) visualStyle = stored;

    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute("data-style") as string | null;
      if (current && current !== visualStyle) {
        visualStyle = current;
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-style"]
    });

    return () => observer.disconnect();
  });

  let titleText = $derived(language === "ms" ? "Aktifkan Notifikasi Waktu Solat" : "Enable Prayer Notifications");
  let descText = $derived(language === "ms" 
    ? "Aplikasi memerlukan kebenaran notifikasi untuk menghantar amaran azan secara tepat dan memaklumkan anda beberapa minit sebelum waktu solat bermula." 
    : "The app requires notification permission to trigger timely Azan alerts and remind you minutes before each prayer begins.");
  
  let allowText = $derived(language === "ms" ? "Benarkan Notifikasi" : "Allow Notifications");
  let deferText = $derived(language === "ms" ? "Nanti Saja" : "Maybe Later");
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      transition:fade={{ duration: 200 }}
      class="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      onclick={onClose}></div>

    <!-- Dialog Container -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      transition:fly={{ y: 40, duration: 400 }}
      onclick={(e) => e.stopPropagation()}
      class={cn(
        "relative bg-[var(--md-sys-color-surface-container)] w-full max-w-md flex flex-col rounded-[2.5rem] overflow-hidden shadow-2xl border border-[var(--md-sys-color-outline)]/20 p-6 text-center select-none",
        visualStyle === "glass" && "bg-[var(--glass-bg)] backdrop-blur-[24px] border border-[var(--glass-border)]",
        visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)]",
        visualStyle === "soft" && "shadow-[var(--soft-shadow-light)] border-0"
      )}
    >
      <!-- Expressive M3 Icon Badge -->
      <div class="mx-auto w-16 h-16 rounded-[24px] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center mb-6 ring-8 ring-[var(--md-sys-color-primary-container)]/10 animate-bounce-slow">
        <BellRing size={28} class="stroke-[2.2]" />
      </div>

      <h2 class="md3-title-large font-black text-[var(--md-sys-color-on-surface)] mb-3 px-2 leading-tight">
        {titleText}
      </h2>

      <p class="md3-body-medium text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mb-8 px-3">
        {descText}
      </p>

      <!-- Actions Grid -->
      <div class="flex flex-col gap-2.5 w-full">
        <button
          onclick={() => {
            onConfirm();
            onClose();
          }}
          class={cn(
            "w-full inline-flex items-center justify-center gap-2 py-4 rounded-3xl font-black text-sm text-[var(--md-sys-color-on-primary)] bg-[var(--md-sys-color-primary)] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer",
            visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] rounded-none shadow-[2px_2px_0px_var(--md-sys-color-on-surface)]",
            visualStyle === "glass" && "bg-[var(--md-sys-color-primary)] backdrop-blur-none"
          )}
        >
          <Check size={16} class="stroke-[2.5]" />
          {allowText}
        </button>
        
        <button
          onclick={onClose}
          class={cn(
            "w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-3xl font-bold text-sm text-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-variant)]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer",
            visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] rounded-none"
          )}
        >
          <X size={14} class="stroke-[2.5]" />
          {deferText}
        </button>
      </div>
    </div>
  </div>
{/if}
