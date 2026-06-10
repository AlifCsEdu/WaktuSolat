<script lang="ts">
  import type { ThemeVariant } from "../lib/theme";
  import { applyThemeFromHex, applyThemeFromImage, PRAYER_COLORS } from "../lib/theme";
  import { 
    Palette, 
    Image as ImageIcon, 
    Moon, 
    Sun, 
    Check, 
    Contrast, 
    Type, 
    X, 
    Monitor, 
    Sunset, 
    Upload, 
    Link as LinkIcon, 
    Sliders, 
    Sparkles, 
    Eye, 
    Compass,
    Trash2
  } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { M3_EASING } from "../lib/motion";
  import { appSettings } from "../state/settings.svelte";
  import { saveWallpaper, clearWallpaper, getWallpaperBlob } from "../lib/db";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  
  import "@material/web/slider/slider.js";
  import "@material/web/switch/switch.js";
  import "@material/web/iconbutton/filled-tonal-icon-button.js";
  import "@material/web/textfield/outlined-text-field.js";
  import "@material/web/icon/icon.js";
  import "@material/web/button/outlined-button.js";

  const PRESET_COLORS = [
    "#006C54", "#006874", "#2C5E8A", "#5A539B", "#734C9E",
    "#984061", "#B3261E", "#9E423A", "#8C5000", "#6E5D00",
    "#4F6354", "#3A4851", "#1A1C1E", "#6B7075",
  ];

  const PRAYER_DETAILS = [
    { key: "fajr", nameKey: "fajr", color: PRAYER_COLORS.fajr, icon: Sunset, desc: "Subuh" },
    { key: "dhuhr", nameKey: "dhuhr", color: PRAYER_COLORS.dhuhr, icon: Sun, desc: "Zohor" },
    { key: "asr", nameKey: "asr", color: PRAYER_COLORS.asr, icon: Compass, desc: "Asar" },
    { key: "maghrib", nameKey: "maghrib", color: PRAYER_COLORS.maghrib, icon: Sunset, desc: "Maghrib" },
    { key: "isha", nameKey: "isha", color: PRAYER_COLORS.isha, icon: Moon, desc: "Isyak" }
  ];

  let isOpen = $state(false);
  let previewWallpaperUrl = $state<string | null>(null);

  let containerRef: HTMLDivElement | undefined = $state();
  let fileInputRef: HTMLInputElement | undefined = $state();

  let VARIANTS = $derived([
    { id: "tonal_spot", name: appSettings.t("variantAsas") },
    { id: "vibrant", name: appSettings.t("variantCeria") },
    { id: "expressive", name: appSettings.t("variantEkspresif") },
    { id: "fidelity", name: appSettings.t("variantSetia") },
    { id: "neutral", name: appSettings.t("variantNeutral") },
    { id: "monochrome", name: appSettings.t("variantMono") },
    { id: "content", name: appSettings.t("variantKandungan") },
  ] as { id: ThemeVariant; name: string }[]);

  let CONTRASTS = $derived([
    { value: 0.0, name: appSettings.t("contrastStandard") },
    { value: 0.5, name: appSettings.t("contrastMedium") },
    { value: 1.0, name: appSettings.t("contrastHigh") }
  ]);

  let FONTS = $derived([
    { id: "'Plus Jakarta Sans', sans-serif", name: appSettings.t("fontModern") },
    { id: "'Outfit', sans-serif", name: appSettings.t("fontGeometric") },
    { id: "'Quicksand', sans-serif", name: appSettings.t("fontFriendly") },
    { id: "'Playfair Display', serif", name: appSettings.t("fontClassic") },
    { id: "'JetBrains Mono', monospace", name: appSettings.t("fontTechnical") }
  ]);

  let SHAPES = $derived([
    { id: "rounded", name: appSettings.t("shapeRounded") },
    { id: "boxy", name: appSettings.t("shapeBoxy") },
    { id: "semi", name: appSettings.t("shapeSemi") },
    { id: "pill", name: appSettings.t("shapePill") },
  ]);

  let VISUAL_STYLES = $derived([
    { id: "default", name: appSettings.t("styleDefault") },
    { id: "retro", name: appSettings.t("styleRetro") },
    { id: "glass", name: appSettings.t("styleGlass") },
    { id: "soft", name: appSettings.t("styleSoft") },
  ]);

  $effect(() => {
    let active = true;
    if (appSettings.settings.wallpaperEnabled && appSettings.settings.wallpaperSource === "upload") {
      getWallpaperBlob().then((blob) => {
        if (blob && active) {
          const url = URL.createObjectURL(blob);
          previewWallpaperUrl = url;
        }
      });
    } else {
      previewWallpaperUrl = null;
    }
    return () => {
      active = false;
    };
  });
  
  $effect(() => {
    return () => {
      if (previewWallpaperUrl) {
        URL.revokeObjectURL(previewWallpaperUrl);
      }
    };
  });
  
  function handleClickOutside(event: MouseEvent) {
    if (containerRef && !containerRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function withTransition(action: () => void) {
    document.documentElement.classList.add('theme-transitioning');
    action();
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 600);
  }

  function handleColorSelect(hex: string) {
    withTransition(() => {
      appSettings.updateSettings({ 
        themeColor: hex, 
        colorThemeMode: "manual" 
      });
    });
  }
  
  function handleVariantSelect(variant: ThemeVariant) {
    withTransition(() => {
      appSettings.updateSettings({ themeVariant: variant });
    });
  }
  
  function handleContrastSelect(val: number) {
    withTransition(() => {
      appSettings.updateSettings({ themeContrast: val });
    });
  }

  function handleFontSelect(fontId: string) {
    withTransition(() => {
      appSettings.updateSettings({ themeFont: fontId });
    });
  }

  function handleShapeSelect(shapeId: string) {
    withTransition(() => {
      appSettings.updateSettings({ themeShape: shapeId as any });
    });
  }

  function handleVisualStyleSelect(styleId: string) {
    withTransition(() => {
      const activeFont = appSettings.settings.themeFont;
      const activeShape = appSettings.settings.themeShape;
      
      let newFont = activeFont;
      let newShape = activeShape;

      if (styleId === 'retro') {
        if (activeFont === "'Playfair Display', serif" || activeFont === "'Quicksand', sans-serif") {
          newFont = "'Outfit', sans-serif";
        }
        if (activeShape === 'pill') {
          newShape = 'boxy';
        }
      } else if (styleId === 'glass') {
        if (activeFont === "'JetBrains Mono', monospace") {
          newFont = "'Plus Jakarta Sans', sans-serif";
        }
        if (activeShape === 'boxy') {
          newShape = 'rounded';
        }
      } else if (styleId === 'soft') {
        if (activeShape === 'boxy') {
          newShape = 'rounded';
        }
      }

      appSettings.updateSettings({ 
        visualStyle: styleId as any,
        themeFont: newFont,
        themeShape: newShape as any
      });
    });
  }

  async function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      withTransition(async () => {
        try {
          const url = await saveWallpaper(file);
          appSettings.updateSettings({
            wallpaperEnabled: true,
            wallpaperSource: "upload",
            wallpaperUrl: "",
            wallpaperLastUpdated: Date.now()
          });
          previewWallpaperUrl = url;
        } catch (e) {
          console.error("Failed to save custom wallpaper to IndexedDB:", e);
        }
      });
    }
  }

  async function handleClearWallpaper() {
    withTransition(async () => {
      try {
        await clearWallpaper();
        appSettings.updateSettings({
          wallpaperEnabled: false,
          wallpaperUrl: ""
        });
        previewWallpaperUrl = null;
      } catch (e) {
        console.error("Failed to clear custom wallpaper:", e);
      }
    });
  }

  let activeModeText = $derived(() => {
    if (appSettings.settings.darkThemeMode === "system") {
      return appSettings.t("darkThemeModeSystem");
    } else if (appSettings.settings.darkThemeMode === "solar") {
      return appSettings.t("darkThemeModeSolar");
    } else if (appSettings.settings.darkThemeMode === "prayer") {
      return appSettings.t("darkThemeModePrayer");
    }
    return appSettings.settings.themeDark ? appSettings.t("darkMode") : appSettings.t("lightMode");
  });
  
  const MODES = [
    { id: "manual", icon: Sun, labelKey: "darkThemeModeManual" },
    { id: "system", icon: Monitor, labelKey: "darkThemeModeSystem" },
    { id: "solar", icon: Sunset, labelKey: "darkThemeModeSolar" },
    { id: "prayer", icon: Compass, labelKey: "darkThemeModePrayer" }
  ];

  const SOURCES = [
    { id: "upload", labelKey: "wallpaperSourceUpload", icon: Upload },
    { id: "url", labelKey: "wallpaperSourceUrl", icon: LinkIcon }
  ];

  const OVERLAY_STYLES = [
    { id: "tint", labelKey: "wallpaperOverlayStyleTint" },
    { id: "dark", labelKey: "wallpaperOverlayStyleDark" },
    { id: "light", labelKey: "wallpaperOverlayStyleLight" }
  ];
</script>

<svelte:window onmousedown={handleClickOutside} />

<div class="relative z-50 lg:static" bind:this={containerRef}>
  <div class="inline-flex flex-shrink-0 w-12 h-12 lg:w-[56px] lg:h-[56px] hover:scale-110 hover:rotate-[15deg] active:scale-90 active:rotate-[-5deg] transition-transform duration-300">
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <md-filled-tonal-icon-button
      onclick={() => isOpen = !isOpen}
      title={appSettings.t("themeSettings")}
      style="--md-filled-tonal-icon-button-container-shape: 24px; width: 100%; height: 100%;"
    >
      <Palette size={22} class="stroke-[2.5]" />
    </md-filled-tonal-icon-button>
  </div>

  {#if isOpen}
    <!-- Mobile background shade overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 bg-black/40 z-[90] sm:hidden"
      onclick={() => isOpen = false}></div>
    
    <div 
      transition:fly={{ y: "100%", duration: 400, opacity: 0 }}
      class="fixed bottom-0 left-0 right-0 rounded-t-[2.5rem] shadow-2xl border border-[var(--md-sys-color-outline)]/10 bg-[var(--md-sys-color-surface-container)] flex flex-col p-6 z-[100] max-h-[85vh] overflow-y-auto no-scrollbar sm:absolute sm:top-[calc(100%+12px)] sm:bottom-auto sm:right-0 sm:left-auto lg:left-0 lg:right-auto sm:w-[390px] sm:transform-origin-top-right xl:transform-origin-top-left sm:rounded-[2rem]"
      style="transform-origin: top right;"
    >
      <div class="w-12 h-1.5 bg-[var(--md-sys-color-outline)]/20 rounded-full mx-auto mb-4 sm:hidden"></div>
      
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm font-black uppercase tracking-wider text-[var(--md-sys-color-primary)]">
          {appSettings.t("themeSettings")}
        </span>
        <button 
          onclick={() => isOpen = false}
          class="w-8 h-8 rounded-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] transition-all focus:outline-none hover:scale-110 active:scale-90"
          aria-label="Close theme settings"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div class="space-y-4">
        <!-- SECTION 1: Dark Mode Configuration -->
        <div class="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-[1.75rem] space-y-3">
          <h3 class="md3-label-medium text-[var(--md-sys-color-primary)] uppercase tracking-widest flex items-center gap-2">
            <Moon size={16} strokeWidth={2.5} /> {appSettings.t("darkThemeModeLabel")}
          </h3>
          
          <!-- Four-way segmented mode selector -->
          <div class="grid grid-cols-4 gap-1 p-1 bg-[var(--md-sys-color-surface-container-high)] rounded-2xl">
            {#each MODES as mode}
              {@const isSelected = appSettings.settings.darkThemeMode === mode.id}
              {@const Icon = mode.icon}
              <button 
                onclick={() => withTransition(() => appSettings.updateSettings({ darkThemeMode: mode.id as any }))}
                class={cn(
                  "relative overflow-hidden flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-center transition-all duration-200",
                  isSelected 
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm scale-102"
                    : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                )}
              >
                <md-ripple></md-ripple>
                <Icon size={16} class="mb-1" strokeWidth={2.5} />
                <span class="text-[9px] sm:text-[10px] font-bold tracking-tighter sm:tracking-tight leading-none">{appSettings.t(mode.labelKey as any)}</span>
              </button>
            {/each}
          </div>

          <!-- Manual Mode Secondary Toggle Switch -->
          {#if appSettings.settings.darkThemeMode === "manual"}
            <button 
              transition:slide={{ duration: 150 }}
              onclick={() => withTransition(() => appSettings.updateSettings({ themeDark: !appSettings.settings.themeDark }))}
              class="w-full flex items-center justify-center gap-2 bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-surface)] hover:text-[var(--md-sys-color-on-primary)] py-2.5 rounded-xl md3-label-large transition-all shadow-sm duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {#if appSettings.settings.themeDark}
                <Sun size={18} strokeWidth={2.5} />
                {appSettings.t("lightMode")}
              {:else}
                <Moon size={18} strokeWidth={2.5} />
                {appSettings.t("darkMode")}
              {/if}
            </button>
          {/if}

          <!-- Auto mode description bubble -->
          <div class="text-[11px] font-medium text-[var(--md-sys-color-on-surface-variant)] text-center italic bg-[var(--md-sys-color-surface-container-highest)]/30 py-1.5 px-3 rounded-lg border border-[var(--md-sys-color-outline)]/5">
            {appSettings.t("activePrayer" as any)}: <span class="font-black text-[var(--md-sys-color-primary)] normal-case">{activeModeText()}</span>
          </div>
        </div>

        <!-- SECTION 2: Color Palette Settings -->
        <div class="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-[1.75rem] space-y-3">
          <h3 class="md3-label-medium text-[var(--md-sys-color-primary)] uppercase tracking-widest flex items-center gap-2">
            <Palette size={16} strokeWidth={2.5} /> {appSettings.t("colorThemeModeLabel")}
          </h3>

          <!-- Toggle selector: Manual vs Prayer-time Auto Colors -->
          <div class="grid grid-cols-2 gap-1 p-1 bg-[var(--md-sys-color-surface-container-high)] rounded-2xl">
            {#each [{ id: "manual", label: appSettings.t("colorThemeModeManual") }, { id: "prayer", label: appSettings.t("colorThemeModePrayer") }] as source}
              {@const isSelected = appSettings.settings.colorThemeMode === source.id}
              <button 
                onclick={() => withTransition(() => appSettings.updateSettings({ colorThemeMode: source.id as any }))}
                class={cn(
                  "relative overflow-hidden py-2 rounded-xl text-xs font-black transition-all duration-200 text-center",
                  isSelected 
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm scale-102"
                    : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                )}
              >
                <md-ripple></md-ripple>
                {source.label}
              </button>
            {/each}
          </div>

          <!-- Color display dynamic lists -->
          {#if appSettings.settings.colorThemeMode === "manual"}
            <!-- Manual Swatches Grid -->
            <div class="flex flex-wrap gap-2 justify-center pt-1">
              {#each PRESET_COLORS as color}
                <button 
                  onclick={() => handleColorSelect(color)}
                  class={cn(
                    "relative overflow-hidden w-8 h-8 rounded-[0.75rem] border-2 transition-all shadow-sm flex items-center justify-center shrink-0 duration-300 hover:scale-125 hover:rotate-12 active:scale-75",
                    appSettings.settings.themeColor === color && !appSettings.settings.wallpaperEnabled
                      ? "border-transparent ring-2 ring-[var(--md-sys-color-primary)] scale-110 rounded-full" 
                      : "border-white/10 hover:border-white/40"
                  )}
                  style="background-color: {color};"
                >
                  <md-ripple></md-ripple>
                  {#if appSettings.settings.themeColor === color && !appSettings.settings.wallpaperEnabled}
                    <Check size={14} strokeWidth={4} class="text-white drop-shadow" />
                  {/if}
                </button>
              {/each}
              <label 
                class="relative overflow-hidden w-8 h-8 rounded-[0.75rem] bg-[var(--md-sys-color-surface-container-highest)] flex items-center justify-center cursor-pointer hover:bg-[var(--md-sys-color-secondary-container)] hover:scale-125 hover:rotate-12 active:scale-75 transition-all duration-300 border-2 border-transparent shadow-sm shrink-0"
                title={appSettings.t("customColor")}
              >
                <md-ripple></md-ripple>
                <input 
                  type="color"
                  class="opacity-0 absolute w-0 h-0"
                  value={appSettings.settings.themeColor || "#006C54"}
                  oninput={(e: any) => handleColorSelect(e.target.value)}
                />
                <span class="text-lg font-black text-[var(--md-sys-color-on-surface-variant)]">+</span>
              </label>
            </div>
          {:else}
            <!-- Auto Prayer Color previews horizontal/vertical deck -->
            <div class="grid grid-cols-5 gap-1 pt-1 bg-[var(--md-sys-color-surface-container-highest)]/40 p-2 rounded-2xl border border-[var(--md-sys-color-outline)]/5">
              {#each PRAYER_DETAILS as p}
                {@const Icon = p.icon}
                <div 
                  class="flex flex-col items-center p-1 rounded-xl text-center group cursor-default"
                  title="{p.desc}: {p.color}"
                >
                  <div 
                    class="w-7 h-7 rounded-[0.5rem] flex items-center justify-center relative shadow-sm border border-black/5"
                    style="background-color: {p.color};"
                  >
                    <Icon size={12} class="text-white/95" strokeWidth={2.5} />
                  </div>
                  <span class="text-[9px] font-black uppercase text-[var(--md-sys-color-on-surface-variant)] mt-1 tracking-tighter leading-none select-none">
                    {appSettings.t(p.nameKey as any)}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- SECTION 3: Sophisticated Wallpaper Customization Accordion -->
        <div class="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-[1.75rem] space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="md3-label-medium text-[var(--md-sys-color-primary)] uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={16} strokeWidth={2.5} /> {appSettings.t("enableWallpaper")}
            </h3>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-switch
              selected={!!appSettings.settings.wallpaperEnabled}
              onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperEnabled: !appSettings.settings.wallpaperEnabled }))}
            ></md-switch>
          </div>

          {#if appSettings.settings.wallpaperEnabled}
            <div 
              transition:slide={{ duration: 200 }}
              class="space-y-3 overflow-hidden pt-1"
            >
              <!-- Wallpaper Source Selection: Upload file vs URL Link -->
              <div class="grid grid-cols-2 gap-1 p-1 bg-[var(--md-sys-color-surface-container-high)] rounded-xl">
                {#each SOURCES as src}
                  {@const isSelected = appSettings.settings.wallpaperSource === src.id}
                  {@const Icon = src.icon}
                  <button 
                    onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperSource: src.id as any }))}
                    class={cn(
                      "relative overflow-hidden flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all",
                      isSelected 
                        ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm scale-102"
                        : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                    )}
                  >
                    <md-ripple></md-ripple>
                    <Icon size={12} strokeWidth={2.5} />
                    {appSettings.t(src.labelKey as any)}
                  </button>
                {/each}
              </div>

              <!-- Wallpaper Inputs -->
              {#if appSettings.settings.wallpaperSource === "upload"}
                <!-- Local Image Upload Area -->
                <div class="space-y-2">
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div 
                    onclick={() => fileInputRef?.click()}
                    class="flex flex-col items-center justify-center w-full aspect-[21/9] bg-[var(--md-sys-color-surface-container-high)] border-2 border-dashed border-[var(--md-sys-color-outline)]/20 hover:border-[var(--md-sys-color-primary)] rounded-xl cursor-pointer relative overflow-hidden group transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {#if previewWallpaperUrl}
                      <img src={previewWallpaperUrl} alt="Wallpaper preview" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-all duration-300" />
                      <div class="z-10 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] leading-none px-3.5 py-2 rounded-full text-[10px] font-black shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 transform">
                        {appSettings.t("changeImage")}
                      </div>
                    {:else}
                      <Upload size={18} class="mb-1 text-[var(--md-sys-color-on-surface-variant)] group-hover:scale-110 transition-transform" />
                      <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">{appSettings.t("extractFromWallpaper")}</span>
                    {/if}
                  </div>
                  
                  {#if previewWallpaperUrl}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <md-outlined-button onclick={handleClearWallpaper} class="w-full mt-3" style="--md-sys-color-primary: var(--md-sys-color-error);">
                      Padam Gambar Latar
                    </md-outlined-button>
                  {/if}

                  <input 
                    type="file"
                    bind:this={fileInputRef}
                    class="hidden"
                    accept="image/*"
                    onchange={handleImageUpload}
                  />
                </div>
              {:else}
                <!-- URL Address Input -->
                <div class="space-y-1">
                  <span class="text-[10px] font-black uppercase text-[var(--md-sys-color-on-surface-variant)] tracking-wider block mb-1">
                    {appSettings.t("wallpaperSourceUrl")}
                  </span>
                  <div class="w-full mt-1">
                    <!-- svelte-ignore a11y_consider_explicit_label -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <md-outlined-text-field
                      type="url"
                      label={appSettings.t("wallpaperUrlPlaceholder")}
                      value={appSettings.settings.wallpaperUrl || ""}
                      oninput={(e: any) => appSettings.updateSettings({ wallpaperUrl: e.target.value })}
                      class="w-full"
                      style="--md-outlined-text-field-container-shape: 12px;"
                    >
                      <md-icon slot="leading-icon">link</md-icon>
                    </md-outlined-text-field>
                  </div>
                </div>
              {/if}

              <!-- Blur Intensity Slider -->
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  <span>{appSettings.t("wallpaperBlurLabel")}</span>
                  <span class="font-black text-[var(--md-sys-color-primary)]">{appSettings.settings.wallpaperBlur ?? 10}px</span>
                </div>
                <md-slider
                  min="0"
                  max="40"
                  step="2"
                  value={appSettings.settings.wallpaperBlur ?? 10}
                  oninput={(e: any) => appSettings.updateSettings({ wallpaperBlur: parseInt(e.target.value) })}
                ></md-slider>
              </div>

              <!-- Overlay Dim Intensity Slider -->
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  <span>{appSettings.t("wallpaperDimLabel")}</span>
                  <span class="font-black text-[var(--md-sys-color-primary)]">{appSettings.settings.wallpaperDim ?? 40}%</span>
                </div>
                <md-slider
                  min="0"
                  max="90"
                  step="5"
                  value={appSettings.settings.wallpaperDim ?? 40}
                  oninput={(e: any) => appSettings.updateSettings({ wallpaperDim: parseInt(e.target.value) })}
                ></md-slider>
              </div>

              <!-- Overlay Color Style Selector -->
              <div class="space-y-1.5">
                <span class="text-[10px] font-black uppercase text-[var(--md-sys-color-on-surface-variant)] tracking-wider block">
                  {appSettings.t("wallpaperOverlayStyleLabel")}
                </span>
                <div class="flex flex-wrap gap-1.5">
                  {#each OVERLAY_STYLES as style}
                    {@const isSelected = appSettings.settings.wallpaperOverlayStyle === style.id}
                    <button 
                      onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperOverlayStyle: style.id as any }))}
                      class={cn(
                        "relative overflow-hidden px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                        isSelected
                          ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                          : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                      )}
                    >
                      <md-ripple></md-ripple>
                      {appSettings.t(style.labelKey as any)}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Text shadow glow boost toggle -->
              <div class="flex items-center justify-between border-t border-[var(--md-sys-color-outline)]/5 pt-2 mt-1">
                <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  {appSettings.t("wallpaperTextGlowLabel")}
                </span>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <md-switch
                  selected={!!appSettings.settings.wallpaperTextGlow}
                  onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperTextGlow: !appSettings.settings.wallpaperTextGlow }))}
                ></md-switch>
              </div>

              <!-- Vignette Shadow Toggle -->
              <div class="flex items-center justify-between border-t border-[var(--md-sys-color-outline)]/5 pt-2 mt-1">
                <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  {appSettings.t("wallpaperVignetteLabel")}
                </span>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <md-switch
                  selected={!!appSettings.settings.wallpaperVignette}
                  onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperVignette: !appSettings.settings.wallpaperVignette }))}
                ></md-switch>
              </div>

              <!-- Mosque Auto-Dim Toggle -->
              <div class="flex items-center justify-between border-t border-[var(--md-sys-color-outline)]/5 pt-2 mt-1">
                <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                  {appSettings.t("wallpaperMosqueAutoDimLabel")}
                </span>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <md-switch
                  selected={!!appSettings.settings.wallpaperMosqueAutoDim}
                  onclick={() => withTransition(() => appSettings.updateSettings({ wallpaperMosqueAutoDim: !appSettings.settings.wallpaperMosqueAutoDim }))}
                ></md-switch>
              </div>
            </div>
          {/if}
        </div>

        <!-- SECTION 4: Styling Options (Shapes, Typography, Visual Styles, Variants, Contrast) -->
        <div class="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-[1.75rem] space-y-4">
          <h3 class="md3-label-medium text-[var(--md-sys-color-primary)] uppercase tracking-widest flex items-center gap-2">
            <Sliders size={16} strokeWidth={2.5} /> {appSettings.t("advancedTheme")}
          </h3>
          
          <!-- Visual Styles -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
              {appSettings.t("visualStyle")}
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each VISUAL_STYLES as style}
                <button 
                  onclick={() => handleVisualStyleSelect(style.id)}
                  class={cn(
                    "relative overflow-hidden px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                    appSettings.settings.visualStyle === style.id
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                      : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                  )}
                >
                  <md-ripple></md-ripple>
                  {style.name}
                </button>
              {/each}
            </div>
          </div>

          <!-- Palette Styles -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
              {appSettings.t("paletteStyle")}
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each VARIANTS as variant}
                <button 
                  onclick={() => handleVariantSelect(variant.id)}
                  class={cn(
                    "relative overflow-hidden px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                    appSettings.settings.themeVariant === variant.id
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                      : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                  )}
                >
                  <md-ripple></md-ripple>
                  {variant.name}
                </button>
              {/each}
            </div>
          </div>

          <!-- Contrast Levels -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
              {appSettings.t("contrastLevelLabel")}
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each CONTRASTS as contrast}
                <button 
                  onclick={() => handleContrastSelect(contrast.value)}
                  class={cn(
                    "relative overflow-hidden px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                    appSettings.settings.themeContrast === contrast.value
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                      : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                  )}
                >
                  <md-ripple></md-ripple>
                  {contrast.name}
                </button>
              {/each}
            </div>
          </div>

          <!-- Typography -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
              Tipografi
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each FONTS as font}
                <button 
                  onclick={() => handleFontSelect(font.id)}
                  class={cn(
                    "relative overflow-hidden px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                    appSettings.settings.themeFont === font.id
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                      : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                  )}
                  style="font-family: {font.id};"
                >
                  <md-ripple></md-ripple>
                  {font.name}
                </button>
              {/each}
            </div>
          </div>

          <!-- Shape Scale -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block">
              Bentuk Lengkungan
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each SHAPES as shape}
                <button 
                  onclick={() => handleShapeSelect(shape.id)}
                  class={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-extrabold border transition-all",
                    appSettings.settings.themeShape === shape.id
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                      : "border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-outline)]/5"
                  )}
                >
                  <md-ripple></md-ripple>
                  {shape.name}
                </button>
              {/each}
            </div>
          </div>

        </div>
      </div>
    </div>
  {/if}
</div>
