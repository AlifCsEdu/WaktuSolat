<script lang="ts">
  import { BookOpen, ChevronDown, AlertCircle } from "lucide-svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { onMount, onDestroy } from "svelte";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);

  let cameraDevices = $state<MediaDeviceInfo[]>([]);
  let cameraPermissionStatus = $state<PermissionState | "prompt">("prompt");
  
  async function checkCameraPermissionsAndLoad(requestIfDenied = false) {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        cameraPermissionStatus = result.state;
        result.onchange = () => {
          cameraPermissionStatus = result.state;
          if (result.state === 'granted') {
            loadCameraDevices();
          }
        };
      }
      
      if (cameraPermissionStatus === 'granted' || requestIfDenied) {
        if (requestIfDenied && cameraPermissionStatus !== 'granted') {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          cameraPermissionStatus = 'granted';
        }
        await loadCameraDevices();
      }
    } catch (e) {
      console.warn("Camera permission error:", e);
    }
  }

  async function loadCameraDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameraDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (cameraDevices.length > 0 && !settings.tvModeCameraDeviceId) {
        updateSettings({ tvModeCameraDeviceId: cameraDevices[0].deviceId });
      } else if (settings.tvModeCameraDeviceId) {
        const stillExists = cameraDevices.some(d => d.deviceId === settings.tvModeCameraDeviceId);
        if (!stillExists && cameraDevices.length > 0) {
          updateSettings({ tvModeCameraDeviceId: cameraDevices[0].deviceId });
        }
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }

  $effect(() => {
    if (settings.tvModeCenterWidget === "camera") {
      checkCameraPermissionsAndLoad();
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
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
      <BookOpen size={18} class="text-[var(--md-sys-color-primary)]" />
      <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
        {t("sectionCenterWidget")}
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
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3">
          <div>
            <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
              {t("tvModeReminderIntervalLabel")}
            </span>
            <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 font-sans">
              {t("tvModeReminderIntervalDesc")}
            </span>
          </div>
          <div class="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
            <md-slider
              min="5"
              max="60"
              step="5"
              value={settings.tvModeReminderInterval ?? 15}
              labeled
              ticks
              onchange={(e: any) => updateSettings({ tvModeReminderInterval: parseInt(e.target.value) })}
              class="flex-1"
            ></md-slider>
            <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
              {settings.tvModeReminderInterval ?? 15}s
            </span>
          </div>
        </div>

        <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 mt-4 pt-4 border-t border-[var(--md-sys-color-outline)]/5 space-y-3">
          <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
            {t("centerWidgetTypeLabel")}
          </span>
          <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
            {t("centerWidgetTypeDesc")}
          </span>
          
          <div class="flex flex-wrap gap-2 mt-3">
            <md-filter-chip
              role="button"
              tabindex={0}
              onkeydown={handleKeyDown}
              label={t("widgetTypeNone")}
              selected={settings.tvModeCenterWidget === "none" || !settings.tvModeCenterWidget}
              onclick={() => updateSettings({ tvModeCenterWidget: "none" })}
            ></md-filter-chip>
            <md-filter-chip
              role="button"
              tabindex={0}
              onkeydown={handleKeyDown}
              label={t("widgetTypeReminders")}
              selected={settings.tvModeCenterWidget === "reminders"}
              onclick={() => updateSettings({ tvModeCenterWidget: "reminders" })}
            ></md-filter-chip>
            <md-filter-chip
              role="button"
              tabindex={0}
              onkeydown={handleKeyDown}
              label={t("widgetTypeSlideshow")}
              selected={settings.tvModeCenterWidget === "slideshow"}
              onclick={() => updateSettings({ tvModeCenterWidget: "slideshow" })}
            ></md-filter-chip>
            <md-filter-chip
              role="button"
              tabindex={0}
              onkeydown={handleKeyDown}
              label={t("widgetTypeCamera")}
              selected={settings.tvModeCenterWidget === "camera"}
              onclick={() => updateSettings({ tvModeCenterWidget: "camera" })}
            ></md-filter-chip>
          </div>
        </div>

        {#if settings.tvModeCenterWidget === "slideshow"}
          <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 space-y-4">
            <div>
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                {t("slideshowUrlsLabel")}
              </span>
              <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                {t("slideshowUrlsDesc")}
              </span>
            </div>
            <textarea 
              value={settings.tvModeSlideshowUrls ?? ""}
              oninput={(e: any) => updateSettings({ tvModeSlideshowUrls: e.currentTarget.value })}
              placeholder="https://example.com/slide1.jpg&#10;https://example.com/slide2.png"
              class="w-full h-32 p-3 text-xs font-mono bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline)]/20 focus:border-[var(--md-sys-color-primary)] outline-none resize-none custom-scrollbar"
            ></textarea>
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[var(--md-sys-color-outline)]/5 pt-4 gap-3">
              <div>
                <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                  {t("slideshowIntervalLabel")}
                </span>
              </div>
              <div class="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                <md-slider
                  min="5"
                  max="120"
                  step="5"
                  value={settings.tvModeSlideshowInterval ?? 15}
                  labeled
                  ticks
                  onchange={(e: any) => updateSettings({ tvModeSlideshowInterval: parseInt(e.target.value) })}
                  class="flex-1"
                ></md-slider>
                <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                  {settings.tvModeSlideshowInterval ?? 15}s
                </span>
              </div>
            </div>
          </div>
        {/if}

        {#if settings.tvModeCenterWidget === "camera"}
          <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 space-y-4">
            <div>
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                {t("cameraSelectLabel")}
              </span>
              <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                {settings.language === "ms"
                  ? "Pilih peranti kamera/webcam daripada PC/Laptop anda untuk memaparkan suapan langsung penceramah."
                  : "Select a camera/webcam device from your PC/Laptop to display live speaker stream."}
              </span>
            </div>

            {#if cameraPermissionStatus !== 'granted'}
              <div class="flex flex-col items-center justify-center p-6 bg-[var(--md-sys-color-surface-container)] rounded-2xl text-center space-y-3">
                <AlertCircle size={24} class="text-[var(--md-sys-color-warning)]" />
                <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                  {t("cameraNoPermission")}
                </p>
                <button 
                  type="button"
                  onclick={() => checkCameraPermissionsAndLoad(true)}
                  class="px-4 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  {t("cameraRequestPermission")}
                </button>
              </div>
            {:else}
              <select 
                value={settings.tvModeCameraDeviceId ?? ""}
                onchange={(e: any) => updateSettings({ tvModeCameraDeviceId: e.currentTarget.value })}
                class="w-full p-3 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-xl border border-[var(--md-sys-color-outline)]/20 outline-none text-sm font-medium"
              >
                <option value="">-- {t("cameraNotSelected")} --</option>
                {#each cameraDevices as device}
                  <option value={device.deviceId}>
                    {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </option>
                {/each}
              </select>
            {/if}
          </div>
        {/if}

      </div>
    </div>
  {/if}
</div>
