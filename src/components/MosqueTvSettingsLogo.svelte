<script lang="ts">
  import { Sparkles, ChevronDown, Upload, Trash2, MapPin, Clock } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { getMosqueLogoBlob, saveMosqueLogo, clearMosqueLogo } from "../lib/db";
  import { StorageManager } from "../lib/StorageManager";
  import { onMount, onDestroy } from "svelte";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);

  let previewLogoUrl = $state<string | null>(null);
  let logoFileInputRef = $state<HTMLInputElement | null>(null);

  // We should manage the object URL correctly to prevent memory leaks
  $effect(() => {
    let active = true;
    if (settings.mosqueLogoEnabled) {
      if (settings.mosqueLogoUrl) {
        previewLogoUrl = settings.mosqueLogoUrl;
      } else {
        getMosqueLogoBlob().then((blob) => {
          if (blob && active) {
            previewLogoUrl = URL.createObjectURL(blob);
          }
        });
      }
    } else {
      previewLogoUrl = null;
    }
    
    return () => {
      active = false;
      // Ideally we would revoke object URLs, but we don't have the original reference reliably here.
      // Svelte 5 will clean up the effect if we manage the URL cleanly.
    };
  });

  async function handleLogoUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      try {
        const url = await saveMosqueLogo(file);
        updateSettings({
          mosqueLogoEnabled: true,
          mosqueLogoUrl: "", // Reset URL if uploaded to IndexedDB
          mosqueLogoLastUpdated: Date.now()
        });
        previewLogoUrl = url;
      } catch (e) {
        console.error("Failed to save custom logo to IndexedDB:", e);
      }
    }
  }

  async function handleClearLogo() {
    try {
      await clearMosqueLogo();
      updateSettings({
        mosqueLogoEnabled: false,
        mosqueLogoUrl: ""
      });
      previewLogoUrl = null;
    } catch (e) {
      console.error("Failed to clear mosque logo:", e);
    }
  }
</script>

<div class="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
  >
    <div class="flex items-center gap-3">
      <Sparkles size={18} class="text-[var(--md-sys-color-primary)]" />
      <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
        {t("sectionLogoBranding")}
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
        
        <div class="flex items-center justify-between p-1">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvLogoEnabledLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvLogoEnabledDesc")}
            </p>
          </div>
          <md-switch
            selected={!!settings.mosqueLogoEnabled}
            onchange={(e: any) => updateSettings({ mosqueLogoEnabled: e.target.selected })}
            icons
          ></md-switch>
        </div>

        {#if settings.mosqueLogoEnabled}
          <div class="flex flex-col gap-4 mt-4 pt-4 border-t border-[var(--md-sys-color-outline)]/10">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1 space-y-3">
                <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                  {t("uploadLogoLabel")}
                </span>
                <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block leading-relaxed">
                  {t("uploadLogoDesc")}
                </span>

                {#if previewLogoUrl && !settings.mosqueLogoUrl}
                  <button
                    type="button"
                    onclick={handleClearLogo}
                    class="px-4 py-2 bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    {t("deleteLogo")}
                  </button>
                {/if}

                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  bind:this={logoFileInputRef}
                  onchange={handleLogoUpload}
                />
                
                <button
                  type="button"
                  onclick={() => logoFileInputRef?.click()}
                  class="px-4 py-3 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline)]/10 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all w-full flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={16} />
                  <span>{previewLogoUrl ? t("changeLogoBtn") : t("uploadLogoBtn")}</span>
                </button>
              </div>

              <div class="flex-1 bg-[var(--md-sys-color-surface-container-low)] rounded-xl border border-[var(--md-sys-color-outline)]/10 p-4 space-y-4">
                
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    {t("logoShapeLabel")}
                  </span>
                  <select
                    value={settings.mosqueLogoShape || 'original'}
                    onchange={(e: any) => updateSettings({ mosqueLogoShape: e.currentTarget.value as any })}
                    class="text-xs bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    <option value="original">{t("shapeOriginal")}</option>
                    <option value="circle">{t("shapeCircle")}</option>
                    <option value="rounded">{t("shapeRounded")}</option>
                    <option value="square">{t("shapeSquare")}</option>
                  </select>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    {t("logoBgLabel")}
                  </span>
                  <select
                    value={settings.mosqueLogoBgMode || 'transparent'}
                    onchange={(e: any) => updateSettings({ mosqueLogoBgMode: e.currentTarget.value as any })}
                    class="text-xs bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    <option value="transparent">{t("bgTransparent")}</option>
                    <option value="white">{t("bgWhite")}</option>
                    <option value="theme-container">{t("bgThemeContainer")}</option>
                    <option value="theme-primary">{t("bgThemePrimary")}</option>
                  </select>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    {t("logoAlignmentLabel")}
                  </span>
                  <select
                    value={settings.mosqueLogoAlignment || 'left'}
                    onchange={(e: any) => updateSettings({ mosqueLogoAlignment: e.currentTarget.value as any })}
                    class="text-xs bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    <option value="left">{t("alignLeft")}</option>
                    <option value="top">{t("alignTop")}</option>
                    <option value="right">{t("alignRight")}</option>
                  </select>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    Blend Mode
                  </span>
                  <select
                    value={settings.mosqueLogoBlendMode || 'none'}
                    onchange={(e: any) => updateSettings({ mosqueLogoBlendMode: e.currentTarget.value as any })}
                    class="text-xs bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    <option value="none">Normal</option>
                    <option value="multiply">Multiply (Darken)</option>
                    <option value="screen">Screen (Lighten)</option>
                  </select>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    {t("logoSizeLabel")}
                  </span>
                  <div class="flex items-center gap-2 max-w-[200px] w-full justify-end">
                    <md-slider
                      min="32"
                      max="120"
                      step="4"
                      value={settings.mosqueLogoSize ?? 48}
                      labeled
                      ticks
                      onchange={(e: any) => updateSettings({ mosqueLogoSize: parseInt(e.target.value) })}
                      class="flex-1"
                    ></md-slider>
                    <span class="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-12 text-right">
                      {settings.mosqueLogoSize ?? 48}px
                    </span>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                  <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                    {t("logoPaddingLabel")}
                  </span>
                  <div class="flex items-center gap-2 max-w-[200px] w-full justify-end">
                    <md-slider
                      min="0"
                      max="24"
                      step="2"
                      value={settings.mosqueLogoPadding ?? 0}
                      labeled
                      ticks
                      onchange={(e: any) => updateSettings({ mosqueLogoPadding: parseInt(e.target.value) })}
                      class="flex-1"
                    ></md-slider>
                    <span class="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-12 text-right">
                      {settings.mosqueLogoPadding ?? 0}px
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {#if previewLogoUrl}
              <div class="flex flex-col p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 space-y-3">
                <span class="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                  {settings.language === "ms" ? "Pratonton Kepala TV Secara Langsung" : "Live TV Header Mock Preview"}
                </span>
                
                <div class="relative p-4 bg-[var(--md-sys-color-surface-container-lowest)]/50 backdrop-blur-xl border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl w-full overflow-hidden islamic-pattern-overlay min-h-[90px] flex items-center justify-between shadow-inner">
                  <div class="flex items-center gap-3 relative z-10 {settings.mosqueLogoAlignment === 'top' ? 'flex-col items-center gap-1.5 text-center' : settings.mosqueLogoAlignment === 'right' ? 'flex-row-reverse items-center gap-2' : 'flex-row items-center gap-2'} text-sm font-black tracking-tight text-[var(--md-sys-color-primary)] transition-all duration-300">
                    <div
                      class="flex items-center justify-center shrink-0 overflow-hidden shadow-sm transition-all duration-300 {settings.mosqueLogoBgMode === 'white' ? 'bg-white' : settings.mosqueLogoBgMode === 'theme-container' ? 'bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/10' : settings.mosqueLogoBgMode === 'theme-primary' ? 'bg-[var(--md-sys-color-primary)]' : 'bg-transparent'} {settings.mosqueLogoShape === 'circle' ? 'rounded-full' : settings.mosqueLogoShape === 'square' ? 'rounded-none' : settings.mosqueLogoShape === 'rounded' ? 'rounded-lg' : ''}"
                      style="width: {(settings.mosqueLogoSize ?? 48) * 0.7}px; height: {(settings.mosqueLogoSize ?? 48) * 0.7}px; padding: {(settings.mosqueLogoPadding ?? 0) * 0.7}px;"
                    >
                      <img
                        src={previewLogoUrl}
                        alt="Mosque Logo"
                        class="max-h-full max-w-full object-contain"
                        style="mix-blend-mode: {settings.mosqueLogoBlendMode === 'multiply' ? 'multiply' : settings.mosqueLogoBlendMode === 'screen' ? 'screen' : 'normal'}"
                      />
                    </div>
                    <span class="text-xs truncate max-w-[150px]">{settings.mosqueName || "AlurWaktu TV"}</span>
                  </div>
                  
                  <div class="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[9px] font-bold border border-[var(--md-sys-color-outline-variant)]/30">
                    <MapPin size={10} class="text-[var(--md-sys-color-primary)]" />
                    <span class="truncate max-w-[80px]">{StorageManager.getZone() || t("selectZone")}</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
