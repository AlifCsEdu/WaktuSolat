<script lang="ts">
  import { Sliders, ChevronDown } from "lucide-svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";

  import { Switch } from "$lib/components/ui";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);
</script>

<div class="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
  >
    <div class="flex items-center gap-3">
      <Sliders size={18} class="text-[var(--md-sys-color-primary)]" />
      <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
        {t("sectionBasicSetup")}
      </span>
    </div>
    <ChevronDown
      size={18}
      class={cn(
        "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
        open ? "rotate-180" : ""
      )}
    />
  </button>
  
  {#if open}
    <div transition:slide={{ duration: 300 }} class="overflow-hidden">
      <div class="p-4 space-y-4">
        <!-- TV Enabled toggle -->
        <div class="flex items-center justify-between p-1">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvModeEnabled")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {settings.language === "ms" 
                ? "Aktifkan paparan TV masjid skrin penuh landskap secara berterusan." 
                : "Activate persistent full-screen landscape TV presentation layout."}
            </p>
          </div>
          <Switch
            checked={!!settings.tvModeEnabled}
            onchange={(checked) => updateSettings({ tvModeEnabled: checked })}
          />
        </div>

        <!-- TV Shortcut Toggle -->
        <div class="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("showTvShortcut")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("showTvShortcutDesc")}
            </p>
          </div>
          <Switch
            checked={!!settings.showTvShortcut}
            onchange={(checked) => updateSettings({ showTvShortcut: checked })}
          />
        </div>

        <!-- Mosque Name Input -->
        <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl shadow-sm border border-[var(--md-sys-color-outline)]/5 pt-3">
          <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
            {t("mosqueNameLabel")}
          </span>
          <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
            {settings.language === "ms"
              ? "Masukkan nama masjid atau surau untuk dipaparkan pada kepala Mod TV (Contoh: Masjid Negara)."
              : "Enter mosque or surau name to show in the TV Mode header (e.g. National Mosque)."}
          </span>
          <input
            type="text"
            value={settings.mosqueName ?? ""}
            oninput={(e: any) => updateSettings({ mosqueName: e.currentTarget.value })}
            placeholder={t("mosqueNamePlaceholder")}
            class="w-full mt-3 px-4 py-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] outline-none transition-all placeholder-[var(--md-sys-color-on-surface-variant)]/30 font-sans font-medium animate-all duration-300 search-focus-ring"
          />
        </div>
      </div>
    </div>
  {/if}
</div>
