import { motion, AnimatePresence } from "motion/react";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/tabs/tabs.js";
import "@material/web/tabs/primary-tab.js";
import "@material/web/chips/filter-chip.js";
import "@material/web/switch/switch.js";
import "@material/web/slider/slider.js";
import "@material/web/elevation/elevation.js";
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Volume1,
  Mic,
  Activity,
  Settings,
  Clock,
  Smartphone,
  Music,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  WifiOff,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  Trash2,
  Sliders,
  MoonStar,
  Search,
  Tv
} from "lucide-react";
import { cn } from "../lib/utils";
import { modalVariants } from "../lib/motion";
import {
  PrayerKey,
  PrayerPreference,
  NotificationSound,
  PreAlertTime,
  DEFAULT_GENERAL_SETTINGS,
} from "../types";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../AppContext";
import { saveOfflinePrayers, clearAllOfflinePrayers } from "../lib/db";
import { StorageManager } from "../lib/StorageManager";
import { useVisualStyle, getStyleClasses } from "../hooks/useVisualStyle";

function playSynthesizedSoundLocal(type: 'chime' | 'tick', volume = 0.8, pitchHz?: number) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15 * volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else {
      osc.type = 'triangle';
      const freq = pitchHz || 587.33; // D5 default
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.25 * volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    }
  } catch (e) {
    // Ignore context errors
  }
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: Record<PrayerKey, PrayerPreference>;
  onUpdatePreference: (
    key: PrayerKey,
    updates: Partial<PrayerPreference>,
  ) => void;
  onResetPreferences: () => void;
  permission: string;
  onRequestPermission: () => void;
  onTestSound: (sound: NotificationSound, message: string) => void;
  selectedZone: string;
  onPreviewAzanAlert?: (style: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onUpdatePreference,
  onResetPreferences,
  permission,
  onRequestPermission,
  onTestSound,
  selectedZone,
  onPreviewAzanAlert,
}: SettingsModalProps) {
  const { settings, updateSettings, t } = useAppContext();
  const visualStyle = useVisualStyle();
  
  const [activeTab, setActiveTab] = useState<
    "general" | "notifications" | "adjustments" | "advanced" | "mosque"
  >("general");
  const [showAdvancedGeneral, setShowAdvancedGeneral] = useState(false);
  const [showAdvancedCalculations, setShowAdvancedCalculations] = useState(false);
  const [showHijriEngine, setShowHijriEngine] = useState(false);

  const [downloadRange, setDownloadRange] = useState<'week' | 'month' | 'year'>('month');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  
  const [showResetToast, setShowResetToast] = useState(false);
  
  // QoL: Collapsible sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return StorageManager.getItem("settings_sidebar_collapsed") === "true";
  });
  
  // QoL: Instant settings search query
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevVolumeRef = useRef<number>(settings.soundVolume ?? 80);

  const [previewingPrayer, setPreviewingPrayer] = useState<string | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTestSound = (sound: NotificationSound, message: string, prayerKey: string) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    onTestSound(sound, message);
    setPreviewingPrayer(prayerKey);
    const duration = sound === 'beep' ? 2000 :
                     sound === 'chime' ? 3000 :
                     sound === 'soft-chime' ? 2500 :
                     sound === 'bell-echo' ? 3000 :
                     sound === 'ambient-gong' ? 4000 :
                     sound === 'digital-sweep' ? 2000 :
                     (sound === 'azan1' || sound === 'azan2') ? 10000 : 3000;
                     
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewingPrayer(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      StorageManager.setItem("settings_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleSaveOffline = async () => {
    if (!navigator.onLine) {
      setDownloadError(settings.language === "ms" ? "Tiada sambungan internet" : "No internet connection");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

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
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error("Offline download failed:", err);
      setDownloadError(t("saveOfflineFailed" as any) || "Gagal menyimpan luar talian");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllOfflinePrayers();
      StorageManager.clearAllCachedPrayerData();
      updateSettings({
        offlineCachedRange: undefined,
        offlineCachedAt: undefined
      });
      
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to clear offline cache:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleResetToDefaults = () => {
    updateSettings(DEFAULT_GENERAL_SETTINGS);
    onResetPreferences();
    setShowResetToast(true);
    setTimeout(() => {
      setShowResetToast(false);
    }, 3000);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const PRE_ALERT_OPTIONS: { label: string; value: PreAlertTime }[] = [
    { label: t("none"), value: 0 },
    { label: `5 ${t("minutes")}`, value: 5 },
    { label: `10 ${t("minutes")}`, value: 10 },
    { label: `15 ${t("minutes")}`, value: 15 },
  ];

  const SOUND_OPTIONS: {
    label: string;
    value: NotificationSound;
    icon: any;
  }[] = [
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
  ];

  const PRAYER_KEYS: PrayerKey[] = [
    "imsak",
    "fajr",
    "syuruk",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
  ];
  
  const SUNNAH_KEYS = [
    "suhoor",
    "morningForbidden",
    "duha",
    "middayForbidden",
    "eveningForbidden",
    "firstThird",
    "midnight",
    "tahajjud"
  ] as const;

  // Structured settings list mapping for global searching and rendering
  const allSettingsCards = [
    {
      id: "language_time",
      tab: "general",
      categoryLabel: settings.language === "ms" ? "UMUM > BAHASA & FORMAT" : "GENERAL > LANGUAGE & TIME",
      title: t("language") + " & " + t("timeFormat"),
      keywords: "language bahasa time format masa 12h 24h melayu english",
      render: () => (
        <div className={cn("relative rounded-[32px] p-6 space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="space-y-3 relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("language")}
            </label>
            <div className="flex flex-wrap gap-3">
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("malay" as any)}
                selected={settings.language === "ms"}
                onClick={() => updateSettings({ language: "ms" })}
              ></md-filter-chip>
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("english" as any)}
                selected={settings.language === "en"}
                onClick={() => updateSettings({ language: "en" })}
              ></md-filter-chip>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("timeFormat")}
            </label>
            <div className="flex flex-wrap gap-3">
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("hour12" as any)}
                selected={settings.timeFormat === "12h"}
                onClick={() => updateSettings({ timeFormat: "12h" })}
              ></md-filter-chip>
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("hour24" as any)}
                selected={settings.timeFormat === "24h"}
                onClick={() => updateSettings({ timeFormat: "24h" })}
              ></md-filter-chip>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "religion_formatting",
      tab: "general",
      categoryLabel: settings.language === "ms" ? "UMUM > MAZHAB & HIJRI" : "GENERAL > MADHAB & HIJRI",
      title: t("mazhab") + " & " + t("hijriFormat"),
      keywords: "mazhab madhab hijri shafii hanafi format tarikh both text number",
      render: () => (
        <div className={cn("relative rounded-[32px] p-6 space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="space-y-3 relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("mazhab")}
            </label>
            <div className="flex flex-wrap gap-3">
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("mazhabShafii" as any)}
                selected={settings.mazhab !== "hanafi"}
                onClick={() => updateSettings({ mazhab: "shafii" })}
              ></md-filter-chip>
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("mazhabHanafi" as any)}
                selected={settings.mazhab === "hanafi"}
                onClick={() => updateSettings({ mazhab: "hanafi" })}
              ></md-filter-chip>
            </div>
            {settings.mazhab === "hanafi" && (
              <p className="text-sm text-[var(--md-sys-color-error)] mt-2 italic font-bold">
                {t("hanafiAsarNote" as any)}
              </p>
            )}
          </div>

          <div className="space-y-3 relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("hijriFormat")}
            </label>
            <div className="flex flex-wrap gap-3">
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("hijriBoth")}
                selected={!settings.hijriFormat || settings.hijriFormat === "both"}
                onClick={() => updateSettings({ hijriFormat: "both" })}
              ></md-filter-chip>
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("hijriText")}
                selected={settings.hijriFormat === "text"}
                onClick={() => updateSettings({ hijriFormat: "text" })}
              ></md-filter-chip>
              {/* @ts-ignore */}
              <md-filter-chip
                label={t("hijriNumber")}
                selected={settings.hijriFormat === "number"}
                onClick={() => updateSettings({ hijriFormat: "number" })}
              ></md-filter-chip>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "theme_contrast",
      tab: "general",
      categoryLabel: settings.language === "ms" ? "UMUM > DAKOD WARNA" : "GENERAL > ACCESSIBILITY CONTRAST",
      title: t("contrastLevelLabel" as any) || "Tahap Kontras",
      keywords: "contrast kontras level tahap accessibility standard sederhana tinggi standard medium high readability legibility",
      render: () => (
        <div className={cn("relative rounded-[32px] p-6 space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="space-y-1 relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("contrastLevelLabel" as any) || "Tahap Kontras"}
            </label>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
              {settings.language === "ms" ? "Tingkatkan kontras warna teks untuk keterbacaan yang lebih baik." : "Increase text contrast for better legibility."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 relative z-10">
            {[
              { label: t("contrastStandard" as any) || "Standard", value: 0 },
              { label: t("contrastMedium" as any) || "Sederhana", value: 0.5 },
              { label: t("contrastHigh" as any) || "Tinggi", value: 1.0 }
            ].map((c) => (
              /* @ts-ignore */
              <md-filter-chip
                key={c.value}
                label={c.label}
                selected={(settings.themeContrast ?? 0) === c.value}
                onClick={() => updateSettings({ themeContrast: c.value })}
              ></md-filter-chip>
            ))}
          </div>
        </div>
      )
    },
    {
      id: "clock_style",
      tab: "general",
      categoryLabel: settings.language === "ms" ? "UMUM > RUPA JAM" : "GENERAL > CLOCK STYLES",
      title: t("clockStyle" as any) + " & " + t("clockMovement" as any),
      keywords: "clock style movement sweep tick swiss station digital analog face jam abstract flip word minimal orbit layered station stations स्टेशन stesen",
      render: () => (
        <div className={cn("relative rounded-[32px] overflow-hidden flex flex-col", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="p-6 pb-4 bg-[var(--md-sys-color-surface-container-high)] relative z-10">
            <label className="md3-title-medium font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2">
              {t("clockStyle" as any)}
            </label>
          </div>
          <div className="flex flex-wrap gap-2.5 p-6 bg-[var(--md-sys-color-surface-container)] relative z-10">
            {(["digital", "analog", "analog-numeric", "analog-roman", "analog-arabic", "anadigi", "chronograph", "flip", "word", "minimal", "orbit", "typographic", "prayer-ring", "dashboard", "abstract", "swiss-station", "bauhaus", "layered"] as const).map((style) => (
              <div key={style} className="shrink-0">
                {/* @ts-ignore */}
                <md-filter-chip
                  label={
                    style === "digital"
                      ? t("clockStyleDigital" as any)
                      : style === "analog"
                        ? t("clockStyleAnalog" as any)
                        : style === "analog-numeric"
                          ? t("clockStyleAnalogNumeric" as any)
                          : style === "analog-roman"
                            ? t("clockStyleAnalogRoman" as any)
                            : style === "analog-arabic"
                              ? t("clockStyleAnalogArabic" as any)
                              : style === "anadigi"
                                ? t("clockStyleAnaDigi" as any)
                                : style === "chronograph"
                                  ? t("clockStyleChronograph" as any)
                                  : style === "flip"
                                    ? t("clockStyleFlip" as any)
                                    : style === "word"
                                      ? t("clockStyleWord" as any)
                                      : style === "minimal"
                                        ? t("clockStyleMinimal" as any)
                                        : style === "orbit"
                                          ? t("clockStyleOrbit" as any)
                                          : style === "typographic"
                                            ? t("clockStyleTypographic" as any)
                                            : style === "prayer-ring"
                                              ? t("clockStylePrayerRing" as any)
                                              : style === "dashboard"
                                                ? t("clockStyleDashboard" as any)
                                                : style === "swiss-station"
                                                  ? t("clockStyleSwissStation" as any)
                                                  : style === "bauhaus"
                                                    ? t("clockStyleBauhaus" as any)
                                                    : style === "layered"
                                                      ? t("clockStyleLayered" as any)
                                                      : t("clockStyleAbstract" as any)
                  }
                  selected={settings.clockFace === style || (!settings.clockFace && style === "digital")}
                  onClick={() => updateSettings({ clockFace: style })}
                ></md-filter-chip>
              </div>
            ))}
          </div>

          {settings.clockFace !== "digital" && (
            <div className="p-5 pt-0 border-t border-[var(--md-sys-color-outline)]/5 mt-2 bg-[var(--md-sys-color-surface-container)] relative z-10">
              <label className="md3-label-large font-bold text-[var(--md-sys-color-primary)] flex items-center gap-2 mb-3 mt-4">
                {t("clockMovement" as any)}
              </label>
              <div className="flex flex-wrap gap-2">
                {(["sweep", "tick"] as const).map((movement) => (
                  /* @ts-ignore */
                  <md-filter-chip
                    key={movement}
                    label={
                      movement === "sweep"
                        ? t("clockMovementSweep" as any)
                        : t("clockMovementTick" as any)
                    }
                    selected={settings.clockMovement === movement || (!settings.clockMovement && movement === "sweep")}
                    onClick={() => updateSettings({ clockMovement: movement })}
                  ></md-filter-chip>
                ))}
              </div>

              {['analog', 'analog-numeric', 'analog-roman', 'analog-arabic', 'dashboard', 'minimal', 'orbit', 'swiss-station', 'bauhaus', 'layered'].includes(settings.clockFace || '') && (
                <div className="flex items-center justify-between mt-6">
                  <div>
                    <div className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)]">
                      {t("showExternalDigitalClock" as any)}
                    </div>
                    <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                      {t("showExternalDigitalClockDesc" as any)}
                    </div>
                  </div>
                  {/* @ts-ignore */}
                  <md-switch
                    selected={settings.showExternalDigitalClock}
                    onClick={() => updateSettings({ showExternalDigitalClock: !settings.showExternalDigitalClock })}
                  ></md-switch>
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: "advanced_general",
      tab: "general",
      categoryLabel: settings.language === "ms" ? "UMUM > PAPARAN & KOS" : "GENERAL > VIEW & CACHING",
      title: (settings.language === "ms" ? "Pilihan Lanjutan & Luar Talian" : "Advanced & Offline Options"),
      keywords: "advanced iqamah imsak jumaat offline cache download sync autoSyncOffline syncs",
      render: () => (
        <div className={cn(
          "relative rounded-[32px] overflow-hidden transition-all duration-300 mt-4",
          showAdvancedGeneral
            ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10 shadow-sm")
            : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent")
        )}>
          <md-elevation></md-elevation>
          <button
            onClick={() => setShowAdvancedGeneral(!showAdvancedGeneral)}
            type="button"
            className="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10"
          >
            {/* @ts-ignore */}
            <md-ripple></md-ripple>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                <Sliders size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">
                  {settings.language === "ms" ? "Pilihan Paparan & Luar Talian Lanjutan" : "Advanced View & Offline Options"}
                </h3>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                  {settings.language === "ms" 
                    ? "Format Hijri, tetapan Iqamah, Imsak, Jumaat, dan mod luar talian." 
                    : "Hijri formatting, Iqamah, Imsak, Jumu'ah, and offline caching."}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showAdvancedGeneral ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--md-sys-color-on-surface-variant)]"
            >
              <ChevronDown size={20} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showAdvancedGeneral && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10"
              >
                <div className="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-4">
                  <div>
                    <label className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">
                      {t("showIqamah" as any)}
                    </label>
                    <p className="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">
                      {t("iqamahDesc" as any)}
                    </p>
                  </div>
                  {/* @ts-ignore */}
                  <md-switch
                    selected={!!settings.showIqamah}
                    onChange={(e: any) =>
                      updateSettings({ showIqamah: e.target.selected })
                    }
                    icons
                  ></md-switch>
                </div>

                <div className="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-2">
                  <div>
                    <label className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">
                      {t("trackImsak" as any) || "Track Imsak"}
                    </label>
                    <p className="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">
                      {t("trackImsakDesc" as any) || "Show Imsak as the next time after Isha"}
                    </p>
                  </div>
                  {/* @ts-ignore */}
                  <md-switch
                    selected={!!settings.trackImsak}
                    onChange={(e: any) =>
                      updateSettings({ trackImsak: e.target.selected })
                    }
                    icons
                  ></md-switch>
                </div>

                <div className="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm mt-2">
                  <div>
                    <label className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">
                      {t("showJumaat" as any) || "Show Jumu'ah"}
                    </label>
                    <p className="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">
                      {t("showJumaatDesc" as any) || "Replace Dhuhr with Jumu'ah on Fridays"}
                    </p>
                  </div>
                  {/* @ts-ignore */}
                  <md-switch
                    selected={settings.showJumaat !== false}
                    onChange={(e: any) =>
                      updateSettings({ showJumaat: e.target.selected })
                    }
                    icons
                  ></md-switch>
                </div>

                <hr className="border-[var(--md-sys-color-outline)]/10 my-4" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <WifiOff className="text-[var(--md-sys-color-primary)] w-5 h-5" />
                    <h3 className="md3-title-medium font-bold text-[var(--md-sys-color-on-surface)]">
                      {t("offlineMode" as any)}
                    </h3>
                  </div>

                  <p className="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                    {t("saveOfflineDesc" as any)}
                  </p>

                  <div className="p-5 rounded-3xl bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--md-sys-color-outline)]/10 pb-4">
                      <div>
                        <span className="text-xs uppercase font-black tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                          {t("cachingStatus" as any)}
                        </span>
                        <div className="font-bold text-sm sm:text-base mt-0.5 text-[var(--md-sys-color-on-surface)]">
                          {settings.offlineCachedRange ? (
                            <span className="flex items-center gap-1.5 text-[var(--md-sys-color-primary)]">
                              <Check size={16} className="stroke-[3]" />
                              {t("offlineCacheSaved" as any)
                                .replace("{zone}", selectedZone)
                                .replace("{range}", t(`offline${settings.offlineCachedRange.charAt(0).toUpperCase() + settings.offlineCachedRange.slice(1)}` as any))}
                            </span>
                          ) : (
                            <span className="text-[var(--md-sys-color-outline)]">
                              {t("offlineCacheNotSaved" as any)}
                            </span>
                          )}
                        </div>
                      </div>

                      {settings.offlineCachedAt && (
                        <div className="text-right">
                          <span className="text-[10px] sm:text-xs text-[var(--md-sys-color-on-surface-variant)] block">
                            {t("offlineCacheAtLabel" as any).replace(
                              "{date}",
                              new Date(settings.offlineCachedAt).toLocaleDateString(
                                settings.language === "ms" ? "ms-MY" : "en-US",
                                { dateStyle: "medium" }
                              )
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block">
                        {t("offlineDuration" as any)}
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(["week", "month", "year"] as const).map((range) => (
                          /* @ts-ignore */
                          <md-filter-chip
                            key={range}
                            label={t(`offline${range.charAt(0).toUpperCase() + range.slice(1)}` as any)}
                            selected={downloadRange === range}
                            onClick={() => setDownloadRange(range)}
                          ></md-filter-chip>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isDownloading}
                        onClick={handleSaveOffline}
                        type="button"
                        className={cn(
                          "flex-1 sm:flex-none px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]",
                          isDownloading
                            ? "bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-outline)] cursor-not-allowed"
                            : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:opacity-95"
                        )}
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            {t("syncing" as any)}
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            {t("saveOfflineBtn" as any)}
                          </>
                        )}
                      </motion.button>

                      {settings.offlineCachedRange && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isClearing}
                          onClick={handleClearCache}
                          type="button"
                          className={cn(
                            "flex-1 sm:flex-none px-5 py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-error)]",
                            isClearing
                              ? "bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-outline)] cursor-not-allowed"
                              : "bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] shadow-sm hover:opacity-90"
                          )}
                        >
                          {isClearing ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              {settings.language === "ms" ? "Membersih..." : "Clearing..."}
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              {settings.language === "ms" ? "Padam Cache" : "Clear Cache"}
                            </>
                          )}
                        </motion.button>
                      )}
                    </div>

                    <div className="min-h-[20px]">
                      {downloadError && (
                        <span className="text-xs text-[var(--md-sys-color-error)] font-bold flex items-center gap-1">
                          <AlertCircle size={14} />
                          {downloadError}
                        </span>
                      )}
                      {downloadSuccess && (
                        <span className="text-xs text-[var(--md-sys-color-primary)] font-bold flex items-center gap-1">
                          <Check size={14} className="stroke-[3]" />
                          {t("saveOfflineSuccess" as any)}
                        </span>
                      )}
                      {clearSuccess && (
                        <span className="text-xs text-[var(--md-sys-color-primary)] font-bold flex items-center gap-1">
                          <Check size={14} className="stroke-[3]" />
                          {settings.language === "ms" ? "Cache berjaya dipadam" : "Cache cleared successfully"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-3xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5 shadow-sm">
                    <div className="pr-4">
                      <label className="md3-label-large font-bold text-[var(--md-sys-color-on-surface)] block mb-0.5">
                        {t("autoSyncOffline" as any)}
                      </label>
                      <p className="md3-body-small text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[200px] sm:max-w-xs">
                        {t("autoSyncOfflineDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={!!settings.autoSyncOffline}
                      onChange={(e: any) =>
                        updateSettings({ autoSyncOffline: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    },
      {
        id: "sound_volume",
        tab: "notifications",
        categoryLabel: settings.language === "ms" ? "NOTIFIKASI > VOLUME BUNYI" : "NOTIFICATIONS > SOUND VOLUME",
        title: t("soundVolume" as any) || "Volume Bunyi",
        keywords: "sound volume audio level preview announcement pengumuman kekuatan isipadu",
        render: () => {
          const currentVol = settings.soundVolume ?? 80;
          const isMuted = currentVol === 0;
          const VolumeIcon = isMuted ? VolumeX : currentVol > 50 ? Volume2 : Volume1;

          return (
            <div className={cn("relative rounded-[32px] p-6 space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/5 shadow-sm"))}>
              <md-elevation></md-elevation>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div>
                  <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">
                    {t("soundVolume" as any) || "Volume Bunyi"}
                  </span>
                  <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                    {t("volumeDesc" as any)}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-1 max-w-[280px] w-full self-end sm:self-auto justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      if (currentVol > 0) {
                        prevVolumeRef.current = currentVol;
                        updateSettings({ soundVolume: 0 });
                        playSynthesizedSoundLocal('tick', 0);
                      } else {
                        const restoredVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : 80;
                        updateSettings({ soundVolume: restoredVol });
                        playSynthesizedSoundLocal('tick', restoredVol / 100);
                      }
                    }}
                    className="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors focus:outline-none shrink-0 cursor-pointer"
                  >
                    {/* @ts-ignore */}
                    <md-ripple></md-ripple>
                    <VolumeIcon size={20} className="stroke-[2.5] relative z-10" />
                  </motion.button>
                  {/* @ts-ignore */}
                  <md-slider
                    min="0"
                    max="100"
                    step="5"
                    value={currentVol}
                    labeled
                    onChange={(e: any) => {
                      const newVol = e.target.value;
                      updateSettings({ soundVolume: newVol });
                      if (newVol > 0) {
                        prevVolumeRef.current = newVol;
                      }
                      playSynthesizedSoundLocal('tick', newVol / 100);
                    }}
                    className="flex-1"
                  ></md-slider>
                  <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                    {currentVol}%
                  </span>
                </div>
              </div>
            </div>
          );
        }
      },
      {
        id: "quick_alerts",
        tab: "notifications",
        categoryLabel: settings.language === "ms" ? "NOTIFIKASI > AMARAN CEPAT" : "NOTIFICATIONS > QUICK TOGGLES",
        title: settings.language === "ms" ? "Pilihan Pantas Notifikasi" : "Quick Notification Actions",
        keywords: "quick action notification enable mute all alerts penggera sekaligus senyapkan aktifkan",
        render: () => (
          <div className={cn("relative p-4 rounded-[2rem] border border-[var(--md-sys-color-outline)]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-high)] overflow-hidden", getStyleClasses(visualStyle))}>
            <md-elevation></md-elevation>
            <div className="relative z-10">
              <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">
                {settings.language === 'ms' ? "Pilihan Pantas Notifikasi" : "Quick Notification Actions"}
              </span>
              <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                {settings.language === 'ms' ? "Aktifkan atau senyapkan semua penggera sekaligus." : "Enable or mute all prayer alerts at once."}
              </span>
            </div>
            <div className="flex gap-2 shrink-0 relative z-10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  PRAYER_KEYS.forEach(key => {
                    onUpdatePreference(key, { enabled: true });
                  });
                }}
                className="px-4 py-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full text-xs font-black transition-all shadow-sm hover:opacity-95"
              >
                {t("enableAllAlerts" as any)}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  PRAYER_KEYS.forEach(key => {
                    onUpdatePreference(key, { enabled: false });
                  });
                }}
                className="px-4 py-2 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-full text-xs font-black transition-all shadow-sm hover:opacity-95"
              >
                {t("muteAllAlerts" as any)}
              </motion.button>
            </div>
          </div>
        )
      },
      {
        id: "visual_alerts",
        tab: "notifications",
        categoryLabel: settings.language === "ms" ? "NOTIFIKASI > GAYA OVERLAY" : "NOTIFICATIONS > VISUAL ALERTS",
        title: t("visualAlertSection" as any),
        keywords: "visual alert adhan azan alert style duration seconds preview banner dramatic standard modern subtle minimal none",
        render: () => (
          <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
            <md-elevation></md-elevation>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                <Smartphone size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                  {t("visualAlertSection" as any)}
                </h3>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                  {settings.language === "ms" 
                    ? "Tetapkan gaya overlay pengumuman waktu azan semasa aplikasi dibuka." 
                    : "Configure style of adhan time announcements when app is active."}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                  {t("azanAlertStyle" as any)}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["dramatic", "standard", "modern", "subtle", "minimal", "none"] as const).map((style) => (
                    /* @ts-ignore */
                    <md-filter-chip
                      key={style}
                      label={
                        style === "dramatic"
                          ? t("styleDramatic" as any)
                          : style === "standard"
                            ? t("styleStandard" as any)
                            : style === "modern"
                              ? t("styleModern" as any)
                              : style === "subtle"
                                ? t("styleSubtle" as any)
                                : style === "minimal"
                                  ? t("styleMinimal" as any)
                                  : t("none")
                      }
                      selected={settings.azanAlertStyle === style || (!settings.azanAlertStyle && style === "standard")}
                      onClick={() => updateSettings({ azanAlertStyle: style })}
                    ></md-filter-chip>
                  ))}
                </div>
              </div>

              {settings.azanAlertStyle !== "none" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-4">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                      {t("azanAlertDuration" as any)}
                    </span>
                    <div className="flex-1 px-2 sm:px-4">
                      {/* @ts-ignore */}
                      <md-slider
                        min="5"
                        max="120"
                        step="5"
                        value={settings.azanAlertDuration ?? 20}
                        labeled
                        ticks
                        onChange={(e: any) => updateSettings({ azanAlertDuration: e.target.value })}
                      ></md-slider>
                    </div>
                    <span className="w-20 text-right font-mono text-lg font-black text-[var(--md-sys-color-primary)]">
                      {settings.azanAlertDuration ?? 20}s
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -0.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onPreviewAzanAlert?.(settings.azanAlertStyle || "standard");
                    }}
                    className="w-full py-3 px-4 mt-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] font-black text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
                  >
                    <Volume2 size={16} />
                    <span>{settings.language === "ms" ? "Pratonton Gaya Amaran" : "Preview Alert Style"}</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )
      },
    {
      id: "prayer_rules",
      tab: "notifications",
      categoryLabel: settings.language === "ms" ? "NOTIFIKASI > BUNYI WAKTU SOLAT" : "NOTIFICATIONS > PRAYER ALERTS",
      title: t("notifications") + " - " + (settings.language === "ms" ? "Tetapan Penggera" : "Alert Rules"),
      keywords: "switches sound alert pre-alert test imsak fajr syuruk dhuhr asr maghrib isha subuh zohor asar isyak alarm bunyi suara beep chime voice default",
      render: () => (
        <div className="space-y-6">
          {PRAYER_KEYS.map((key) => {
            const pref = preferences[key] || {
              enabled: false,
              preAlert: 0,
              sound: "default",
              offset: 0,
            };
            const isFardhu = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(key);

            return (
              <div
                key={key}
                className={cn(
                  "relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] transition-all duration-300 shadow-sm overflow-hidden",
                  pref.enabled
                    ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-primary-container)]/10 border border-transparent ring-1 ring-[var(--md-sys-color-primary)]/20")
                    : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-variant)]/30 grayscale-[0.3] border border-transparent"),
                )}
              >
                <md-elevation></md-elevation>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    {/* @ts-ignore */}
                    <md-switch
                      selected={pref.enabled}
                      icons
                      onChange={(e: any) =>
                        onUpdatePreference(key, {
                          enabled: e.target.selected,
                        })
                      }
                    ></md-switch>
                    <div>
                      <h4
                        className={cn(
                          "text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 transition-colors duration-300",
                          pref.enabled
                            ? "text-[var(--md-sys-color-on-surface)]"
                            : "text-[var(--md-sys-color-on-surface-variant)]/70",
                        )}
                      >
                        {t(key as any)}
                        {!isFardhu && (
                          <span className="px-2 py-0.5 rounded-md bg-[var(--md-sys-color-surface-variant)] text-[10px] font-black uppercase tracking-widest opacity-80">
                            {t("filterSunat" as any)}
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  {pref.enabled && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (
                          pref.sound === "default" &&
                          permission === "granted"
                        ) {
                          new Notification(
                            t("testDefaultNotificationTitle" as any),
                            {
                              body: t(
                                "testDefaultNotificationBody" as any,
                              ),
                            },
                          );
                        } else {
                          triggerTestSound(
                            pref.sound,
                            `${t("testSoundBody" as any)} ${t(key as any)}`,
                            key
                          );
                        }
                      }}
                      className="text-xs font-bold px-4 py-2 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto flex items-center gap-1.5 cursor-pointer"
                    >
                      {previewingPrayer === key && (
                        <div className="flex items-end gap-[2px] h-2.5 shrink-0 text-current">
                          <span className="w-[2px] bg-current rounded-full animate-bar-1"></span>
                          <span className="w-[2px] bg-current rounded-full animate-bar-2"></span>
                          <span className="w-[2px] bg-current rounded-full animate-bar-3"></span>
                        </div>
                      )}
                      {t("testSound")}
                    </motion.button>
                  )}
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-4 mt-2 transition-opacity duration-300 relative z-10",
                    !pref.enabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                      {t("sound")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SOUND_OPTIONS.map((opt) => (
                        /* @ts-ignore */
                        <md-filter-chip
                          key={opt.value}
                          label={opt.label}
                          selected={pref.sound === opt.value}
                          onClick={() => {
                            onUpdatePreference(key, {
                              sound: opt.value,
                            });
                            triggerTestSound(
                              opt.value,
                              `${t("testSoundBody" as any)} ${t(key as any)}`,
                              key
                            );
                          }}
                        >
                          {previewingPrayer === key && pref.sound === opt.value ? (
                            <div slot="icon" className="flex items-end gap-[2.5px] h-3 mr-1 shrink-0 text-[var(--md-sys-color-primary)]">
                              <span className="w-[2px] bg-current rounded-full animate-bar-1"></span>
                              <span className="w-[2px] bg-current rounded-full animate-bar-2"></span>
                              <span className="w-[2px] bg-current rounded-full animate-bar-3"></span>
                            </div>
                          ) : (
                            <opt.icon slot="icon" size={18} />
                          )}
                        </md-filter-chip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                      {t("preAlert")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRE_ALERT_OPTIONS.map((opt) => (
                        /* @ts-ignore */
                        <md-filter-chip
                          key={opt.value}
                          label={opt.label}
                          selected={pref.preAlert === opt.value}
                          onClick={() =>
                            onUpdatePreference(key, {
                              preAlert: opt.value,
                            })
                          }
                        ></md-filter-chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      id: "adjustments_offsets",
      tab: "adjustments",
      categoryLabel: settings.language === "ms" ? "SELA RANG > PENYELARASAN MINIT" : "OFFSET > MINUTE ADJUSTMENTS",
      title: t("offset") || "Penyelarasan Minit",
      keywords: "offset adjustments minutes minute plus minus fajr dhuhr asr maghrib isha subuh zohor asar isyak tambah tolak",
      render: () => (
        <div className="space-y-6">
          <p className={cn("text-sm p-5 rounded-[2rem] font-medium leading-relaxed shadow-inner", getStyleClasses(visualStyle, "text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-variant)]/30 ring-1 ring-[var(--md-sys-color-outline)]/5"))}>
            {t("offsetDescription" as any)}
          </p>
          <div className="space-y-4">
            {PRAYER_KEYS.map((key) => {
              const pref = preferences[key] || { offset: 0 };
              return (
                <div
                  key={key}
                  className={cn("relative flex items-center justify-between p-4 sm:p-5 rounded-[2rem] transition-shadow overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 hover:shadow-md"))}
                >
                  <md-elevation></md-elevation>
                  <span className="font-black text-[var(--md-sys-color-on-surface)] w-24 tracking-wider uppercase text-sm relative z-10">
                    {t(key as any)}
                  </span>
                  <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        onUpdatePreference(key, {
                          offset: (pref.offset || 0) - 1,
                        })
                      }
                      className="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors"
                    >
                      {/* @ts-ignore */}
                      <md-ripple></md-ripple>
                      <Minus size={20} className="relative z-10" />
                    </motion.button>
                    <span className="w-10 sm:w-16 flex font-mono text-lg sm:text-2xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
                      {pref.offset > 0 ? "+" : ""}
                      {pref.offset || 0}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        onUpdatePreference(key, {
                          offset: (pref.offset || 0) + 1,
                        })
                      }
                      className="relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors"
                    >
                      {/* @ts-ignore */}
                      <md-ripple></md-ripple>
                      <Plus size={20} className="relative z-10" />
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )
    },
    {
      id: "adjustments_iqamah",
      tab: "adjustments",
      categoryLabel: settings.language === "ms" ? "SELA RANG > PENYELARASAN IQAMAH" : "OFFSET > IQAMAH DELAYS",
      title: t("iqamahOffset" as any) || "Penyelarasan Iqamah",
      keywords: "iqamah offset adjustments delay minutes minute plus minus fajr dhuhr asr maghrib isha subuh zohor asar isyak",
      render: () => (
        settings.showIqamah ? (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-[var(--md-sys-color-primary)] mb-4 px-2">
              {t("iqamahOffset" as any)}
            </h3>
            <div className="space-y-4">
              {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((key) => {
                const pref = preferences[key] || { iqamahOffset: 0 };
                return (
                  <div
                    key={`iqamah-${key}`}
                    className={cn("relative flex items-center justify-between p-4 sm:p-5 rounded-[2rem] transition-shadow overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 hover:shadow-md"))}
                  >
                    <md-elevation></md-elevation>
                    <span className="font-black text-[var(--md-sys-color-on-surface)] w-24 tracking-wider uppercase text-sm relative z-10">
                      {t(key as any)}
                    </span>
                    <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                      {/* @ts-ignore */}
                      <md-filled-tonal-icon-button
                        onClick={() =>
                          onUpdatePreference(key, {
                            iqamahOffset: Math.max(
                              0,
                              (pref.iqamahOffset || 0) - 1,
                            ),
                          })
                        }
                      >
                        <Minus size={20} />
                      </md-filled-tonal-icon-button>
                      <span className="w-10 sm:w-16 flex font-mono text-lg sm:text-2xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
                        {pref.iqamahOffset || 0}
                      </span>
                      {/* @ts-ignore */}
                      <md-filled-tonal-icon-button
                        onClick={() =>
                          onUpdatePreference(key, {
                            iqamahOffset: (pref.iqamahOffset || 0) + 1,
                          })
                        }
                      >
                        <Plus size={20} />
                      </md-filled-tonal-icon-button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      )
    },
    {
      id: "advanced_sunnah",
      tab: "advanced",
      categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > PILIHAN WAKTU" : "SUNNAH > OPTIONAL PRAYERS",
      title: t("showSunnahTimes" as any) || "Show Sunnah Times",
      keywords: "sunnah optional practices suhoor sahur forbidden duha dhuha midnight tahajjud qiyammulail",
      render: () => (
        <div className={cn("relative rounded-[32px] p-6 sm:p-8 border border-[var(--md-sys-color-outline)]/5 shadow-sm space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)]"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
              <MoonStar size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                {t("showSunnahTimes" as any) || "Waktu Sunat"}
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                Papar waktu-waktu ibadah sunat dan waktu haram solat.
              </p>
            </div>
          </div>

          {/* Quick Actions Panel for Sunnah */}
          <div className="p-4 rounded-3xl border border-[var(--md-sys-color-outline)]/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-high)] relative z-10">
            <div>
              <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)] block">
                {t("quickActionSunnah" as any) || "Tindakan Pantas Sunat"}
              </span>
              <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                {t("quickActionSunnahDesc" as any) || "Aktifkan atau senyapkan semua penggera amalan sunat sekaligus."}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  updateSettings({ showSunnahTimes: [...SUNNAH_KEYS] });
                }}
                className="px-4 py-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full text-xs font-black transition-all shadow-sm hover:opacity-95 cursor-pointer"
              >
                {t("enableAllSunnah" as any) || "Aktifkan Semua"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  updateSettings({ showSunnahTimes: [] });
                }}
                className="px-4 py-2 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-full text-xs font-black transition-all shadow-sm hover:opacity-95 cursor-pointer"
              >
                {t("muteAllSunnah" as any) || "Senyapkan Semua"}
              </motion.button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
            {SUNNAH_KEYS.map((key) => (
              <div key={key} className={cn("flex items-center justify-between p-4 rounded-2xl shadow-sm", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/5"))}>
                <div>
                  <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                    {t(key as any)}
                  </span>
                  <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] leading-tight block mt-0.5">
                    {t(`${key}Desc` as any)}
                  </span>
                </div>
                {/* @ts-ignore */}
                <md-switch
                  selected={!!settings.showSunnahTimes?.includes(key)}
                  onChange={(e: any) => {
                    const current = settings.showSunnahTimes || [];
                    const isSelected = e.target.selected;
                    if (isSelected && !current.includes(key as any)) {
                      updateSettings({ showSunnahTimes: [...current, key as any] });
                    } else if (!isSelected && current.includes(key as any)) {
                      updateSettings({ showSunnahTimes: current.filter(k => k !== key) });
                    }
                  }}
                  icons
                ></md-switch>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: "advanced_rules",
      tab: "advanced",
      categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > PERATURAN PENGIRAAN" : "SUNNAH > CALCULATION RULES",
      title: t("advancedCalculationRules" as any),
      keywords: "calculation rules offsets suhoor imsak midnight method asr ends fajr sunrise sunset maghrib",
      render: () => (
        <div className={cn(
          "relative rounded-[32px] overflow-hidden transition-all duration-300 shadow-sm",
          showAdvancedCalculations
            ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10")
            : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent")
        )}>
          <md-elevation></md-elevation>
          <button
            onClick={() => setShowAdvancedCalculations(!showAdvancedCalculations)}
            type="button"
            className="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10"
          >
            {/* @ts-ignore */}
            <md-ripple></md-ripple>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                <Sliders size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">
                  {t("advancedCalculationRules" as any)}
                </h3>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                  {settings.language === "ms" 
                    ? "Ubahsuai offset Imsak/Sahur, kaedah Tengah Malam & Asar." 
                    : "Modify Suhoor/Imsak offsets, Midnight & Asar methods."}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showAdvancedCalculations ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--md-sys-color-on-surface-variant)]"
            >
              <ChevronDown size={20} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showAdvancedCalculations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                    {t("suhoorOffset" as any)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60].map((mins) => (
                      /* @ts-ignore */
                      <md-filter-chip
                        key={`suhoor-${mins}`}
                        label={`${mins} min`}
                        selected={settings.suhoorOffset === mins || (!settings.suhoorOffset && mins === 30)}
                        onClick={() => updateSettings({ suhoorOffset: mins })}
                      ></md-filter-chip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                    {t("imsakOffset" as any)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[2, 5, 10, 15].map((mins) => (
                      /* @ts-ignore */
                      <md-filter-chip
                        key={`imsak-${mins}`}
                        label={`${mins} min`}
                        selected={settings.imsakOffset === mins || (!settings.imsakOffset && mins === 10)}
                        onClick={() => updateSettings({ imsakOffset: mins })}
                      ></md-filter-chip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                    {t("midnightMethod" as any)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* @ts-ignore */}
                    <md-filter-chip
                      label={t("midnightFajr" as any)}
                      selected={!settings.midnightMethod || settings.midnightMethod === "fajr"}
                      onClick={() => updateSettings({ midnightMethod: "fajr" })}
                    ></md-filter-chip>
                    {/* @ts-ignore */}
                    <md-filter-chip
                      label={t("midnightSunrise" as any)}
                      selected={settings.midnightMethod === "sunrise"}
                      onClick={() => updateSettings({ midnightMethod: "sunrise" })}
                    ></md-filter-chip>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                    {t("asrEnds" as any)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* @ts-ignore */}
                    <md-filter-chip
                      label={t("asrEndsMaghrib" as any)}
                      selected={!settings.asrEnds || settings.asrEnds === "maghrib"}
                      onClick={() => updateSettings({ asrEnds: "maghrib" })}
                    ></md-filter-chip>
                    {/* @ts-ignore */}
                    <md-filter-chip
                      label={t("asrEndsSunset" as any)}
                      selected={settings.asrEnds === "sunset"}
                      onClick={() => updateSettings({ asrEnds: "sunset" })}
                    ></md-filter-chip>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    },
    {
      id: "advanced_hijri",
      tab: "advanced",
      categoryLabel: settings.language === "ms" ? "AMALAN SUNAT > ENJIN HIJRAH" : "SUNNAH > HIJRI CALENDAR ENGINE",
      title: t("hijriCalendarEngine" as any),
      keywords: "hijri calendar engine adjustment methods jakim umalqura civil tbla islamic",
      render: () => (
        <div className={cn(
          "relative rounded-[32px] overflow-hidden transition-all duration-300 mt-4",
          showHijriEngine
            ? getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)] p-6 space-y-6 border border-[var(--md-sys-color-outline)]/10")
            : getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] p-4 sm:p-5 border border-transparent")
        )}>
          <md-elevation></md-elevation>
          <button
            onClick={() => setShowHijriEngine(!showHijriEngine)}
            type="button"
            className="relative w-full flex items-center justify-between font-bold text-left cursor-pointer focus:outline-none overflow-hidden z-10"
          >
            {/* @ts-ignore */}
            <md-ripple></md-ripple>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                <Sliders size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--md-sys-color-on-surface)]">
                  {t("hijriCalendarEngine" as any)}
                </h3>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                  {settings.language === "ms" 
                    ? "Tetapkan kaedah kiraan kalendar Hijri & pelarasan hari." 
                    : "Configure Hijri calendar calculation methods & day offset."}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showHijriEngine ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--md-sys-color-on-surface-variant)]"
            >
              <ChevronDown size={20} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showHijriEngine && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/10 relative z-10"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                    {t("hijriMethod" as any)}
                  </label>
                  <div className="w-full">
                    {/* @ts-ignore */}
                    <md-outlined-select
                      value={settings.hijriMethod || "jakim"}
                      onChange={(e: any) => updateSettings({ hijriMethod: e.target.value })}
                      onInput={(e: any) => updateSettings({ hijriMethod: e.target.value })}
                      style={{ width: "100%" }}
                    >
                      {((["jakim", "umalqura", "tbla", "civil", "islamic"] as const).map((method) => (
                        /* @ts-ignore */
                        <md-select-option 
                          key={`hijri-${method}`} 
                          value={method}
                          onClick={() => updateSettings({ hijriMethod: method })}
                        >
                          <div slot="headline">{t(`method${method.charAt(0).toUpperCase() + method.slice(1)}` as any)}</div>
                        </md-select-option>
                      )))}
                    </md-outlined-select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-4">
                  <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                    {t("hijriAdjustment" as any)}
                  </span>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* @ts-ignore */}
                    <md-filled-tonal-icon-button
                      onClick={() =>
                        updateSettings({
                          hijriAdjustment: Math.max(-2, (settings.hijriAdjustment ?? 0) - 1),
                        })
                      }
                      aria-label={settings.language === "ms" ? "Kurangkan pelarasan Hijri" : "Decrease Hijri adjustment"}
                    >
                      <Minus size={20} />
                    </md-filled-tonal-icon-button>
                    <span className="w-16 flex font-mono text-lg sm:text-xl font-black items-center justify-center tabular-nums text-[var(--md-sys-color-primary)]">
                      {(settings.hijriAdjustment ?? 0) > 0 ? "+" : ""}
                      {settings.hijriAdjustment ?? 0}
                    </span>
                    {/* @ts-ignore */}
                    <md-filled-tonal-icon-button
                      onClick={() =>
                        updateSettings({
                          hijriAdjustment: Math.min(2, (settings.hijriAdjustment ?? 0) + 1),
                        })
                      }
                      aria-label={settings.language === "ms" ? "Tambah pelarasan Hijri" : "Increase Hijri adjustment"}
                    >
                      <Plus size={20} />
                    </md-filled-tonal-icon-button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    },
    {
      id: "advanced_reset",
      tab: "advanced",
      categoryLabel: settings.language === "ms" ? "LALU TETAP > SET SEMULA" : "DEFAULTS > FACTORY RESET",
      title: t("resetDefault" as any),
      keywords: "reset factory default settings preference asal semula padam konfig",
      render: () => (
        <div className={cn("relative rounded-[32px] p-6 sm:p-8 border border-[var(--md-sys-color-outline)]/5 shadow-sm space-y-4 mt-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container)]"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] flex items-center justify-center">
              <RefreshCw size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                {t("resetDefault" as any)}
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                {t("resetToDefaultsDesc" as any)}
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-[var(--md-sys-color-outline)]/10 flex flex-wrap items-center gap-4 justify-between relative z-10">
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-sm">
              {settings.language === 'ms' 
                ? "Tindakan ini akan menetapkan semula semua konfigurasi dan penggera solat serta-merta." 
                : "This action will immediately revert all prayer offsets, sounds, and settings."}
            </p>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResetToDefaults}
                type="button"
                className="px-6 py-3 w-full sm:w-auto bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] rounded-full font-black text-sm transition-all shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-error)] flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                {t("resetDefault" as any)}
              </motion.button>
            </div>
          </div>

          {showResetToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm relative z-10"
            >
              <Check size={16} className="stroke-[3]" />
              <span>{t("resetSuccess" as any)}</span>
            </motion.div>
          )}
        </div>
      )
    },
    {
      id: "mosque_tv_mode",
      tab: "mosque",
      categoryLabel: settings.language === "ms" ? "MASJID > MOD TV" : "MOSQUE > TV MODE",
      title: settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode",
      keywords: "mosque tv mode enabled custom reminders interval hadith display",
      render: () => (
        <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
              <Tv size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                {settings.language === "ms" ? "Mod TV Masjid" : "Mosque TV Mode"}
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                {t("tvModeEnabledDesc" as any)}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
            <div className="flex items-center justify-between p-1">
              <div>
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  {t("tvModeEnabled" as any)}
                </h4>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                  {settings.language === "ms" 
                    ? "Aktifkan paparan TV masjid skrin penuh landskap secara berterusan." 
                    : "Activate persistent full-screen landscape TV presentation layout."}
                </p>
              </div>
              {/* @ts-ignore */}
              <md-switch
                selected={!!settings.tvModeEnabled}
                onChange={(e: any) =>
                  updateSettings({ tvModeEnabled: e.target.selected })
                }
                icons
              ></md-switch>
            </div>

            {settings.tvModeEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pt-4 border-t border-[var(--md-sys-color-outline)]/5 mt-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 gap-3">
                  <div>
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("tvModeReminderInterval" as any)}
                    </span>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                      {settings.language === "ms" ? "Tempoh putaran peringatan/hadith." : "Rotation delay for scrolling reminders."}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                    {/* @ts-ignore */}
                    <md-slider
                      min="5"
                      max="120"
                      step="5"
                      value={settings.tvModeReminderInterval ?? 15}
                      labeled
                      ticks
                      onChange={(e: any) => updateSettings({ tvModeReminderInterval: e.target.value })}
                      className="flex-1"
                    ></md-slider>
                    <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                      {settings.tvModeReminderInterval ?? 15}s
                    </span>
                  </div>
                </div>

                <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
                  <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                    {t("tvModeCustomReminders" as any)}
                  </span>
                  <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                    {t("tvModeCustomRemindersDesc" as any)}
                  </span>
                  
                  <textarea
                    rows={4}
                    value={settings.tvModeCustomReminders ?? ""}
                    onChange={(e) => updateSettings({ tvModeCustomReminders: e.target.value })}
                    placeholder={settings.language === "ms" 
                      ? "Contoh:\nSila luruskan saff dan rapatkan barisan sebelum memulakan solat berjemaah.\nMatikan atau senyapkan telefon bimbit anda untuk menjaga kekhusyukan masjid."
                      : "Example:\nPlease straighten the rows and close the gaps before beginning prayer.\nKindly silence or turn off your mobile devices to maintain tranquility."}
                    className="w-full mt-3 p-4 text-sm rounded-2xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none transition-all placeholder-[var(--md-sys-color-on-surface-variant)]/30 resize-y font-sans font-medium"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )
    },
    {
      id: "mosque_countdown",
      tab: "mosque",
      categoryLabel: settings.language === "ms" ? "MASJID > BUNYI IQAMAH" : "MOSQUE > IQAMAH ALARM",
      title: t("iqamahCountdownSound" as any),
      keywords: "mosque iqamah countdown sounds chime tick test quartz tone",
      render: () => (
        <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
              <Activity size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                {t("iqamahSoundSection" as any)}
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                Select countdown alert tones and audition sounds.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1">
                {t("iqamahCountdownSound" as any)}
              </label>
              <div className="flex flex-wrap gap-2">
                {(["chime", "tick", "none"] as const).map((sound) => (
                  /* @ts-ignore */
                  <md-filter-chip
                    key={sound}
                    label={
                      sound === "chime"
                        ? t("chime" as any)
                        : sound === "tick"
                          ? t("clockMovementTick" as any)
                          : t("none")
                    }
                    selected={settings.iqamahCountdownSound === sound || (!settings.iqamahCountdownSound && sound === "chime")}
                    onClick={() => updateSettings({ iqamahCountdownSound: sound })}
                  ></md-filter-chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playSynthesizedSoundLocal('chime', (settings.soundVolume ?? 80) / 100, 800)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-3xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] text-xs font-bold shadow-sm border border-[var(--md-sys-color-outline)]/5 transition-all focus:outline-none"
              >
                <Volume2 size={16} />
                {t("testIqamahChime" as any)}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playSynthesizedSoundLocal('tick', (settings.soundVolume ?? 80) / 100)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-3xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] text-xs font-bold shadow-sm border border-[var(--md-sys-color-outline)]/5 transition-all focus:outline-none"
              >
                <Volume2 size={16} />
                {t("testIqamahTick" as any)}
              </motion.button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "mosque_screensaver",
      tab: "mosque",
      categoryLabel: settings.language === "ms" ? "MASJID > SCREENAVER & WAKTU" : "MOSQUE > SOLAT SCREENAVER",
      title: t("solatScreensaverSection" as any),
      keywords: "screensaver clock qibla dua duration remembrance solat mode timer countdown fajr dhuhr asr maghrib isha subuh zohor asar isyak",
      render: () => (
        <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
              <Clock size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--md-sys-color-on-surface)]">
                {t("solatScreensaverSection" as any)}
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                Configure private prayer window and remembrance timers.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
            <div className="flex items-center justify-between p-1">
              <div>
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  {t("solatModeEnabled" as any)}
                </h4>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5">
                  {t("solatModeInstruction" as any)}
                </p>
              </div>
              {/* @ts-ignore */}
              <md-switch
                selected={!!settings.solatModeEnabled}
                onChange={(e: any) =>
                  updateSettings({ solatModeEnabled: e.target.selected })
                }
                icons
              ></md-switch>
            </div>

            {settings.solatModeEnabled && (
              <div className="space-y-4 pt-4 mt-2 border-t border-[var(--md-sys-color-outline)]/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-xs">
                      {t("solatModeShowClock" as any)}
                    </span>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.solatModeShowClock !== false}
                      onChange={(e: any) =>
                        updateSettings({ solatModeShowClock: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-xs">
                      {t("solatModeShowQibla" as any)}
                    </span>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.solatModeShowQibla !== false}
                      onChange={(e: any) =>
                        updateSettings({ solatModeShowQibla: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--md-sys-color-surface)] rounded-[2rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5 mt-2">
                  <div>
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("solatModeDuaDuration" as any)}
                    </span>
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] block">
                      Serene dhikr interval before exit.
                    </span>
                  </div>
                  <div className="flex-1 px-4 max-w-[200px]">
                    {/* @ts-ignore */}
                    <md-slider
                      min="0"
                      max="10"
                      step="1"
                      value={settings.solatModeDuaDuration ?? 0}
                      labeled
                      ticks
                      onChange={(e: any) => updateSettings({ solatModeDuaDuration: e.target.value })}
                    ></md-slider>
                  </div>
                  <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums">
                    {settings.solatModeDuaDuration ?? 0}m
                  </span>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] ml-1 mb-2">
                    {t("solatModeDuration" as any)}
                  </h4>
                  <div className="space-y-2">
                    {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((key) => {
                      const duration = settings.solatModeDuration?.[key] ?? 10;
                      return (
                        <div
                          key={`solat-dur-${key}`}
                          className="flex items-center justify-between p-3 bg-[var(--md-sys-color-surface)] rounded-[1.5rem] shadow-sm ring-1 ring-[var(--md-sys-color-outline)]/5"
                        >
                          <span className="font-bold text-[var(--md-sys-color-on-surface)] tracking-wider uppercase text-xs w-24 pl-1">
                            {t(key as any)}
                          </span>
                          <div className="flex-1 px-4">
                            {/* @ts-ignore */}
                            <md-slider
                              min="1"
                              max="60"
                              step="1"
                              value={duration}
                              labeled
                              ticks
                              onChange={(e: any) => {
                                const currentDurations = settings.solatModeDuration ?? { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 };
                                updateSettings({
                                  solatModeDuration: {
                                    ...currentDurations,
                                    [key]: e.target.value,
                                  },
                                });
                              }}
                            ></md-slider>
                          </div>
                          <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                            {duration}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: "mosque_background",
      tab: "mosque",
      categoryLabel: settings.language === "ms" ? "MASJID > TUGAS LATAR" : "MOSQUE > BACKGROUND PLAYBACK",
      title: t("backgroundNotifications" as any),
      keywords: "background notifications minimised minimized screen locked alarm alert sound",
      render: () => (
        <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-4 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
          <md-elevation></md-elevation>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                {t("backgroundNotifications" as any)}
              </h3>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                Keep prayer sound/alerts active even when tab is minimized or screen is locked.
              </p>
            </div>
            {/* @ts-ignore */}
            <md-switch
              selected={!!settings.backgroundNotifications}
              onChange={(e: any) =>
                updateSettings({ backgroundNotifications: e.target.selected })
              }
              icons
            ></md-switch>
          </div>
        </div>
      )
    }
  ];

  // Perform search matching
  const matchingCards = allSettingsCards.filter(card => {
    if (!searchQuery) return card.tab === activeTab;
    const query = searchQuery.toLowerCase().trim();
    return card.title.toLowerCase().includes(query) || 
           card.keywords.includes(query) || 
           card.categoryLabel.toLowerCase().includes(query);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ isolation: "isolate" }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes bounce-bar {
              0%, 100% { height: 4px; }
              50% { height: 12px; }
            }
            .animate-bar-1 { animation: bounce-bar 0.6s infinite ease-in-out; }
            .animate-bar-2 { animation: bounce-bar 0.6s infinite ease-in-out 0.15s; }
            .animate-bar-3 { animation: bounce-bar 0.6s infinite ease-in-out 0.3s; }
          ` }} />
          <div className="absolute inset-0 bg-black/80" onClick={onClose} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[var(--md-sys-color-surface-container)] w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-2xl border border-[var(--md-sys-color-outline)]/20 shadow-black/50"
          >
            {/* Header + Search bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 sm:pt-8 sm:pb-4 border-b border-[var(--md-sys-color-outline)]/10 gap-4 shrink-0 bg-[var(--md-sys-color-surface)]">
              <div>
                <h2 className="md3-headline-small font-bold text-[var(--md-sys-color-on-surface)]">
                  {t("settings")}
                </h2>
              </div>
              
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 flex-1 max-w-sm sm:justify-end sm:ml-auto">
                <div className="relative flex-1 group">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={settings.language === "ms" ? "Cari tetapan..." : "Search settings..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-12 pr-12 h-14 text-sm rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none transition-all focus:bg-[var(--md-sys-color-surface-container-highest)] focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] placeholder-[var(--md-sys-color-on-surface-variant)]/50",
                      getStyleClasses(visualStyle)
                    )}
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]/60 transition-colors group-focus-within:text-[var(--md-sys-color-primary)]" />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-on-surface-variant)]/60 hover:text-[var(--md-sys-color-on-surface)] flex items-center justify-center w-6 h-6 rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors focus:outline-none"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-black font-mono rounded bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)]/40 pointer-events-none select-none">
                      /
                    </kbd>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  aria-label={t("close") || "Close"}
                  className="relative overflow-hidden w-10 h-10 flex items-center justify-center rounded-full text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] shrink-0 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-error)] cursor-pointer"
                >
                  {/* @ts-ignore */}
                  <md-ripple></md-ripple>
                  <X size={22} className="stroke-[2.5] relative z-10" />
                </motion.button>
              </div>
            </div>

            {/* Split layout: Sidebar for desktop, top tabs for mobile */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* Left Sidebar Drawer (Desktop Only) - Conditionally hidden during search query */}
              {!searchQuery && (
                <motion.div
                  animate={{ width: sidebarCollapsed ? 80 : 256 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={cn(
                    "hidden md:flex flex-col border-r border-[var(--md-sys-color-outline)]/10 bg-[var(--md-sys-color-surface-container-low)] space-y-2 shrink-0 overflow-y-auto no-scrollbar transition-all duration-300",
                    sidebarCollapsed ? "p-3" : "p-4"
                  )}
                >
                  {/* Collapsible toggle header */}
                  <div className="flex items-center mb-6 px-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleSidebar}
                      type="button"
                      className={cn(
                        "h-9 rounded-full flex items-center bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] transition-colors focus:outline-none cursor-pointer overflow-hidden shadow-sm",
                        sidebarCollapsed ? "w-9 justify-center mx-auto" : "px-3 justify-between w-full"
                      )}
                    >
                      <AnimatePresence initial={false}>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-[10px] uppercase font-black tracking-widest whitespace-nowrap overflow-hidden pl-1"
                          >
                            {t("settings")}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <div className="shrink-0">
                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                      </div>
                    </motion.button>
                  </div>

                  {[
                    { id: "general", label: t("general"), icon: Settings },
                    { id: "notifications", label: t("notifications"), icon: Bell },
                    { id: "adjustments", label: t("offset"), icon: Clock },
                    { id: "advanced", label: t("sunnahAndOptional" as any) || "Lanjutan", icon: Sliders },
                    { id: "mosque", label: t("mosqueMode" as any), icon: Music }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        title={sidebarCollapsed ? tab.label : undefined}
                        className="relative group select-none flex items-center h-12 pl-4 pr-4 rounded-2xl outline-none focus:outline-none cursor-pointer w-full transition-all duration-300 overflow-hidden"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-tab-indicator"
                            className="absolute inset-0 bg-[var(--md-sys-color-secondary-container)] border border-[var(--md-sys-color-outline)]/10 shadow-sm z-0 rounded-2xl"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {/* Hover indicator for non-active items */}
                        {!isActive && (
                          <div className="absolute inset-0 bg-[var(--md-sys-color-on-surface)] opacity-0 group-hover:opacity-5 transition-opacity duration-200 z-0 rounded-2xl" />
                        )}
                        {/* @ts-ignore */}
                        <md-ripple></md-ripple>
                        
                        <div className="w-6 h-6 flex items-center justify-center relative z-10 shrink-0">
                          <Icon
                            className={cn(
                              "transition-colors duration-200 shrink-0",
                              isActive
                                ? "text-[var(--md-sys-color-on-secondary-container)]"
                                : "text-[var(--md-sys-color-on-surface-variant)]"
                            )}
                            size={20}
                          />
                        </div>

                        <AnimatePresence initial={false}>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0, x: -10 }}
                              animate={{ opacity: 1, width: "auto", x: 0 }}
                              exit={{ opacity: 0, width: 0, x: -10 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="ml-3 font-bold text-sm text-left relative z-10 whitespace-nowrap overflow-hidden"
                              style={{
                                color: isActive
                                  ? "var(--md-sys-color-on-secondary-container)"
                                  : "var(--md-sys-color-on-surface-variant)"
                              }}
                            >
                              {tab.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* Horizontal Tabs (Mobile Only) - Conditionally hidden during active search */}
              {!searchQuery && (
                <div className="md:hidden w-full overflow-x-auto no-scrollbar border-b border-[var(--md-sys-color-outline)]/10 shrink-0 bg-[var(--md-sys-color-surface-container-low)]">
                  {/* @ts-ignore */}
                  <md-tabs className="min-w-max w-full" activeTabIndex={activeTab === 'general' ? 0 : activeTab === 'notifications' ? 1 : activeTab === 'adjustments' ? 2 : activeTab === 'advanced' ? 3 : 4}>
                    {/* @ts-ignore */}
                    <md-primary-tab onClick={() => setActiveTab("general")}>
                      {t("general")}
                      <span slot="icon"><Settings size={18} /></span>
                    </md-primary-tab>
                    {/* @ts-ignore */}
                    <md-primary-tab onClick={() => setActiveTab("notifications")}>
                      {t("notifications")}
                      <span slot="icon"><Bell size={18} /></span>
                    </md-primary-tab>
                    {/* @ts-ignore */}
                    <md-primary-tab onClick={() => setActiveTab("adjustments")}>
                      {t("offset")}
                      <span slot="icon"><Clock size={18} /></span>
                    </md-primary-tab>
                    {/* @ts-ignore */}
                    <md-primary-tab onClick={() => setActiveTab("advanced")}>
                      {t("sunnahAndOptional" as any) || "Lanjutan"}
                      <span slot="icon"><Sliders size={18} /></span>
                    </md-primary-tab>
                    {/* @ts-ignore */}
                    <md-primary-tab onClick={() => setActiveTab("mosque")}>
                      {t("mosqueMode" as any)}
                      <span slot="icon"><Music size={18} /></span>
                    </md-primary-tab>
                  </md-tabs>
                </div>
              )}

              {/* Settings Content Container */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 pt-6 space-y-6 custom-scrollbar bg-[var(--md-sys-color-surface-container-lowest)]">
                
                {/* Search query header banner */}
                {searchQuery && (
                  <div className="flex flex-col gap-1 mb-2 animate-in fade-in slide-in-from-top-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[var(--md-sys-color-primary)]">
                      {settings.language === "ms" ? "Keputusan Carian" : "Search Results"}
                    </span>
                    <h3 className="text-xl font-bold text-[var(--md-sys-color-on-surface)]">
                      {settings.language === "ms" ? `Menjumpai ${matchingCards.length} tetapan padanan` : `Found ${matchingCards.length} matching settings`}
                    </h3>
                  </div>
                )}

                {/* Main dynamic card list mapping */}
                <div className="space-y-6 max-w-2xl mx-auto">
                  {matchingCards.map((card) => (
                    <div key={card.id} className="space-y-2 animate-in fade-in duration-200">
                      {/* Search category breadcrumbs */}
                      {searchQuery && (
                        <div className="text-[10px] uppercase font-black tracking-widest text-[var(--md-sys-color-on-surface-variant)]/60 px-1">
                          {card.categoryLabel}
                        </div>
                      )}
                      {card.render()}
                    </div>
                  ))}

                  {/* Empty state search view */}
                  {searchQuery && matchingCards.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto animate-in fade-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-outline)] flex items-center justify-center">
                        <Search size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--md-sys-color-on-surface)]">
                          {settings.language === "ms" ? "Tiada tetapan dijumpai" : "No settings found"}
                        </h4>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
                          {settings.language === "ms" 
                            ? "Cuba kata kunci yang berbeza seperti 'azan', 'iqamah', 'jam', atau 'bahasa'." 
                            : "Try using different keywords like 'adhan', 'iqamah', 'clock', or 'language'."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
