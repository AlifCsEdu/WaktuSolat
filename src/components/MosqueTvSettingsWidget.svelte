<script lang="ts">
  import { BookOpen, ChevronDown, AlertCircle, Upload, Trash2, Image as ImageIcon } from "lucide-svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { onMount, onDestroy } from "svelte";
  import { saveAsset, getAssetBlob, deleteAsset } from "../lib/db";

  import { Slider, FilterChip } from "$lib/components/ui";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const slidesList = $derived((settings.tvModeSlideshowUrls || "").split("\n").map(l => l.trim()).filter(Boolean));
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);

  let cameraDevices = $state<MediaDeviceInfo[]>([]);
  let cameraPermissionStatus = $state<PermissionState | "prompt">("prompt");

  let localThumbnails = $state<Record<string, string>>({});
  let dragActive = $state(false);
  let uploadError = $state<string | null>(null);

  $effect(() => {
    let active = true;
    const urls = (settings.tvModeSlideshowUrls || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    const loadThumbnails = async () => {
      const thumbs: Record<string, string> = {};
      for (const url of urls) {
        if (url.startsWith("local:")) {
          const key = url.replace("local:", "");
          if (localThumbnails[key]) {
            thumbs[key] = localThumbnails[key];
            continue;
          }
          try {
            const blob = await getAssetBlob(key);
            if (blob) {
              thumbs[key] = URL.createObjectURL(blob);
            }
          } catch (e) {
            console.error(`Failed to load thumbnail for ${key}:`, e);
          }
        }
      }
      if (active) {
        Object.keys(localThumbnails).forEach(key => {
          if (!thumbs[key]) {
            try { URL.revokeObjectURL(localThumbnails[key]); } catch (e) {}
          }
        });
        localThumbnails = thumbs;
      } else {
        Object.values(thumbs).forEach(u => {
          try { URL.revokeObjectURL(u); } catch (e) {}
        });
      }
    };

    loadThumbnails();

    return () => {
      active = false;
    };
  });

  onDestroy(() => {
    Object.values(localThumbnails).forEach(u => {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });
  });

  function handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      dragActive = true;
    } else if (e.type === "dragleave") {
      dragActive = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragActive = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await uploadFiles(e.dataTransfer.files);
    }
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      await uploadFiles(input.files);
    }
  }

  async function uploadFiles(files: FileList) {
    uploadError = null;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSizeBytes = 5 * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        uploadError = settings.language === "ms"
          ? "Format fail tidak disokong. Sila gunakan JPG, PNG, WEBP atau GIF."
          : "Unsupported file format. Please use JPG, PNG, WEBP or GIF.";
        continue;
      }

      if (file.size > maxSizeBytes) {
        uploadError = settings.language === "ms"
          ? "Saiz fail melebihi had 5MB."
          : "File size exceeds 5MB limit.";
        continue;
      }

      try {
        const id = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
        const key = `slideshow-image-${id}`;
        await saveAsset(key, file);

        const currentUrls = settings.tvModeSlideshowUrls || "";
        const updatedUrls = currentUrls.trim()
          ? `${currentUrls.trim()}\nlocal:${key}`
          : `local:${key}`;
        
        updateSettings({ tvModeSlideshowUrls: updatedUrls });
      } catch (err) {
        console.error("Failed to upload slide:", err);
        uploadError = settings.language === "ms"
          ? "Gagal menyimpan fail ke storan tempatan."
          : "Failed to save file to local storage.";
      }
    }
  }

  async function handleDeleteSlide(slideUrl: string) {
    if (slideUrl.startsWith("local:")) {
      const key = slideUrl.replace("local:", "");
      try {
        await deleteAsset(key);
      } catch (e) {
        console.error(`Failed to delete asset ${key}:`, e);
      }
    }

    const currentUrls = (settings.tvModeSlideshowUrls || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);
    
    const updatedUrls = currentUrls
      .filter(url => url !== slideUrl)
      .join("\n");
    
    updateSettings({ tvModeSlideshowUrls: updatedUrls });
  }
  
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
            <Slider
              min={5}
              max={60}
              step={5}
              value={settings.tvModeReminderInterval ?? 15}
              onchange={(val) => updateSettings({ tvModeReminderInterval: val })}
              class="flex-1"
            />
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
            <FilterChip
              label={t("widgetTypeNone")}
              selected={settings.tvModeCenterWidget === "none" || !settings.tvModeCenterWidget}
              onclick={() => updateSettings({ tvModeCenterWidget: "none" })}
            />
            <FilterChip
              label={t("widgetTypeReminders")}
              selected={settings.tvModeCenterWidget === "reminders"}
              onclick={() => updateSettings({ tvModeCenterWidget: "reminders" })}
            />
            <FilterChip
              label={t("widgetTypeSlideshow")}
              selected={settings.tvModeCenterWidget === "slideshow"}
              onclick={() => updateSettings({ tvModeCenterWidget: "slideshow" })}
            />
            <FilterChip
              label={t("widgetTypeCamera")}
              selected={settings.tvModeCenterWidget === "camera"}
              onclick={() => updateSettings({ tvModeCenterWidget: "camera" })}
            />
          </div>
        </div>

        {#if settings.tvModeCenterWidget === "slideshow"}
          <div class="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 space-y-4">
            <div>
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                {settings.language === "ms" ? "Pengurus Slaid" : "Slideshow Manager"}
              </span>
              <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                {settings.language === "ms"
                  ? "Muat naik imej tempatan secara langsung (disimpan di luar talian) atau masukkan URL imej luaran."
                  : "Upload local images directly (stored offline) or add external image URLs."}
              </span>
            </div>

            <!-- Upload Drag-and-Drop Area -->
            <div
              role="button"
              tabindex={0}
              onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { (e.currentTarget.querySelector("input") as HTMLInputElement)?.click(); } }}
              class={cn(
                "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-center relative focus:outline-none focus:border-[var(--md-sys-color-primary)]",
                dragActive ? "border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/10" : "border-[var(--md-sys-color-outline)]/20"
              )}
              ondragenter={handleDrag}
              ondragover={handleDrag}
              ondragleave={handleDrag}
              ondrop={handleDrop}
              onclick={(e) => {
                const input = e.currentTarget.querySelector("input");
                if (input) input.click();
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                onchange={handleFileSelect}
              />
              <Upload size={24} class="text-[var(--md-sys-color-primary)]" />
              <div class="text-xs font-bold text-[var(--md-sys-color-on-surface)]">
                {settings.language === "ms" ? "Seret & lepas fail imej di sini, atau klik untuk memilih" : "Drag & drop image files here, or click to browse"}
              </div>
              <div class="text-[9px] text-[var(--md-sys-color-on-surface-variant)]">
                JPG, PNG, WEBP, GIF (Max 5MB)
              </div>
            </div>

            {#if uploadError}
              <div class="p-3 bg-[var(--md-sys-color-error-container)]/20 text-[var(--md-sys-color-error)] text-xs rounded-xl flex items-center gap-2 font-bold">
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            {/if}

            <!-- Visual Grid of Slides -->
            {#if slidesList.length > 0}
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {#each slidesList as slideUrl}
                  {@const isLocal = slideUrl.startsWith("local:")}
                  {@const localKey = isLocal ? slideUrl.replace("local:", "") : ""}
                  {@const thumbSrc = isLocal ? localThumbnails[localKey] : slideUrl}
                  <div class="relative aspect-[16/9] rounded-xl overflow-hidden bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/15 group shadow-sm flex items-center justify-center">
                    {#if thumbSrc}
                      <img src={thumbSrc} alt="Slide Preview" class="w-full h-full object-cover" />
                    {:else}
                      <div class="flex flex-col items-center justify-center text-[var(--md-sys-color-on-surface-variant)]/60 text-[10px] gap-1 font-bold">
                        <ImageIcon size={18} />
                        <span>Loading...</span>
                      </div>
                    {/if}
                    <!-- Delete Button Overlay -->
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); handleDeleteSlide(slideUrl); }}
                      class="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer shadow"
                    >
                      <Trash2 size={12} />
                    </button>
                    <!-- Local/Remote badge -->
                    <div class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-[8px] font-bold text-white rounded uppercase tracking-wider">
                      {isLocal ? "Local" : "Remote"}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Remote Image URL adder -->
            <div class="flex gap-2">
              <input
                type="url"
                placeholder={settings.language === "ms" ? "Masukkan URL imej luaran..." : "Enter external image URL..."}
                class="flex-1 p-2.5 text-xs bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-xl border border-[var(--md-sys-color-outline)]/20 focus:border-[var(--md-sys-color-primary)] outline-none"
                onkeydown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const input = e.currentTarget as HTMLInputElement;
                    const val = input.value.trim();
                    if (val && val.startsWith("http")) {
                      const currentUrls = settings.tvModeSlideshowUrls || "";
                      const updatedUrls = currentUrls.trim()
                        ? `${currentUrls.trim()}\n${val}`
                        : val;
                      updateSettings({ tvModeSlideshowUrls: updatedUrls });
                      input.value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                onclick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const val = input.value.trim();
                  if (val && val.startsWith("http")) {
                    const currentUrls = settings.tvModeSlideshowUrls || "";
                    const updatedUrls = currentUrls.trim()
                      ? `${currentUrls.trim()}\n${val}`
                      : val;
                    updateSettings({ tvModeSlideshowUrls: updatedUrls });
                    input.value = "";
                  }
                }}
                class="px-4 py-2.5 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {settings.language === "ms" ? "Tambah" : "Add"}
              </button>
            </div>

            <!-- Advanced Area: Raw Textarea editing -->
            <details class="group border-t border-[var(--md-sys-color-outline)]/5 pt-3">
              <summary class="text-xs font-bold text-[var(--md-sys-color-primary)] hover:underline list-none flex items-center gap-1 cursor-pointer">
                <span>{settings.language === "ms" ? "Pautan Imej Lanjut" : "Advanced Image Links"}</span>
              </summary>
              <div class="mt-3 space-y-2">
                <textarea 
                  value={settings.tvModeSlideshowUrls ?? ""}
                  oninput={(e: any) => updateSettings({ tvModeSlideshowUrls: e.currentTarget.value })}
                  placeholder="https://example.com/slide1.jpg&#10;https://example.com/slide2.png"
                  class="w-full h-24 p-3 text-xs font-mono bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline)]/20 focus:border-[var(--md-sys-color-primary)] outline-none resize-none custom-scrollbar"
                ></textarea>
              </div>
            </details>
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[var(--md-sys-color-outline)]/5 pt-4 gap-3">
              <div>
                <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                  {t("slideshowIntervalLabel")}
                </span>
              </div>
              <div class="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                <Slider
                  min={5}
                  max={120}
                  step={5}
                  value={settings.tvModeSlideshowInterval ?? 15}
                  onchange={(val) => updateSettings({ tvModeSlideshowInterval: val })}
                  class="flex-1"
                />
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
