<script lang="ts">
  import { Tv } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { StorageManager } from "../lib/StorageManager";

  function getStyleClasses(style: any, defaultClasses: string = "") {
    if (style === 'retro') return "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] rounded-none";
    if (style === 'glass') return "bg-white/10 backdrop-blur-xl border border-white/20";
    if (style === 'soft') return "shadow-xl border border-white/5";
    return defaultClasses;
  }

  import MosqueTvSettingsBasic from "./MosqueTvSettingsBasic.svelte";
  import MosqueTvSettingsLayout from "./MosqueTvSettingsLayout.svelte";
  import MosqueTvSettingsLogo from "./MosqueTvSettingsLogo.svelte";
  import MosqueTvSettingsWidget from "./MosqueTvSettingsWidget.svelte";
  import MosqueTvSettingsReminders from "./MosqueTvSettingsReminders.svelte";

  const settings = $derived(appSettings.settings);
  const t = (key: any, params?: any) => appSettings.t(key, params);
  
  let visualStyle = $state<any>('default');

  $effect(() => {
    visualStyle = StorageManager.getVisualStyle() || 'default';
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-style');
      if (current && current !== visualStyle) visualStyle = current;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
    return () => observer.disconnect();
  });

  let openAccordions = $state({
    basic: true,
    layout: false,
    logo: false,
    widget: false,
    reminders: false
  });
</script>

<div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
  <md-elevation></md-elevation>
  
  <!-- Mosque Mode Title & Header -->
  <div class="flex items-center gap-3 relative z-10">
    <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
      <Tv size={20} class="stroke-[2.5]" />
    </div>
    <div>
      <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">
        {settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode"}
      </h3>
      <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">
        {t("tvModeEnabledDesc")}
      </p>
    </div>
  </div>

  <!-- Accordion Container -->
  <div class="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
    <MosqueTvSettingsBasic bind:open={openAccordions.basic} />
    <MosqueTvSettingsLayout bind:open={openAccordions.layout} />
    <MosqueTvSettingsLogo bind:open={openAccordions.logo} />
    <MosqueTvSettingsWidget bind:open={openAccordions.widget} />
    <MosqueTvSettingsReminders bind:open={openAccordions.reminders} />
  </div>
</div>
