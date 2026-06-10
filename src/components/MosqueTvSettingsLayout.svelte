<script lang="ts">
  import { Clock, ChevronDown } from "lucide-svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";

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
      <Clock size={18} class="text-[var(--md-sys-color-primary)]" />
      <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
        {t("sectionLayoutDisplay")}
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
        <!-- Show Weather Toggle -->
        <div class="flex items-center justify-between p-1">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvShowWeatherLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvShowWeatherDesc")}
            </p>
          </div>
          <md-switch
            selected={settings.tvModeShowWeather !== false}
            onchange={(e: any) => updateSettings({ tvModeShowWeather: e.target.selected })}
            icons
          ></md-switch>
        </div>

        <!-- Show Countdown Panel Toggle -->
        <div class="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvShowCountdownLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvShowCountdownDesc")}
            </p>
          </div>
          <md-switch
            selected={settings.tvModeShowCountdown !== false}
            onchange={(e: any) => updateSettings({ tvModeShowCountdown: e.target.selected })}
            icons
          ></md-switch>
        </div>

        <!-- Show Date Bar Toggle -->
        <div class="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvShowDateBarLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvShowDateBarDesc")}
            </p>
          </div>
          <md-switch
            selected={settings.tvModeShowDateBar !== false}
            onchange={(e: any) => updateSettings({ tvModeShowDateBar: e.target.selected })}
            icons
          ></md-switch>
        </div>

        <!-- Clock Colon Blink Toggle -->
        <div class="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvClockColonBlinkLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvClockColonBlinkDesc")}
            </p>
          </div>
          <md-switch
            selected={settings.tvModeClockColonBlink !== false}
            onchange={(e: any) => updateSettings({ tvModeClockColonBlink: e.target.selected })}
            icons
          ></md-switch>
        </div>

        <!-- Clock Hide Seconds Toggle -->
        <div class="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              {t("tvModeHideSecondsLabel")}
            </h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
              {t("tvModeHideSecondsDesc")}
            </p>
          </div>
          <md-switch
            selected={!!settings.tvModeHideSeconds}
            onchange={(e: any) => updateSettings({ tvModeHideSeconds: e.target.selected })}
            icons
          ></md-switch>
        </div>

        <!-- Scrolling Ticker Speed -->
        <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl shadow-sm border border-[var(--md-sys-color-outline)]/5 pt-3 border-t border-[var(--md-sys-color-outline)]/5 mt-3">
          <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
            {t("tvModeTickerSpeedLabel")}
          </span>
          <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
            {t("tvModeTickerSpeedDesc")}
          </span>
          <div class="flex flex-wrap gap-2 mt-3">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filter-chip
              label={t("tickerSpeedSlow")}
              selected={settings.tvModeTickerSpeed === "slow"}
              onclick={() => updateSettings({ tvModeTickerSpeed: "slow" })}
            ></md-filter-chip>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filter-chip
              label={t("tickerSpeedMedium")}
              selected={settings.tvModeTickerSpeed === "medium" || !settings.tvModeTickerSpeed}
              onclick={() => updateSettings({ tvModeTickerSpeed: "medium" })}
            ></md-filter-chip>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filter-chip
              label={t("tickerSpeedFast")}
              selected={settings.tvModeTickerSpeed === "fast"}
              onclick={() => updateSettings({ tvModeTickerSpeed: "fast" })}
            ></md-filter-chip>
          </div>
        </div>

        <!-- Scrolling Ticker Text Size -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3 mt-3">
          <div>
            <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
              {t("tvModeTickerSizeLabel")}
            </span>
            <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 font-sans">
              {t("tvModeTickerSizeDesc")}
            </span>
          </div>
          <div class="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
            <md-slider
              min="70"
              max="130"
              step="5"
              value={settings.tvModeTickerSize ?? 100}
              labeled
              ticks
              onchange={(e: any) => updateSettings({ tvModeTickerSize: parseInt(e.target.value) })}
              class="flex-1"
            ></md-slider>
            <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
              {settings.tvModeTickerSize ?? 100}%
            </span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
