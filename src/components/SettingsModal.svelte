<script lang="ts">
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { portal } from "../lib/portal";
  import {
    X, Bell, BellRing, Volume2, VolumeX, Volume1, Mic, Activity,
    Settings as SettingsIcon, Clock, Smartphone, Music, ChevronDown, ChevronLeft,
    ChevronRight, Plus, Minus, WifiOff, Download, RefreshCw, Check,
    AlertCircle, Trash2, Sliders, MoonStar, Search, Tv, Upload,
    ChevronUp, Heart, BookOpen, Sparkles, GripVertical, Copy
  } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import type {
    PrayerKey, PrayerPreference, NotificationSound, PreAlertTime
  } from "../types";
  import { DEFAULT_GENERAL_SETTINGS } from "../types";
  import type { TvModeReminder } from "../types";
  import {
    saveOfflinePrayers, clearAllOfflinePrayers, saveMosqueLogo,
    getMosqueLogoBlob, clearMosqueLogo
  } from "../lib/db";
  import { StorageManager } from "../lib/StorageManager";
  import { appSettings } from "../state/settings.svelte";
  import { getStyleClasses } from "../hooks/useVisualStyle";
  import MosqueTvSettings from "./MosqueTvSettings.svelte";
  import { Button, IconButton, FilterChip, Switch, Slider, TextField } from "$lib/components/ui";
  import { ripple } from "$lib/actions/ripple";
  import { playSynthesizedSound } from "../lib/audio";

  function playSynthesizedSoundLocal(type: 'chime' | 'tick', volume = 0.8, pitchHz?: number) {
    playSynthesizedSound(type, volume, pitchHz);
  }

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    preferences: Record<PrayerKey, PrayerPreference>;
    onUpdatePreference: (key: PrayerKey, updates: Partial<PrayerPreference>) => void;
    onResetPreferences: () => void;
    permission: string;
    onRequestPermission: () => void;
    onTestSound: (sound: NotificationSound, message: string) => void;
    selectedZone: string;
    onPreviewAzanAlert?: (style: string) => void;
  }

  let {
    isOpen = false,
    onClose,
    preferences,
    onUpdatePreference,
    onResetPreferences,
    permission,
    onRequestPermission,
    onTestSound,
    selectedZone,
    onPreviewAzanAlert
  }: Props = $props();

  const t = (k: any, p?: any) => appSettings.t(k, p);
  let settings = $derived(appSettings.settings);
  const updateSettings = (u: any) => appSettings.updateSettings(u);
  
  let visualStyle = $derived(appSettings.settings.visualStyle);
  
  let activeTab = $state("general");
  let showAdvancedGeneral = $state(false);
  let showAdvancedCalculations = $state(false);
  let showHijriEngine = $state(false);

  let downloadRange = $state<'week' | 'month' | 'year'>('month');
  let isDownloading = $state(false);
  let downloadError = $state<string | null>(null);
  let downloadSuccess = $state(false);
  let isClearing = $state(false);
  let clearSuccess = $state(false);
  
  let showResetToast = $state(false);
  
  let sidebarCollapsed = $state(StorageManager.getItem("settings_sidebar_collapsed") === "true");
  
  let searchQuery = $state("");
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let prevVolumeRef = $state<number>(80);

  let previewingPrayer = $state<string | null>(null);
  let previewTimeoutRef = $state<ReturnType<typeof setTimeout> | null>(null);

  function triggerTestSound(sound: NotificationSound, message: string, prayerKey: string) {
    if (previewTimeoutRef) {
      clearTimeout(previewTimeoutRef);
    }
    onTestSound(sound, message);
    previewingPrayer = prayerKey;
    const duration = sound === 'beep' ? 2000 :
                     sound === 'chime' ? 3000 :
                     sound === 'soft-chime' ? 2500 :
                     sound === 'bell-echo' ? 3000 :
                     sound === 'ambient-gong' ? 4000 :
                     sound === 'digital-sweep' ? 2000 :
                     (sound === 'azan1' || sound === 'azan2') ? 10000 : 3000;
                     
    previewTimeoutRef = setTimeout(() => {
      previewingPrayer = null;
    }, duration);
  }

  $effect(() => {
    return () => {
      if (previewTimeoutRef) clearTimeout(previewTimeoutRef);
    };
  });

  $effect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    StorageManager.setItem("settings_sidebar_collapsed", String(sidebarCollapsed));
  }

  async function handleSaveOffline() {
    if (!navigator.onLine) {
      downloadError = settings.language === "ms" ? "Tiada sambungan internet" : "No internet connection";
      return;
    }

    isDownloading = true;
    downloadError = null;
    downloadSuccess = false;

    try {
      let url = `/api/solat/${selectedZone}`;
      if (downloadRange === 'month') {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1);
        url = `/api/solat/${selectedZone}?year=${year}&month=${month}`;
      } else if (downloadRange === 'year') {
        const d = new Date();
        const year = d.getFullYear();
        url = `/api/solat/${selectedZone}?year=${year}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch prayer times from server");
      const data = await res.json();
      
      if (!data || !data.prayerTime || !Array.isArray(data.prayerTime) || data.prayerTime.length === 0) {
        throw new Error("No prayer data returned from API");
      }

      await saveOfflinePrayers(selectedZone, data.prayerTime, downloadRange);
      
      updateSettings({
        offlineCachedRange: downloadRange,
        offlineCachedAt: Date.now()
      });
      downloadSuccess = true;
      setTimeout(() => downloadSuccess = false, 3000);
    } catch (err: any) {
      console.error("Offline download failed:", err);
      downloadError = t("saveOfflineFailed" as any) || "Gagal menyimpan luar talian";
    } finally {
      isDownloading = false;
    }
  }

  async function handleClearCache() {
    isClearing = true;
    try {
      await clearAllOfflinePrayers();
      StorageManager.clearAllCachedPrayerData();
      updateSettings({
        offlineCachedRange: undefined,
        offlineCachedAt: undefined
      });
      
      clearSuccess = true;
      setTimeout(() => clearSuccess = false, 3000);
    } catch (err) {
      console.error("Failed to clear offline cache:", err);
    } finally {
      isClearing = false;
    }
  }

  function handleResetToDefaults() {
    StorageManager.removeItem("waktu-solat-settings");
    StorageManager.removeItem("prayer_notifications_v2");
    appSettings.settings = { ...DEFAULT_GENERAL_SETTINGS };
    onResetPreferences();
    showResetToast = true;
    setTimeout(() => {
      showResetToast = false;
    }, 3000);
  }

  $effect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  });

  const PRE_ALERT_OPTIONS = $derived([
    { label: t("none"), value: 0 },
    { label: `5 ${t("minutes")}`, value: 5 },
    { label: `10 ${t("minutes")}`, value: 10 },
    { label: `15 ${t("minutes")}`, value: 15 },
  ]);

  const SOUND_OPTIONS = $derived([
    { label: t("default"), value: "default", icon: Volume2 },
    { label: t("beep"), value: "beep", icon: Activity },
    { label: t("voice"), value: "voice", icon: Mic },
    { label: t("azan1" as any), value: "azan1", icon: Music },
    { label: t("azan2" as any), value: "azan2", icon: Music },
    { label: t("chime" as any), value: "chime", icon: BellRing },
    { label: t("softChime" as any), value: "soft-chime", icon: BellRing },
    { label: t("bellEcho" as any), value: "bell-echo", icon: BellRing },
    { label: t("ambientGong" as any), value: "ambient-gong", icon: Volume2 },
    { label: t("digitalSweep" as any), value: "digital-sweep", icon: Activity },
  ]);

  const PRAYER_KEYS: PrayerKey[] = [
    "imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha",
  ];
  
  const SUNNAH_KEYS = [
    "suhoor", "morningForbidden", "duha", "middayForbidden", "eveningForbidden", "firstThird", "midnight", "tahajjud"
  ] as const;

  const allSettingsCards = $derived([
    { id: "language_time", tab: "general", categoryLabel: settings.language === "ms" ? "UMUM > BAHASA & FORMAT" : "GENERAL > LANGUAGE & TIME", title: t("language") + " & " + t("timeFormat"), keywords: "language bahasa time format masa 12h 24h melayu english" },
    { id: "religion_formatting", tab: "general", categoryLabel: settings.language === "ms" ? "UMUM > MAZHAB & HIJRI" : "GENERAL > MADHAB & HIJRI", title: t("mazhab") + " & " + t("hijriFormat"), keywords: "mazhab madhab hijri shafii hanafi format tarikh both text number" },
    { id: "theme_contrast", tab: "general", categoryLabel: settings.language === "ms" ? "UMUM > DAKOD WARNA" : "GENERAL > ACCESSIBILITY CONTRAST", title: t("contrastLevelLabel" as any) || "Tahap Kontras", keywords: "contrast kontras level tahap accessibility standard sederhana tinggi standard medium high readability legibility" },
    { id: "clock_style", tab: "general", categoryLabel: settings.language === "ms" ? "UMUM > RUPA JAM" : "GENERAL > CLOCK STYLES", title: t("clockStyle" as any) + " & " + t("clockMovement" as any), keywords: "clock style movement sweep tick swiss station digital analog face jam abstract flip word minimal orbit layered station stations" },
    { id: "advanced_general", tab: "general", categoryLabel: settings.language === "ms" ? "UMUM > PAPARAN & KOS" : "GENERAL > VIEW & CACHING", title: settings.language === "ms" ? "Pilihan Lanjutan & Luar Talian" : "Advanced & Offline Options", keywords: "advanced iqamah imsak jumaat offline cache download sync autoSyncOffline syncs" },
    { id: "sound_volume", tab: "notifications", categoryLabel: settings.language === "ms" ? "NOTIFIKASI > VOLUME BUNYI" : "NOTIFICATIONS > SOUND VOLUME", title: t("soundVolume" as any) || "Volume Bunyi", keywords: "sound volume audio level preview announcement pengumuman kekuatan isipadu" },
    { id: "quick_alerts", tab: "notifications", categoryLabel: settings.language === "ms" ? "NOTIFIKASI > AMARAN CEPAT" : "NOTIFICATIONS > QUICK TOGGLES", title: settings.language === "ms" ? "Pilihan Pantas Notifikasi" : "Quick Notification Actions", keywords: "quick action notification enable mute all alerts penggera sekaligus senyapkan aktifkan" },
    { id: "visual_alerts", tab: "notifications", categoryLabel: settings.language === "ms" ? "NOTIFIKASI > GAYA OVERLAY" : "NOTIFICATIONS > VISUAL ALERTS", title: t("visualAlertSection" as any), keywords: "visual alert adhan azan alert style duration seconds preview banner dramatic standard modern subtle minimal none" },
    { id: "prayer_rules", tab: "notifications", categoryLabel: settings.language === "ms" ? "NOTIFIKASI > BUNYI WAKTU SOLAT" : "NOTIFICATIONS > PRAYER ALERTS", title: t("notifications") + " - " + (settings.language === "ms" ? "Tetapan Penggera" : "Alert Rules"), keywords: "switches sound alert pre-alert test imsak fajr syuruk dhuhr asr maghrib isha subuh zohor asar isyak alarm bunyi suara beep chime voice default" },
    { id: "adjustments_offsets", tab: "adjustments", categoryLabel: settings.language === "ms" ? "SELA RANG > PENYELARASAN MINIT" : "OFFSET > MINUTE ADJUSTMENTS", title: t("offset") || "Penyelarasan Minit", keywords: "offset adjustments minutes minute plus minus fajr dhuhr asr maghrib isha subuh zohor asar isyak tambah tolak" },
    { id: "adjustments_iqamah", tab: "adjustments", categoryLabel: settings.language === "ms" ? "SELA RANG > PENYELARASAN IQAMAH" : "OFFSET > IQAMAH DELAYS", title: t("iqamahOffset" as any) || "Penyelarasan Iqamah", keywords: "iqamah offset adjustments delay minutes minute plus minus fajr dhuhr asr maghrib isha subuh zohor asar isyak" },
    { id: "advanced_sunnah", tab: "advanced", categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > PILIHAN WAKTU" : "SUNNAH > OPTIONAL PRAYERS", title: t("showSunnahTimes" as any) || "Show Sunnah Times", keywords: "sunnah optional practices suhoor sahur forbidden duha dhuha midnight tahajjud qiyammulail" },
    { id: "advanced_rules", tab: "advanced", categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > PERATURAN PENGIRAAN" : "SUNNAH > CALCULATION RULES", title: t("advancedCalculationRules" as any), keywords: "calculation rules offsets suhoor imsak midnight method asr ends fajr sunrise sunset maghrib" },
    { id: "advanced_hijri", tab: "advanced", categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > ENJIN HIJRAH" : "SUNNAH > HIJRI CALENDAR ENGINE", title: t("hijriCalendarEngine" as any), keywords: "hijri calendar engine adjustment methods jakim umalqura civil tbla islamic" },
    { id: "advanced_reset", tab: "advanced", categoryLabel: settings.language === "ms" ? "LALU TETAP > SET SEMULA" : "DEFAULTS > FACTORY RESET", title: t("resetDefault" as any), keywords: "reset factory default settings preference asal semula padam konfig" },
    { id: "mosque_tv_mode", tab: "mosque", categoryLabel: settings.language === "ms" ? "MASJID > MOD TV" : "MOSQUE > TV MODE", title: settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode", keywords: "mosque tv mode enabled custom reminders interval hadith display shortcut branding name" },
    { id: "mosque_countdown", tab: "mosque", categoryLabel: settings.language === "ms" ? "MASJID > BUNYI IQAMAH" : "MOSQUE > IQAMAH ALARM", title: t("iqamahCountdownSound" as any), keywords: "mosque iqamah countdown sounds chime tick test quartz tone" },
    { id: "mosque_screensaver", tab: "mosque", categoryLabel: settings.language === "ms" ? "MASJID > SCREENAVER & WAKTU" : "MOSQUE > SOLAT SCREENAVER", title: t("solatScreensaverSection" as any), keywords: "screensaver clock qibla dua duration remembrance solat mode timer countdown fajr dhuhr asr maghrib isha subuh zohor asar isyak" },
    { id: "mosque_background", tab: "mosque", categoryLabel: settings.language === "ms" ? "MASJID > TUGAS LATAR" : "MOSQUE > BACKGROUND PLAYBACK", title: t("backgroundNotifications" as any), keywords: "background notifications minimised minimized screen locked alarm alert sound" }
  ]);

  const matchingCards = $derived(allSettingsCards.filter(card => {
    if (!searchQuery) return card.tab === activeTab;
    const query = searchQuery.toLowerCase().trim();
    return card.title.toLowerCase().includes(query) || 
           card.keywords.includes(query) || 
           card.categoryLabel.toLowerCase().includes(query);
  }));

  const tabs = $derived([
    { id: "general", label: t("general"), icon: SettingsIcon },
    { id: "notifications", label: t("notifications"), icon: Bell },
    { id: "adjustments", label: t("offset"), icon: Clock },
    { id: "advanced", label: t("sunnahAndOptional" as any) || "Lanjutan", icon: Sliders },
    { id: "mosque", label: t("mosqueMode" as any), icon: Tv }
  ]);

  let currentVol = $derived(settings.soundVolume ?? 80);
  let isMuted = $derived(currentVol === 0);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
    }
  };
</script>

{#snippet languageTime()}
  <div class={cn("relative rounded-[32px] p-6 space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
    <div class="space-y-3 relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("language")}
      </span>
      <div class="flex flex-wrap gap-3">
        <FilterChip label={t("malay")} selected={settings.language === "ms"} onclick={() => updateSettings({ language: "ms" })} />
        <FilterChip label={t("english")} selected={settings.language === "en"} onclick={() => updateSettings({ language: "en" })} />
      </div>
    </div>

    <div class="space-y-3 relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("timeFormat")}
      </span>
      <div class="flex flex-wrap gap-3">
        <FilterChip label={t("hour12")} selected={settings.timeFormat === "12h"} onclick={() => updateSettings({ timeFormat: "12h" })} />
        <FilterChip label={t("hour24")} selected={settings.timeFormat === "24h"} onclick={() => updateSettings({ timeFormat: "24h" })} />
      </div>
    </div>
  </div>
{/snippet}

{#snippet religionFormatting()}
  <div class={cn("relative rounded-[32px] p-6 space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
    <div class="space-y-3 relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("mazhab")}
      </span>
      <div class="flex flex-wrap gap-3">
        <FilterChip label={t("mazhabShafii" as any)} selected={settings.mazhab !== "hanafi"} onclick={() => updateSettings({ mazhab: "shafii" })} />
        <FilterChip label={t("mazhabHanafi" as any)} selected={settings.mazhab === "hanafi"} onclick={() => updateSettings({ mazhab: "hanafi" })} />
      </div>
      {#if settings.mazhab === "hanafi"}
        <p class="text-sm text-[var(--md-sys-color-error)] mt-2 italic font-bold">
          {t("hanafiAsarNote" as any)}
        </p>
      {/if}
    </div>

    <div class="space-y-3 relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("hijriFormat")}
      </span>
      <div class="flex flex-wrap gap-3">
        <FilterChip label={t("hijriBoth")} selected={!settings.hijriFormat || settings.hijriFormat === "both"} onclick={() => updateSettings({ hijriFormat: "both" })} />
        <FilterChip label={t("hijriText")} selected={settings.hijriFormat === "text"} onclick={() => updateSettings({ hijriFormat: "text" })} />
        <FilterChip label={t("hijriNumber")} selected={settings.hijriFormat === "number"} onclick={() => updateSettings({ hijriFormat: "number" })} />
      </div>
    </div>
  </div>
{/snippet}

{#snippet themeContrast()}
  <div class={cn("relative rounded-[32px] p-6 space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
    <div class="space-y-1 relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("contrastLevelLabel" as any) || "Tahap Kontras"}
      </span>
      <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
        {settings.language === "ms" ? "Tingkatkan kontras warna teks untuk keterbacaan yang lebih baik." : "Increase text contrast for better legibility."}
      </p>
    </div>
    <div class="flex flex-wrap gap-3 relative z-10">
      {#each [
        { label: t("contrastStandard" as any) || "Standard", value: 0 },
        { label: t("contrastMedium" as any) || "Sederhana", value: 0.5 },
        { label: t("contrastHigh" as any) || "Tinggi", value: 1.0 }
      ] as c}
        <FilterChip label={c.label} selected={(settings.themeContrast ?? 0) === c.value} onclick={() => updateSettings({ themeContrast: c.value })} />
      {/each}
    </div>
  </div>
{/snippet}

{#snippet clockStyle()}
  <div class={cn("relative rounded-[32px] overflow-hidden flex flex-col", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
    <div class="p-6 pb-4 bg-[var(--md-sys-color-surface-container-high)] relative z-10">
      <span class="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
        {t("clockStyle" as any)}
      </span>
    </div>
    <div class="flex flex-wrap gap-2.5 p-6 bg-[var(--md-sys-color-surface-container)] relative z-10">
      {#each ["digital", "analog", "analog-numeric", "analog-roman", "analog-arabic", "anadigi", "chronograph", "flip", "word", "minimal", "orbit", "typographic", "prayer-ring", "dashboard", "abstract", "swiss-station", "bauhaus", "layered"] as style}
        <div class="shrink-0">
          <FilterChip
            label={style === "digital" ? t("clockStyleDigital" as any) : style === "analog" ? t("clockStyleAnalog" as any) : style === "analog-numeric" ? t("clockStyleAnalogNumeric" as any) : style === "analog-roman" ? t("clockStyleAnalogRoman" as any) : style === "analog-arabic" ? t("clockStyleAnalogArabic" as any) : style === "anadigi" ? t("clockStyleAnaDigi" as any) : style === "chronograph" ? t("clockStyleChronograph" as any) : style === "flip" ? t("clockStyleFlip" as any) : style === "word" ? t("clockStyleWord" as any) : style === "minimal" ? t("clockStyleMinimal" as any) : style === "orbit" ? t("clockStyleOrbit" as any) : style === "typographic" ? t("clockStyleTypographic" as any) : style === "prayer-ring" ? t("clockStylePrayerRing" as any) : style === "dashboard" ? t("clockStyleDashboard" as any) : style === "swiss-station" ? t("clockStyleSwissStation" as any) : style === "bauhaus" ? t("clockStyleBauhaus" as any) : style === "layered" ? t("clockStyleLayered" as any) : t("clockStyleAbstract" as any)}
            selected={settings.clockFace === style || (!settings.clockFace && style === "digital")}
            onclick={() => updateSettings({ clockFace: style })}
          />
        </div>
      {/each}
    </div>

    {#if settings.clockFace !== "digital"}
      <div class="p-5 pt-0 border-t border-[var(--md-sys-color-outline)]/5 mt-2 bg-[var(--md-sys-color-surface-container)] relative z-10">
        <span class="md3-label-large font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2 mb-3 mt-4">
          {t("clockMovement" as any)}
        </span>
        <div class="flex flex-wrap gap-2">
          {#each ["sweep", "tick"] as movement}
            <FilterChip
              label={movement === "sweep" ? t("clockMovementSweep" as any) : t("clockMovementTick" as any)}
              selected={settings.clockMovement === movement || (!settings.clockMovement && movement === "sweep")}
              onclick={() => updateSettings({ clockMovement: movement })}
            />
          {/each}
        </div>

        {#if ['analog', 'analog-numeric', 'analog-roman', 'analog-arabic', 'dashboard', 'minimal', 'orbit', 'swiss-station', 'bauhaus', 'layered'].includes(settings.clockFace || '')}
          <div class="flex items-center justify-between mt-6">
            <div>
              <div class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)]">
                {t("showExternalDigitalClock" as any)}
              </div>
              <div class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                {t("showExternalDigitalClockDesc" as any)}
              </div>
            </div>
            <Switch checked={!!settings.showExternalDigitalClock} onchange={(checked) => updateSettings({ showExternalDigitalClock: checked })} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet advancedGeneral()}
  <div class={cn("relative rounded-[32px] overflow-hidden transition-all duration-300 mt-4", showAdvancedGeneral ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10 shadow-sm") : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent"))}>
    <button data-testid="advanced-general-toggle" use:ripple onclick={() => showAdvancedGeneral = !showAdvancedGeneral} type="button" class="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
          <Sliders size={20} class="stroke-[2.5]" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">
            {settings.language === "ms" ? "Pilihan Paparan & Luar Talian Lanjutan" : "Advanced View & Offline Options"}
          </h3>
          <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
            {settings.language === "ms" ? "Format Hijri, tetapan Iqamah, Imsak, Jumaat, dan mod luar talian." : "Hijri formatting, Iqamah, Imsak, Jumu'ah, and offline caching."}
          </p>
        </div>
      </div>
      <div class="text-[var(--md-sys-color-on-surface-variant)] transition-transform" style={showAdvancedGeneral ? "transform: rotate(180deg)" : ""}>
        <ChevronDown size={20} />
      </div>
    </button>

    {#if showAdvancedGeneral}
      <div transition:slide={{ duration: 250 }} class="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
        <div class="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-4">
          <div>
            <span class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">{t("showIqamah" as any)}</span>
            <p class="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">{t("iqamahDesc" as any)}</p>
          </div>
          <Switch checked={!!settings.showIqamah} onchange={(checked) => updateSettings({ showIqamah: checked })} />
        </div>

        <div class="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-2">
          <div>
            <span class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">{t("trackImsak" as any) || "Track Imsak"}</span>
            <p class="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">{t("trackImsakDesc" as any) || "Show Imsak as the next time after Isha"}</p>
          </div>
          <Switch checked={!!settings.trackImsak} onchange={(checked) => updateSettings({ trackImsak: checked })} />
        </div>

        <div class="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-2">
          <div>
            <span class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">{t("showJumaat" as any) || "Show Jumu'ah"}</span>
            <p class="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">{t("showJumaatDesc" as any) || "Replace Dhuhr with Jumu'ah on Fridays"}</p>
          </div>
          <Switch checked={settings.showJumaat !== false} onchange={(checked) => updateSettings({ showJumaat: checked })} />
        </div>

        <hr class="border-[var(--md-sys-color-outline)]/10 my-4" />

        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <WifiOff class="text-[var(--md-sys-color-primary)] w-5 h-5" />
            <h3 class="md3-title-medium font-bold text-[var(--md-sys-color-on-surface)]">{t("offlineMode" as any)}</h3>
          </div>

          <p class="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
            {t("saveOfflineDesc" as any)}
          </p>

          <div class="p-5 rounded-3xl bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--md-sys-color-outline)]/10 pb-4">
              <div>
                <span class="text-xs uppercase font-black tracking-widest text-[var(--md-sys-color-on-surface-variant)]">{t("cachingStatus" as any)}</span>
                <div class="font-bold text-sm sm:text-base mt-0.5 text-[var(--md-sys-color-on-surface)]">
                  {#if settings.offlineCachedRange}
                    <span class="flex items-center gap-1.5 text-[var(--md-sys-color-primary)]">
                      <Check size={16} class="stroke-[3]" />
                      {t("offlineCacheSaved" as any).replace("{zone}", selectedZone).replace("{range}", t(`offline${settings.offlineCachedRange.charAt(0).toUpperCase() + settings.offlineCachedRange.slice(1)}` as any))}
                    </span>
                  {:else}
                    <span class="text-[var(--md-sys-color-outline)]">{t("offlineCacheNotSaved" as any)}</span>
                  {/if}
                </div>
              </div>
              {#if settings.offlineCachedAt}
                <div class="text-right">
                  <span class="text-[10px] sm:text-xs text-[var(--md-sys-color-on-surface-variant)] block">
                    {t("offlineCacheAtLabel" as any).replace("{date}", new Date(settings.offlineCachedAt).toLocaleDateString(settings.language === "ms" ? "ms-MY" : "en-US", { dateStyle: "medium" }))}
                  </span>
                </div>
              {/if}
            </div>

            <div class="space-y-2">
              <span class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block">{t("offlineDuration" as any)}</span>
              <div class="flex flex-wrap gap-2 mt-1">
                {#each ["week", "month", "year"] as range}
                  <FilterChip label={t(`offline${range.charAt(0).toUpperCase() + range.slice(1)}` as any)} selected={downloadRange === range} onclick={() => downloadRange = range as any} />
                {/each}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="tonal"
                disabled={isDownloading}
                onclick={handleSaveOffline}
              >
                {#if isDownloading}
                  <RefreshCw size={16} class="animate-spin mr-2" />
                  {t("syncing" as any)}
                {:else}
                  <Download size={16} class="mr-2" />
                  {t("saveOfflineBtn" as any)}
                {/if}
              </Button>

              {#if settings.offlineCachedRange}
                <Button
                  variant="outlined"
                  disabled={isClearing}
                  onclick={handleClearCache}
                >
                  {#if isClearing}
                    <RefreshCw size={16} class="animate-spin mr-2" />
                    {settings.language === "ms" ? "Membersih..." : "Clearing..."}
                  {:else}
                    <Trash2 size={16} class="mr-2" />
                    {settings.language === "ms" ? "Padam Cache" : "Clear Cache"}
                  {/if}
                </Button>
              {/if}
            </div>

            <div class="min-h-[20px]">
              {#if downloadError}
                <p class="text-xs text-[var(--md-sys-color-error)] font-bold flex items-center gap-1"><AlertCircle size={14} />{downloadError}</p>
              {/if}
              {#if downloadSuccess}
                <p class="text-xs text-[var(--md-sys-color-primary)] font-bold flex items-center gap-1"><Check size={14} class="stroke-[3]" />{t("saveOfflineSuccess" as any)}</p>
              {/if}
              {#if clearSuccess}
                <p class="text-xs text-[var(--md-sys-color-primary)] font-bold flex items-center gap-1"><Check size={14} class="stroke-[3]" />{settings.language === "ms" ? "Cache berjaya dipadam" : "Cache cleared successfully"}</p>
              {/if}
            </div>
          </div>

          <div class="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm">
            <div class="pr-4">
              <span class="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">{t("autoSyncOffline" as any)}</span>
              <p class="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">{t("autoSyncOfflineDesc" as any)}</p>
            </div>
            <Switch checked={!!settings.autoSyncOffline} onchange={(checked) => updateSettings({ autoSyncOffline: checked })} />
          </div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet soundVolume()}
  <div class={cn("relative rounded-[32px] p-6 space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
      <div>
        <span class="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">{t("soundVolume" as any) || "Volume Bunyi"}</span>
        <span class="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">{t("volumeDesc" as any)}</span>
      </div>
      <div class="flex items-center gap-3 flex-1 max-w-[280px] w-full self-end sm:self-auto justify-end">
        <button type="button" use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95 focus:outline-none shrink-0 cursor-pointer" onclick={() => {
          if (currentVol > 0) { prevVolumeRef = currentVol; updateSettings({ soundVolume: 0 }); playSynthesizedSoundLocal('tick', 0); }
          else { const restoredVol = prevVolumeRef > 0 ? prevVolumeRef : 80; updateSettings({ soundVolume: restoredVol }); playSynthesizedSoundLocal('tick', restoredVol / 100); }
        }}>
          {#if isMuted}
            <VolumeX size={20} class="stroke-[2.5] relative z-10" />
          {:else if currentVol > 50}
            <Volume2 size={20} class="stroke-[2.5] relative z-10" />
          {:else}
            <Volume1 size={20} class="stroke-[2.5] relative z-10" />
          {/if}
        </button>
        <Slider min={0} max={100} step={5} value={currentVol} oninput={(newVol) => {
          updateSettings({ soundVolume: newVol });
          if (newVol > 0) prevVolumeRef = newVol;
        }} onchange={(newVol) => {
          updateSettings({ soundVolume: newVol });
          if (newVol > 0) prevVolumeRef = newVol;
          playSynthesizedSoundLocal('tick', newVol / 100);
        }} class="flex-1" />
        <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">{currentVol}%</span>
      </div>
    </div>
  </div>
{/snippet}

{#snippet quickAlerts()}
  <div class={cn("relative p-4 rounded-[2rem] border border-[var(--md-sys-color-outline)]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-high)] overflow-hidden", getStyleClasses(visualStyle))}>
    <div class="relative z-10">
      <span class="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">{settings.language === 'ms' ? "Pilihan Pantas Notifikasi" : "Quick Notification Actions"}</span>
      <span class="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">{settings.language === 'ms' ? "Aktifkan atau senyapkan semua penggera sekaligus." : "Enable or mute all prayer alerts at once."}</span>
    </div>
    <div class="flex gap-2 shrink-0 relative z-10">
      <Button variant="tonal" size="sm" onclick={() => PRAYER_KEYS.forEach(k => onUpdatePreference(k, { enabled: true }))}>{t("enableAllAlerts" as any)}</Button>
      <Button variant="outlined" size="sm" onclick={() => PRAYER_KEYS.forEach(k => onUpdatePreference(k, { enabled: false }))}>{t("muteAllAlerts" as any)}</Button>
    </div>
  </div>
{/snippet}

{#snippet visualAlerts()}
  <div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
    <div class="flex items-center gap-3 relative z-10">
      <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
        <Smartphone size={20} class="stroke-[2.5]" />
      </div>
      <div>
        <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("visualAlertSection" as any)}</h3>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">{settings.language === "ms" ? "Tetapkan gaya overlay pengumuman waktu azan semasa aplikasi dibuka." : "Configure style of adhan time announcements when app is active."}</p>
      </div>
    </div>
    <div class="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
      <div class="space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("azanAlertStyle" as any)}</span>
        <div class="flex flex-wrap gap-2">
          {#each ["dramatic", "standard", "modern", "subtle", "minimal", "none"] as style}
            <FilterChip label={style === "dramatic" ? t("styleDramatic" as any) : style === "standard" ? t("styleStandard" as any) : style === "modern" ? t("styleModern" as any) : style === "subtle" ? t("styleSubtle" as any) : style === "minimal" ? t("styleMinimal" as any) : t("none")} selected={settings.azanAlertStyle === style || (!settings.azanAlertStyle && style === "standard")} onclick={() => updateSettings({ azanAlertStyle: style })} />
          {/each}
        </div>
      </div>
      {#if settings.azanAlertStyle !== "none"}
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-4">
            <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">{t("azanAlertDuration" as any)}</span>
            <div class="flex-1 px-2 sm:px-4">
              <Slider min={5} max={120} step={5} value={settings.azanAlertDuration ?? 20} onchange={(val) => updateSettings({ azanAlertDuration: val })} />
            </div>
            <span class="w-20 text-right font-mono text-lg font-black text-[var(--md-sys-color-primary)]">{settings.azanAlertDuration ?? 20}s</span>
          </div>
          <button use:ripple class="w-full py-3 px-4 mt-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] font-black text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95" onclick={() => onPreviewAzanAlert?.(settings.azanAlertStyle || "standard")}>
            <Volume2 size={16} />
            <span>{settings.language === "ms" ? "Pratonton Gaya Amaran" : "Preview Alert Style"}</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet prayerRules()}
  <div class="space-y-6">
    {#each PRAYER_KEYS as key}
      {@const pref = preferences[key] || { enabled: false, preAlert: 0, sound: "default", offset: 0 }}
      {@const isFardhu = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(key)}
      <div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] transition-all duration-300 shadow-sm overflow-hidden", pref.enabled ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-primary-container)]/10 border border-transparent ring-1 ring-[var(--md-sys-color-primary)]/20") : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-variant)]/30 grayscale-[0.3] border border-transparent"))}>
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 relative z-10">
          <div class="flex items-center gap-4">
            <Switch checked={pref.enabled} onchange={(checked) => onUpdatePreference(key, { enabled: checked })} />
            <div>
              <h4 class={cn("text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 transition-colors duration-300", pref.enabled ? "text-[var(--md-sys-color-on-surface)]" : "text-[var(--md-sys-color-on-surface-variant)]/70")}>
                {t(key as any)}
                {#if !isFardhu}
                  <span class="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-surface-variant)] text-[10px] font-black uppercase tracking-widest opacity-80">{t("filterSunat" as any)}</span>
                {/if}
              </h4>
            </div>
          </div>
          {#if pref.enabled}
            <button use:ripple class="text-xs font-bold px-4 py-2 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform" onclick={() => {
              if (pref.sound === "default" && permission === "granted") {
                new Notification(t("testDefaultNotificationTitle" as any), { body: t("testDefaultNotificationBody" as any) });
              } else {
                triggerTestSound(pref.sound, `${t("testSoundBody" as any)} ${t(key as any)}`, key);
              }
            }}>
              {#if previewingPrayer === key}
                <div class="flex items-end gap-[2px] h-2.5 shrink-0 text-current">
                  <span class="w-[2px] bg-current rounded-full animate-bar-1"></span>
                  <span class="w-[2px] bg-current rounded-full animate-bar-2"></span>
                  <span class="w-[2px] bg-current rounded-full animate-bar-3"></span>
                </div>
              {/if}
              {t("testSound")}
            </button>
          {/if}
        </div>
        <div class={cn("flex flex-col gap-4 mt-2 transition-opacity duration-300 relative z-10", !pref.enabled && "opacity-50 pointer-events-none")}>
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("sound")}</span>
            <div class="flex flex-wrap gap-2">
              {#each SOUND_OPTIONS as opt}
                {@const OptIcon = opt.icon}
                <FilterChip label={opt.label} selected={pref.sound === opt.value} onclick={() => {
                  onUpdatePreference(key, { sound: opt.value as any });
                  triggerTestSound(opt.value as any, `${t("testSoundBody" as any)} ${t(key as any)}`, key);
                }}>
                  {#snippet leadingIcon()}
                    {#if previewingPrayer === key && pref.sound === opt.value}
                      <div class="flex items-end gap-[2.5px] h-3 mr-1 shrink-0 text-[var(--md-sys-color-primary)]">
                        <span class="w-[2px] bg-current rounded-full animate-bar-1"></span>
                        <span class="w-[2px] bg-current rounded-full animate-bar-2"></span>
                        <span class="w-[2px] bg-current rounded-full animate-bar-3"></span>
                      </div>
                    {:else}
                      <OptIcon size={18} />
                    {/if}
                  {/snippet}
                </FilterChip>
              {/each}
            </div>
          </div>
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("preAlert")}</span>
            <div class="flex flex-wrap gap-2">
              {#each PRE_ALERT_OPTIONS as opt}
                <FilterChip label={opt.label} selected={pref.preAlert === opt.value} onclick={() => onUpdatePreference(key, { preAlert: opt.value as any })} />
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet adjustmentsOffsets()}
  <div class="space-y-6">
    <p class={cn("text-sm p-5 rounded-[2rem] font-medium leading-relaxed shadow-inner", getStyleClasses(visualStyle, "text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-variant)]/30 ring-1 ring-[var(--md-sys-color-outline)]/5"))}>{t("offsetDescription" as any)}</p>
    <div class="space-y-4">
      {#each PRAYER_KEYS as key}
        {@const pref = preferences[key] || { offset: 0 }}
        <div class={cn("relative flex items-center justify-between p-4 sm:p-5 rounded-[2rem] transition-shadow overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 hover:shadow-md"))}>
          <span class="font-black text-[var(--md-sys-color-on-surface)] w-24 tracking-wider uppercase text-sm relative z-10">{t(key as any)}</span>
          <div class="flex items-center gap-3 sm:gap-4 relative z-10">
            <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => onUpdatePreference(key, { offset: (pref.offset || 0) - 1 })}>
              <Minus size={20} class="relative z-10" />
            </button>
            <span class="w-10 sm:w-16 flex font-mono text-lg sm:text-2xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
              {pref.offset > 0 ? "+" : ""}{pref.offset || 0}
            </span>
            <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => onUpdatePreference(key, { offset: (pref.offset || 0) + 1 })}>
              <Plus size={20} class="relative z-10" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet adjustmentsIqamah()}
  {#if settings.showIqamah}
    <div class="space-y-6">
      <h3 class="text-xl font-black text-[var(--md-sys-color-primary)] mb-4 px-2">{t("iqamahOffset" as any)}</h3>
      <div class="space-y-4">
        {#each ["fajr", "dhuhr", "asr", "maghrib", "isha"] as key}
          {@const pref = preferences[key as PrayerKey] || { iqamahOffset: 0 }}
          <div class={cn("relative flex items-center justify-between p-4 sm:p-5 rounded-[2rem] transition-shadow overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 hover:shadow-md"))}>
            <span class="font-black text-[var(--md-sys-color-on-surface)] w-24 tracking-wider uppercase text-sm relative z-10">{t(key as any)}</span>
            <div class="flex items-center gap-3 sm:gap-4 relative z-10">
              <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => onUpdatePreference(key as PrayerKey, { iqamahOffset: Math.max(0, (pref.iqamahOffset || 0) - 1) })}>
                <Minus size={20} />
              </button>
              <span class="w-10 sm:w-16 flex font-mono text-lg sm:text-2xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
                {pref.iqamahOffset || 0}
              </span>
              <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => onUpdatePreference(key as PrayerKey, { iqamahOffset: (pref.iqamahOffset || 0) + 1 })}>
                <Plus size={20} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet advancedSunnah()}
  <div class={cn("relative rounded-[32px] p-6 sm:p-8 border border-[var(--md-sys-color-outline)]/5 shadow-sm space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)]"))}>
    <div class="flex items-center gap-3 mb-6 relative z-10">
      <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
        <MoonStar size={20} class="stroke-[2.5]" />
      </div>
      <div>
        <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("showSunnahTimes" as any) || "Waktu Sunat"}</h3>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">Papar waktu-waktu ibadah sunat dan waktu haram solat.</p>
      </div>
    </div>
    <div class="p-4 rounded-3xl border border-[var(--md-sys-color-outline)]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-high)] relative z-10">
      <div>
        <span class="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">{t("quickActionSunnah" as any) || "Tindakan Pantas Sunat"}</span>
        <span class="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">{t("quickActionSunnahDesc" as any) || "Aktifkan atau senyapkan semua penggera amalan sunat sekaligus."}</span>
      </div>
      <div class="flex gap-2 shrink-0">
        <button use:ripple onclick={() => updateSettings({ showSunnahTimes: [...SUNNAH_KEYS] })} class="px-4 py-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-sm hover:opacity-95 cursor-pointer">{t("enableAllSunnah" as any) || "Aktifkan Semua"}</button>
        <button use:ripple onclick={() => updateSettings({ showSunnahTimes: [] })} class="px-4 py-2 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-sm hover:opacity-95 cursor-pointer">{t("muteAllSunnah" as any) || "Senyapkan Semua"}</button>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
      {#each SUNNAH_KEYS as key}
        <div class={cn("flex items-center justify-between p-4 rounded-2xl shadow-sm", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5"))}>
          <div>
            <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">{t(key as any)}</span>
            <span class="text-[10px] text-[var(--md-sys-color-on-surface-variant)] leading-tight block mt-0.5">{t(`${key}Desc` as any)}</span>
          </div>
          <Switch checked={!!settings.showSunnahTimes?.includes(key as any)} onchange={(checked) => {
            const current = settings.showSunnahTimes || [];
            if (checked && !current.includes(key as any)) updateSettings({ showSunnahTimes: [...current, key as any] });
            else if (!checked && current.includes(key as any)) updateSettings({ showSunnahTimes: current.filter(k => k !== key) });
          }} />
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet advancedRules()}
  <div class={cn("relative rounded-[32px] overflow-hidden transition-all duration-300 shadow-sm", showAdvancedCalculations ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10") : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent"))}>
    <button use:ripple onclick={() => showAdvancedCalculations = !showAdvancedCalculations} type="button" class="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
          <Sliders size={20} class="stroke-[2.5]" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("advancedCalculationRules" as any)}</h3>
          <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{settings.language === "ms" ? "Ubahsuai offset Imsak/Sahur, kaedah Tengah Malam & Asar." : "Modify Suhoor/Imsak offsets, Midnight & Asar methods."}</p>
        </div>
      </div>
      <div class="text-[var(--md-sys-color-on-surface-variant)] transition-transform" style={showAdvancedCalculations ? "transform: rotate(180deg)" : ""}>
        <ChevronDown size={20} />
      </div>
    </button>
    {#if showAdvancedCalculations}
      <div transition:slide={{ duration: 250 }} class="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("suhoorOffset" as any)}</span>
          <div class="flex flex-wrap gap-2">
            {#each [15, 30, 45, 60] as mins}
              <FilterChip label={`${mins} min`} selected={settings.suhoorOffset === mins || (!settings.suhoorOffset && mins === 30)} onclick={() => updateSettings({ suhoorOffset: mins })} />
            {/each}
          </div>
        </div>
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("imsakOffset" as any)}</span>
          <div class="flex flex-wrap gap-2">
            {#each [2, 5, 10, 15] as mins}
              <FilterChip label={`${mins} min`} selected={settings.imsakOffset === mins || (!settings.imsakOffset && mins === 10)} onclick={() => updateSettings({ imsakOffset: mins })} />
            {/each}
          </div>
        </div>
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("midnightMethod" as any)}</span>
          <div class="flex flex-wrap gap-2">
            <FilterChip label={t("midnightFajr" as any)} selected={!settings.midnightMethod || settings.midnightMethod === "fajr"} onclick={() => updateSettings({ midnightMethod: "fajr" })} />
            <FilterChip label={t("midnightSunrise" as any)} selected={settings.midnightMethod === "sunrise"} onclick={() => updateSettings({ midnightMethod: "sunrise" })} />
          </div>
        </div>
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("asrEnds" as any)}</span>
          <div class="flex flex-wrap gap-2">
            <FilterChip label={t("asrEndsMaghrib" as any)} selected={!settings.asrEnds || settings.asrEnds === "maghrib"} onclick={() => updateSettings({ asrEnds: "maghrib" })} />
            <FilterChip label={t("asrEndsSunset" as any)} selected={settings.asrEnds === "sunset"} onclick={() => updateSettings({ asrEnds: "sunset" })} />
          </div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet advancedHijri()}
  <div class={cn("relative rounded-[32px] overflow-hidden transition-all duration-300 mt-4", showHijriEngine ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10") : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent"))}>
    <button use:ripple onclick={() => showHijriEngine = !showHijriEngine} type="button" class="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
          <Sliders size={20} class="stroke-[2.5]" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("hijriCalendarEngine" as any)}</h3>
          <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{settings.language === "ms" ? "Tetapkan kaedah kiraan kalendar Hijri & pelarasan hari." : "Configure Hijri calendar calculation methods & day offset."}</p>
        </div>
      </div>
      <div class="text-[var(--md-sys-color-on-surface-variant)] transition-transform" style={showHijriEngine ? "transform: rotate(180deg)" : ""}>
        <ChevronDown size={20} />
      </div>
    </button>
    {#if showHijriEngine}
      <div transition:slide={{ duration: 250 }} class="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("hijriMethod" as any)}</span>
          <div class="flex flex-wrap gap-2">
            {#each ["jakim", "umalqura", "tbla", "civil", "islamic"] as method}
              <FilterChip
                label={t(`method${method.charAt(0).toUpperCase() + method.slice(1)}` as any)}
                selected={(settings.hijriMethod || "jakim") === method}
                onclick={() => updateSettings({ hijriMethod: method })}
              />
            {/each}
          </div>
        </div>
        <div class="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-4">
          <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">{t("hijriAdjustment" as any)}</span>
          <div class="flex items-center gap-3 sm:gap-4">
            <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => updateSettings({ hijriAdjustment: Math.max(-2, (settings.hijriAdjustment ?? 0) - 1) })}>
              <Minus size={20} />
            </button>
            <span class="w-16 flex font-mono text-lg sm:text-xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
              {(settings.hijriAdjustment ?? 0) > 0 ? "+" : ""}{settings.hijriAdjustment ?? 0}
            </span>
            <button use:ripple class="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-105 active:scale-95" onclick={() => updateSettings({ hijriAdjustment: Math.min(2, (settings.hijriAdjustment ?? 0) + 1) })}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet advancedReset()}
  <div class={cn("relative rounded-[32px] p-6 sm:p-8 border border-[var(--md-sys-color-outline)]/5 shadow-sm space-y-4 mt-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)]"))}>
    <div class="flex items-center gap-3 relative z-10">
      <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] flex items-center justify-center">
        <RefreshCw size={20} class="stroke-[2.5]" />
      </div>
      <div>
        <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("resetDefault" as any)}</h3>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">{t("resetToDefaultsDesc" as any)}</p>
      </div>
    </div>
    <div class="pt-2 border-t border-[var(--md-sys-color-outline)]/10 flex flex-wrap items-center gap-4 justify-between relative z-10">
      <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-sm">{settings.language === 'ms' ? "Tindakan ini akan menetapkan semula semua konfigurasi dan penggera solat serta-merta." : "This action will immediately revert all prayer offsets, sounds, and settings."}</p>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <Button variant="outlined" onclick={handleResetToDefaults}>
          <RefreshCw size={16} class="mr-2" />
          {t("resetDefault" as any)}
        </Button>
      </div>
    </div>
    {#if showResetToast}
      <div transition:fly={{ y: 10, duration: 200 }} class="p-3 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm relative z-10">
        <Check size={16} class="stroke-[3]" />
        <span>{t("resetSuccess" as any)}</span>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet mosqueTvMode()}
  <MosqueTvSettings />
{/snippet}

{#snippet mosqueCountdown()}
  <div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
    <div class="flex items-center gap-3 relative z-10">
      <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
        <Activity size={20} class="stroke-[2.5]" />
      </div>
      <div>
        <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("iqamahSoundSection" as any)}</h3>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">Select countdown alert tones and audition sounds.</p>
      </div>
    </div>
    <div class="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
      <div class="space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 block">{t("iqamahCountdownSound" as any)}</span>
        <div class="flex flex-wrap gap-2">
          {#each ["chime", "tick", "none"] as sound}
            <FilterChip
              label={sound === "chime" ? t("chime" as any) : sound === "tick" ? t("clockMovementTick" as any) : t("none")}
              selected={settings.iqamahCountdownSound === sound || (!settings.iqamahCountdownSound && sound === "chime")}
              onclick={() => updateSettings({ iqamahCountdownSound: sound })}
            />
          {/each}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4">
        <button use:ripple class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-3xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] text-xs font-bold shadow-sm border border-[var(--md-sys-color-outline)]/5 transition-all hover:scale-105 active:scale-95" onclick={() => playSynthesizedSoundLocal('chime', (settings.soundVolume ?? 80) / 100, 800)}>
          <Volume2 size={16} />
          {t("testIqamahChime" as any)}
        </button>
        <button use:ripple class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-3xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] text-xs font-bold shadow-sm border border-[var(--md-sys-color-outline)]/5 transition-all hover:scale-105 active:scale-95" onclick={() => playSynthesizedSoundLocal('tick', (settings.soundVolume ?? 80) / 100)}>
          <Volume2 size={16} />
          {t("testIqamahTick" as any)}
        </button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet mosqueScreensaver()}
  <div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
    <div class="flex items-center gap-3 relative z-10">
      <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
        <Clock size={20} class="stroke-[2.5]" />
      </div>
      <div>
        <h3 class="text-lg font-black text-[var(--md-sys-color-on-surface)]">{t("solatScreensaverSection" as any)}</h3>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">Configure private prayer window and remembrance timers.</p>
      </div>
    </div>
    <div class="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
      <div class="flex items-center justify-between p-1">
        <div>
          <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{t("solatModeEnabled" as any)}</h4>
          <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5">{t("solatModeInstruction" as any)}</p>
        </div>
        <Switch checked={!!settings.solatModeEnabled} onchange={(checked) => updateSettings({ solatModeEnabled: checked })} />
      </div>
      {#if settings.solatModeEnabled}
        <div class="space-y-4 pt-4 mt-2 border-t border-[var(--md-sys-color-outline)]/5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-xs">{t("solatModeShowClock" as any)}</span>
              <Switch checked={settings.solatModeShowClock !== false} onchange={(checked) => updateSettings({ solatModeShowClock: checked })} />
            </div>
            <div class="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-xs">{t("solatModeShowQibla" as any)}</span>
              <Switch checked={settings.solatModeShowQibla !== false} onchange={(checked) => updateSettings({ solatModeShowQibla: checked })} />
            </div>
          </div>
          <div class="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-2">
            <div>
              <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">{t("solatModeDuaDuration" as any)}</span>
              <span class="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">Serene dhikr interval before exit.</span>
            </div>
            <div class="flex-1 px-4 max-w-[200px]">
              <Slider min={0} max={10} step={1} value={settings.solatModeDuaDuration ?? 0} onchange={(val) => updateSettings({ solatModeDuaDuration: val })} />
            </div>
            <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums">{settings.solatModeDuaDuration ?? 0}m</span>
          </div>
          <div class="pt-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 mb-2">{t("solatModeDuration" as any)}</h4>
            <div class="space-y-2">
              {#each ["fajr", "dhuhr", "asr", "maghrib", "isha"] as key}
                {@const duration = settings.solatModeDuration?.[key] ?? 10}
                <div class="flex items-center justify-between p-3 bg-[var(--md-sys-color-surface)] rounded-[1.5rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
                  <span class="font-bold text-[var(--md-sys-color-on-surface)] tracking-wider uppercase text-xs w-24 pl-1">{t(key as any)}</span>
                  <div class="flex-1 px-4">
                    <Slider min={1} max={60} step={1} value={duration} onchange={(val) => { const currentDurations = settings.solatModeDuration ?? { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 }; updateSettings({ solatModeDuration: { ...currentDurations, [key]: val } }); }} />
                  </div>
                  <span class="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">{duration}m</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet mosqueBackground()}
  <div class={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
    <div class="flex items-center justify-between relative z-10">
      <div>
        <h3 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{t("backgroundNotifications" as any)}</h3>
        <p class="text-[10px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">Keep prayer sound/alerts active even when tab is minimized or screen is locked.</p>
      </div>
      <Switch checked={!!settings.backgroundNotifications} onchange={(checked) => updateSettings({ backgroundNotifications: checked })} />
    </div>
  </div>
{/snippet}

{#if isOpen}
  <div use:portal in:fade={{ duration: 200 }} out:fade={{ duration: 200 , isExit: true}} class="fixed inset-0 z-[10005] flex items-end sm:items-center justify-center p-0 sm:p-6" style="isolation: isolate">
    <style>
      @keyframes bounce-bar {
        0%, 100% { height: 4px; }
        50% { height: 12px; }
      }
      .animate-bar-1 { animation: bounce-bar 0.6s infinite ease-in-out; }
      .animate-bar-2 { animation: bounce-bar 0.6s infinite ease-in-out 0.15s; }
      .animate-bar-3 { animation: bounce-bar 0.6s infinite ease-in-out 0.3s; }
    </style>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="absolute inset-0 bg-black/80" onclick={onClose}></div>

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div in:fly={{ y: 20, duration: 300 }} out:fly={{ y: 20, duration: 200 , isExit: true}} onclick={(e) => e.stopPropagation()} class={cn("relative w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-2xl border border-[var(--md-sys-color-outline)]/20 shadow-black/50 transition-colors duration-300", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)]"), visualStyle === "glass" && "settings-glass-modal")} style:view-transition-name={isOpen ? 'settings-transition' : 'none'}>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 sm:pt-8 sm:pb-4 border-b border-[var(--md-sys-color-outline)]/10 gap-4 shrink-0 bg-[var(--md-sys-color-surface)]">
        <div>
          <h2 class="md3-headline-small font-bold text-[var(--md-sys-color-on-surface)]">{t("settings")}</h2>
        </div>
        <div class="flex items-center gap-3 flex-1 max-w-sm sm:justify-end sm:ml-auto">
          <div class="relative flex-1 group">
            <input bind:this={searchInputRef} type="text" placeholder={settings.language === "ms" ? "Cari tetapan..." : "Search settings..."} bind:value={searchQuery} class={cn("w-full pl-12 pr-12 h-14 text-sm rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none placeholder-[var(--md-sys-color-on-surface-variant)]/50 search-focus-ring", getStyleClasses(visualStyle))} />
            <Search size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]/60 transition-colors duration-300 group-focus-within:text-[var(--md-sys-color-primary)] group-focus-within:scale-105" />
            {#if searchQuery}
              <button transition:fade={{ duration: 200 }} onclick={() => searchQuery = ""} class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]/60 hover:text-[var(--md-sys-color-on-surface)] flex items-center justify-center w-6 h-6 rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors focus:outline-none z-10 cursor-pointer">
                <X size={16} />
              </button>
            {:else}
              <kbd transition:fade={{ duration: 200 }} class="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-black font-mono rounded bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)]/40 pointer-events-none select-none transition-all duration-300 group-focus-within:opacity-0 group-focus-within:scale-75">/</kbd>
            {/if}
          </div>
          <button use:ripple onclick={onClose} aria-label={t("close") || "Close"} class="relative overflow-hidden w-10 h-10 flex items-center justify-center rounded-full text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] shrink-0 shadow-sm transition-colors hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-error)] cursor-pointer">
            <X size={22} class="stroke-[2.5] relative z-10" />
          </button>
        </div>
      </div>

      <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
        {#if !searchQuery}
          <div style={`width: ${sidebarCollapsed ? 80 : 256}px`} class={cn("hidden md:flex flex-col border-r border-[var(--md-sys-color-outline)]/10 bg-[var(--md-sys-color-surface-container-low)] space-y-2 shrink-0 overflow-y-auto no-scrollbar transition-all duration-300", sidebarCollapsed ? "p-3" : "p-4")}>
            <div class="flex items-center mb-6 px-2">
              <button use:ripple onclick={toggleSidebar} type="button" class={cn("h-9 rounded-full flex items-center bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors hover:scale-102 active:scale-95 focus:outline-none cursor-pointer overflow-hidden shadow-sm", sidebarCollapsed ? "w-9 justify-center mx-auto" : "px-3 justify-between w-full")}>
                {#if !sidebarCollapsed}
                  <span transition:slide={{ axis: 'x' }} class="text-[10px] uppercase font-black tracking-widest whitespace-nowrap overflow-hidden pl-1">{t("settings")}</span>
                {/if}
                <div class="shrink-0">
                  {#if sidebarCollapsed}
                    <ChevronRight size={16} />
                  {:else}
                    <ChevronLeft size={16} />
                  {/if}
                </div>
              </button>
            </div>
            {#each tabs as tab}
              {@const Icon = tab.icon}
              {@const isActive = activeTab === tab.id}
              <button use:ripple data-tab={tab.id} onclick={() => activeTab = tab.id} title={sidebarCollapsed ? tab.label : undefined} class="relative group select-none flex items-center h-12 pl-4 pr-4 rounded-2xl outline-none focus:outline-none cursor-pointer w-full transition-all duration-300 overflow-hidden">
                {#if isActive}
                  <div class="absolute inset-0 bg-[var(--md-sys-color-secondary-container)] border border-[var(--md-sys-color-outline)]/10 shadow-sm z-0 rounded-2xl"></div>
                {:else}
                  <div class="absolute inset-0 bg-[var(--md-sys-color-on-surface)] opacity-0 group-hover:opacity-5 transition-opacity duration-200 z-0 rounded-2xl"></div>
                {/if}
                <div class="w-6 h-6 flex items-center justify-center relative z-10 shrink-0">
                  <Icon class={cn("transition-all duration-300 shrink-0", isActive ? "text-[var(--md-sys-color-on-secondary-container)] scale-110" : "text-[var(--md-sys-color-on-surface-variant)] group-hover:scale-110 group-hover:text-[var(--md-sys-color-primary)]")} size={20} />
                </div>
                {#if !sidebarCollapsed}
                  <span transition:slide={{ axis: 'x' }} class="ml-3 font-bold text-sm text-left relative z-10 whitespace-nowrap overflow-hidden" style="color: {isActive ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)'}">
                    {tab.label}
                  </span>
                {/if}
              </button>
            {/each}
          </div>

          <div class="md:hidden w-full overflow-x-auto no-scrollbar border-b border-[var(--md-sys-color-outline)]/10 shrink-0 bg-[var(--md-sys-color-surface-container-low)] px-4 py-2.5">
            <div class="flex gap-2 min-w-max">
              {#each tabs as tab}
                {@const Icon = tab.icon}
                {@const isActive = activeTab === tab.id}
                <button data-tab={tab.id} onclick={() => activeTab = tab.id} type="button" class={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 outline-none focus:outline-none cursor-pointer select-none", isActive ? "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shadow-sm border border-[var(--md-sys-color-outline)]/10" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]")}>
                  <Icon size={14} class="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class={cn("flex-1 overflow-y-auto px-4 sm:px-8 pb-8 pt-6 space-y-6 custom-scrollbar transition-colors duration-300", visualStyle === "glass" ? "bg-transparent" : "bg-[var(--md-sys-color-surface-container-lowest)]")}>
          {#if searchQuery}
            <div in:fade class="flex flex-col gap-1 mb-2">
              <span class="text-[10px] uppercase font-black tracking-widest text-[var(--md-sys-color-primary)]">{settings.language === "ms" ? "Keputusan Carian" : "Search Results"}</span>
              <h3 class="text-xl font-bold text-[var(--md-sys-color-on-surface)]">{settings.language === "ms" ? `Menjumpai ${matchingCards.length} tetapan padanan` : `Found ${matchingCards.length} matching settings`}</h3>
            </div>
          {/if}

          <div class="space-y-6 max-w-2xl mx-auto">
            {#each matchingCards as card (card.id)}
              <div transition:slide class="settings-interactive-card space-y-2">
                {#if searchQuery}
                  <div class="text-[10px] uppercase font-black tracking-widest text-[var(--md-sys-color-on-surface-variant)]/60 px-1">{card.categoryLabel}</div>
                {/if}
                {#if card.id === "language_time"}
                  {@render languageTime()}
                {:else if card.id === "religion_formatting"}
                  {@render religionFormatting()}
                {:else if card.id === "theme_contrast"}
                  {@render themeContrast()}
                {:else if card.id === "clock_style"}
                  {@render clockStyle()}
                {:else if card.id === "advanced_general"}
                  {@render advancedGeneral()}
                {:else if card.id === "sound_volume"}
                  {@render soundVolume()}
                {:else if card.id === "quick_alerts"}
                  {@render quickAlerts()}
                {:else if card.id === "visual_alerts"}
                  {@render visualAlerts()}
                {:else if card.id === "prayer_rules"}
                  {@render prayerRules()}
                {:else if card.id === "adjustments_offsets"}
                  {@render adjustmentsOffsets()}
                {:else if card.id === "adjustments_iqamah"}
                  {@render adjustmentsIqamah()}
                {:else if card.id === "advanced_sunnah"}
                  {@render advancedSunnah()}
                {:else if card.id === "advanced_rules"}
                  {@render advancedRules()}
                {:else if card.id === "advanced_hijri"}
                  {@render advancedHijri()}
                {:else if card.id === "advanced_reset"}
                  {@render advancedReset()}
                {:else if card.id === "mosque_tv_mode"}
                  {@render mosqueTvMode()}
                {:else if card.id === "mosque_countdown"}
                  {@render mosqueCountdown()}
                {:else if card.id === "mosque_screensaver"}
                  {@render mosqueScreensaver()}
                {:else if card.id === "mosque_background"}
                  {@render mosqueBackground()}
                {/if}
              </div>
            {/each}

            {#if searchQuery && matchingCards.length === 0}
              <div in:fade class="py-12 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
                <div class="w-16 h-16 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-outline)] flex items-center justify-center">
                  <Search size={28} />
                </div>
                <div>
                  <h4 class="font-bold text-[var(--md-sys-color-on-surface)]">{settings.language === "ms" ? "Tiada tetapan dijumpai" : "No settings found"}</h4>
                  <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">{settings.language === "ms" ? "Cuba kata kunci yang berbeza seperti 'azan', 'iqamah', 'jam', atau 'bahasa'." : "Try using different keywords like 'adhan', 'iqamah', 'clock', or 'language'."}</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
