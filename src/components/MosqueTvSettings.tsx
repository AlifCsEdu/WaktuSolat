import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tv,
  Sliders,
  Clock,
  Sparkles,
  BookOpen,
  Heart,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  AlertCircle,
  GripVertical,
  Copy,
  VolumeX,
  MapPin
} from "lucide-react";

// Category-specific styles for reminders
const getCategoryStyles = (type: TvModeReminder['type'], enabled: boolean) => {
  if (!enabled) {
    return {
      cardClass: "border-l-4 border-l-slate-400 dark:border-l-slate-600 bg-[var(--md-sys-color-surface-container-low)]/40 border-[var(--md-sys-color-outline)]/5 opacity-70",
      badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350"
    };
  }
  
  switch (type) {
    case 'hadith':
      return {
        cardClass: "border-l-4 border-l-purple-500 dark:border-l-purple-400 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.12)] hover:shadow-[0_8px_24px_-4px_rgba(168,85,247,0.2)]",
        badgeClass: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200"
      };
    case 'quran':
      return {
        cardClass: "border-l-4 border-l-amber-500 dark:border-l-amber-450 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.12)] hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.2)]",
        badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      };
    case 'warning':
      return {
        cardClass: "border-l-4 border-l-orange-500 dark:border-l-orange-400 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.12)] hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.2)]",
        badgeClass: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
      };
    case 'info':
      return {
        cardClass: "border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.12)] hover:shadow-[0_8px_24px_-4px_rgba(59,130,246,0.2)]",
        badgeClass: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
      };
    case 'donation':
      return {
        cardClass: "border-l-4 border-l-rose-500 dark:border-l-rose-400 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.12)] hover:shadow-[0_8px_24px_-4px_rgba(244,63,94,0.2)]",
        badgeClass: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
      };
    default:
      return {
        cardClass: "border-l-4 border-l-primary-500 bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10",
        badgeClass: "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
      };
  }
};
import { cn } from "../lib/utils";
import { useAppContext } from "../AppContext";
import { useVisualStyle, getStyleClasses } from "../hooks/useVisualStyle";
import {
  saveMosqueLogo,
  getMosqueLogoBlob,
  clearMosqueLogo
} from "../lib/db";
import { TvModeReminder } from "../types";

export function MosqueTvSettings() {
  const { settings, updateSettings, t } = useAppContext();
  const visualStyle = useVisualStyle();

  // Accordion Section Open/Close States
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    basic: true,
    layout: false,
    logo: false,
    widget: false,
    reminders: false,
  });

  const [collapsedReminders, setCollapsedReminders] = useState<Record<string, boolean>>({});

  const toggleAccordion = (section: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleReminderCollapse = (id: string) => {
    setCollapsedReminders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCollapseAllReminders = () => {
    const collapsed: Record<string, boolean> = {};
    (settings.tvModeRemindersList || []).forEach(r => {
      collapsed[r.id] = true;
    });
    setCollapsedReminders(collapsed);
  };

  const handleExpandAllReminders = () => {
    setCollapsedReminders({});
  };

  const handleAddReminder = () => {
    const newList = [
      ...(settings.tvModeRemindersList || []),
      {
        id: Math.random().toString(36).substring(2, 9),
        type: 'hadith' as const,
        text: settings.language === 'ms' ? 'Peringatan baru...' : 'New reminder...',
        title: '',
        enabled: true
      }
    ];
    updateSettings({ tvModeRemindersList: newList });
  };

  const handleUpdateReminder = (id: string, updates: Partial<TvModeReminder>) => {
    const newList = (settings.tvModeRemindersList || []).map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    updateSettings({ tvModeRemindersList: newList });
  };

  const handleDeleteReminder = (id: string) => {
    const newList = (settings.tvModeRemindersList || []).filter(r => r.id !== id);
    updateSettings({ tvModeRemindersList: newList });
  };

  const handleMoveReminder = (index: number, direction: 'up' | 'down') => {
    const list = [...(settings.tvModeRemindersList || [])];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    updateSettings({ tvModeRemindersList: list });
  };

  const handleDuplicateReminder = (reminder: TvModeReminder) => {
    const newList = [...(settings.tvModeRemindersList || [])];
    const index = newList.findIndex(r => r.id === reminder.id);
    const duplicated: TvModeReminder = {
      ...reminder,
      id: Math.random().toString(36).substring(2, 9),
      title: reminder.title ? `${reminder.title} (${settings.language === 'ms' ? 'Salinan' : 'Copy'})` : (settings.language === 'ms' ? 'Salinan' : 'Copy')
    };
    if (index !== -1) {
      newList.splice(index + 1, 0, duplicated);
    } else {
      newList.push(duplicated);
    }
    updateSettings({ tvModeRemindersList: newList });
  };

  const handleBulkToggleReminders = () => {
    const list = settings.tvModeRemindersList || [];
    if (list.length === 0) return;
    const allEnabled = list.every(r => r.enabled !== false);
    const newList = list.map(r => ({ ...r, enabled: !allEnabled }));
    updateSettings({ tvModeRemindersList: newList });
  };

  // Logo uploading states & handlers
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (settings.mosqueLogoEnabled) {
      if (settings.mosqueLogoUrl) {
        setPreviewLogoUrl(settings.mosqueLogoUrl);
      } else {
        getMosqueLogoBlob().then((blob) => {
          if (blob && active) {
            const url = URL.createObjectURL(blob);
            setPreviewLogoUrl(url);
          }
        });
      }
    } else {
      setPreviewLogoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [settings.mosqueLogoEnabled, settings.mosqueLogoUrl, settings.mosqueLogoLastUpdated]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const url = await saveMosqueLogo(file);
        updateSettings({
          mosqueLogoEnabled: true,
          mosqueLogoUrl: "", // Reset URL if uploaded
          mosqueLogoLastUpdated: Date.now()
        });
        setPreviewLogoUrl(url);
      } catch (e) {
        console.error("Failed to save custom logo to IndexedDB:", e);
      }
    }
  };

  const handleClearLogo = async () => {
    try {
      await clearMosqueLogo();
      updateSettings({
        mosqueLogoEnabled: false,
        mosqueLogoUrl: ""
      });
      setPreviewLogoUrl(null);
    } catch (e) {
      console.error("Failed to clear mosque logo:", e);
    }
  };

  // Camera settings
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const checkCameraPermissionsAndLoad = async (requestAccess = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      if (requestAccess) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && videoInputs[0].label) {
        setCameraPermissionStatus('granted');
      } else {
        setCameraPermissionStatus(requestAccess ? 'denied' : 'prompt');
      }
    } catch (err) {
      console.error("Camera permission error:", err);
      setCameraPermissionStatus('denied');
    }
  };

  useEffect(() => {
    if (settings.tvModeCenterWidget === 'camera') {
      checkCameraPermissionsAndLoad();
    }
  }, [settings.tvModeCenterWidget]);

  const remindersList = settings.tvModeRemindersList || [];
  const activeCount = remindersList.filter(r => r.enabled !== false).length;
  const countText = t("remindersCount" as any)
    .replace("{count}", String(remindersList.length)) + 
    ` (${t("remindersActiveCount" as any).replace("{active}", String(activeCount))})`;

  return (
    <div className={cn("relative p-6 sm:p-8 rounded-[var(--md-sys-shape-corner-extra-large)] space-y-6 overflow-hidden", getStyleClasses(visualStyle, "bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 shadow-sm"))}>
      <md-elevation></md-elevation>
      
      {/* Mosque Mode Title & Header */}
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

      {/* Accordion Container */}
      <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/10 relative z-10">
        
        {/* SECTION 1: BASIC SETUP */}
        <div className="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
          <button
            type="button"
            onClick={() => toggleAccordion('basic')}
            className="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Sliders size={18} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                {t("sectionBasicSetup" as any)}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
                openAccordions.basic ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {openAccordions.basic && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* TV Enabled toggle */}
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

                  {/* TV Shortcut Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("showTvShortcut" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("showTvShortcutDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={!!settings.showTvShortcut}
                      onChange={(e: any) =>
                        updateSettings({ showTvShortcut: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Mosque Name Input */}
                  <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl shadow-sm border border-[var(--md-sys-color-outline)]/5 pt-3">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("mosqueNameLabel" as any)}
                    </span>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                      {settings.language === "ms"
                        ? "Masukkan nama masjid atau surau untuk dipaparkan pada kepala Mod TV (Contoh: Masjid Negara)."
                        : "Enter mosque or surau name to show in the TV Mode header (e.g. National Mosque)."}
                    </span>
                    <input
                      type="text"
                      value={settings.mosqueName ?? ""}
                      onChange={(e) => updateSettings({ mosqueName: e.target.value })}
                      placeholder={t("mosqueNamePlaceholder" as any)}
                      className="w-full mt-3 px-4 py-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] outline-none transition-all placeholder-[var(--md-sys-color-on-surface-variant)]/30 font-sans font-medium animate-all duration-300 search-focus-ring"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 2: LAYOUT & DISPLAY */}
        <div className="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
          <button
            type="button"
            onClick={() => toggleAccordion('layout')}
            className="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                {t("sectionLayoutDisplay" as any)}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
                openAccordions.layout ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {openAccordions.layout && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Layout selector */}
                  <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl shadow-sm border border-[var(--md-sys-color-outline)]/5">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("tvModeLayoutLabel" as any)}
                    </span>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                      {settings.language === "ms"
                        ? "Pilih gaya susunan waktu solat dan widget utama pada skrin TV."
                        : "Choose the arrangement style of prayer times and main widgets on the TV screen."}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("tvModeLayoutSplit" as any)}
                        selected={settings.tvModeLayout === "split" || !settings.tvModeLayout}
                        onClick={() => updateSettings({ tvModeLayout: "split" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("tvModeLayoutBottom" as any)}
                        selected={settings.tvModeLayout === "bottom"}
                        onClick={() => updateSettings({ tvModeLayout: "bottom" })}
                      ></md-filter-chip>
                    </div>
                  </div>

                  {/* Clock Scale slider */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3">
                    <div>
                      <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                        {t("tvClockScaleLabel" as any)}
                      </span>
                      <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                        {t("tvClockScaleDesc" as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                      {/* @ts-ignore */}
                      <md-slider
                        min="0.7"
                        max="1.3"
                        step="0.05"
                        value={settings.tvModeClockScale ?? 1}
                        labeled
                        ticks
                        onChange={(e: any) => updateSettings({ tvModeClockScale: parseFloat(e.target.value) })}
                        className="flex-1"
                      ></md-slider>
                      <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                        {Math.round((settings.tvModeClockScale ?? 1) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Schedule Scale slider */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3">
                    <div>
                      <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                        {t("tvScheduleScaleLabel" as any)}
                      </span>
                      <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                        {t("tvScheduleScaleDesc" as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                      {/* @ts-ignore */}
                      <md-slider
                        min="0.7"
                        max="1.3"
                        step="0.05"
                        value={settings.tvModeScheduleScale ?? 1}
                        labeled
                        ticks
                        onChange={(e: any) => updateSettings({ tvModeScheduleScale: parseFloat(e.target.value) })}
                        className="flex-1"
                      ></md-slider>
                      <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                        {Math.round((settings.tvModeScheduleScale ?? 1) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Show Weather Widget Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("tvShowWeatherLabel" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("tvShowWeatherDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.tvModeShowWeather !== false}
                      onChange={(e: any) =>
                        updateSettings({ tvModeShowWeather: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Show Countdown Panel Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("tvShowCountdownLabel" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("tvShowCountdownDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.tvModeShowCountdown !== false}
                      onChange={(e: any) =>
                        updateSettings({ tvModeShowCountdown: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Show Date Bar Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("tvShowDateBarLabel" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("tvShowDateBarDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.tvModeShowDateBar !== false}
                      onChange={(e: any) =>
                        updateSettings({ tvModeShowDateBar: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Clock Colon Blink Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("tvClockColonBlinkLabel" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("tvClockColonBlinkDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={settings.tvModeClockColonBlink !== false}
                      onChange={(e: any) =>
                        updateSettings({ tvModeClockColonBlink: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Clock Hide Seconds Toggle */}
                  <div className="flex items-center justify-between p-1 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                        {t("tvModeHideSecondsLabel" as any)}
                      </h4>
                      <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-0.5 max-w-[200px] sm:max-w-xs">
                        {t("tvModeHideSecondsDesc" as any)}
                      </p>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={!!settings.tvModeHideSeconds}
                      onChange={(e: any) =>
                        updateSettings({ tvModeHideSeconds: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {/* Scrolling Ticker Speed */}
                  <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl shadow-sm border border-[var(--md-sys-color-outline)]/5 pt-3 border-t border-[var(--md-sys-color-outline)]/5 mt-3">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("tvModeTickerSpeedLabel" as any)}
                    </span>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                      {t("tvModeTickerSpeedDesc" as any)}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("tickerSpeedSlow" as any)}
                        selected={settings.tvModeTickerSpeed === "slow"}
                        onClick={() => updateSettings({ tvModeTickerSpeed: "slow" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("tickerSpeedMedium" as any)}
                        selected={settings.tvModeTickerSpeed === "medium" || !settings.tvModeTickerSpeed}
                        onClick={() => updateSettings({ tvModeTickerSpeed: "medium" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("tickerSpeedFast" as any)}
                        selected={settings.tvModeTickerSpeed === "fast"}
                        onClick={() => updateSettings({ tvModeTickerSpeed: "fast" })}
                      ></md-filter-chip>
                    </div>
                  </div>

                  {/* Scrolling Ticker Text Size */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3 mt-3">
                    <div>
                      <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                        {t("tvModeTickerSizeLabel" as any)}
                      </span>
                      <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 font-sans">
                        {t("tvModeTickerSizeDesc" as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                      {/* @ts-ignore */}
                      <md-slider
                        min="70"
                        max="130"
                        step="5"
                        value={settings.tvModeTickerSize ?? 100}
                        labeled
                        ticks
                        onChange={(e: any) => updateSettings({ tvModeTickerSize: parseInt(e.target.value) })}
                        className="flex-1"
                      ></md-slider>
                      <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                        {settings.tvModeTickerSize ?? 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 3: LOGO & BRANDING */}
        <div className="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
          <button
            type="button"
            onClick={() => toggleAccordion('logo')}
            className="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                {t("sectionLogoBranding" as any)}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
                openAccordions.logo ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {openAccordions.logo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Mosque Logo Customization Toggle */}
                  <div className="flex items-center justify-between p-1">
                    <div>
                      <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                        {t("mosqueLogoLabel" as any)}
                      </span>
                      <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                        {settings.language === "ms"
                          ? "Muat naik logo masjid anda (Format PNG/JPG) untuk dipaparkan pada kepala Mod TV."
                          : "Upload your mosque logo (PNG/JPG format) to show in the TV Mode header."}
                      </span>
                    </div>
                    {/* @ts-ignore */}
                    <md-switch
                      selected={!!settings.mosqueLogoEnabled}
                      onChange={(e: any) =>
                        updateSettings({ mosqueLogoEnabled: e.target.selected })
                      }
                      icons
                    ></md-switch>
                  </div>

                  {settings.mosqueLogoEnabled && (
                    <div className="space-y-4 pt-2 border-t border-[var(--md-sys-color-outline)]/5">
                      {/* Logo URL Input */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                          {settings.language === "ms" ? "Pautan URL Logo (Pilihan)" : "Logo URL Link (Optional)"}
                        </span>
                        <input
                          type="text"
                          value={settings.mosqueLogoUrl ?? ""}
                          onChange={(e) => updateSettings({ mosqueLogoUrl: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="w-full px-4 py-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] outline-none transition-all placeholder-[var(--md-sys-color-on-surface-variant)]/30 font-sans font-medium search-focus-ring"
                        />
                      </div>

                      {/* File Uploader */}
                      <div className="flex flex-col space-y-2">
                        <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                          {settings.language === "ms" ? "Atau Muat Naik Fail Imej" : "Or Upload Image File"}
                        </span>
                        <div
                          onClick={() => logoFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center w-full aspect-[21/6] bg-[var(--md-sys-color-surface-container-high)] border-2 border-dashed border-[var(--md-sys-color-outline)]/20 hover:border-[var(--md-sys-color-primary)] rounded-xl cursor-pointer relative overflow-hidden group transition-all p-3"
                        >
                          {previewLogoUrl ? (
                            <div className="flex items-center gap-3 w-full h-full justify-center">
                              <img src={previewLogoUrl} alt="Mosque logo preview" className="h-10 object-contain" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-primary)]">
                                {settings.language === "ms" ? "Tukar Gambar" : "Change Image"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Upload size={16} className="mb-1 text-[var(--md-sys-color-on-surface-variant)] group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                                {settings.language === "ms" ? "Pilih Fail Logo" : "Choose Logo File"}
                              </span>
                            </div>
                          )}
                        </div>

                        {previewLogoUrl && !settings.mosqueLogoUrl && (
                          <button
                            type="button"
                            onClick={handleClearLogo}
                            className="px-4 py-2 bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all w-full flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            {t("deleteLogo" as any)}
                          </button>
                        )}

                        <input
                          type="file"
                          ref={logoFileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </div>

                      {/* Logo Customization Fields */}
                      <div className="space-y-4 pt-3 border-t border-[var(--md-sys-color-outline)]/5">
                        {/* Shape */}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                            {t("logoShapeLabel" as any)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(['original', 'circle', 'square', 'rounded'] as const).map(shape => (
                              /* @ts-ignore */
                              <md-filter-chip
                                key={shape}
                                label={
                                  shape === 'original' ? t("logoShapeOriginal" as any) :
                                  shape === 'circle' ? t("logoShapeCircle" as any) :
                                  shape === 'square' ? t("logoShapeSquare" as any) :
                                  t("logoShapeRounded" as any)
                                }
                                selected={(settings.mosqueLogoShape || 'original') === shape}
                                onClick={() => updateSettings({ mosqueLogoShape: shape })}
                              ></md-filter-chip>
                            ))}
                          </div>
                        </div>

                        {/* Background color */}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                            {t("logoBgModeLabel" as any)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(['transparent', 'white', 'theme-container', 'theme-primary'] as const).map(bg => (
                              /* @ts-ignore */
                              <md-filter-chip
                                key={bg}
                                label={
                                  bg === 'transparent' ? t("logoBgTransparent" as any) :
                                  bg === 'white' ? t("logoBgWhite" as any) :
                                  bg === 'theme-container' ? t("logoBgThemeContainer" as any) :
                                  t("logoBgThemePrimary" as any)
                                }
                                selected={(settings.mosqueLogoBgMode || 'transparent') === bg}
                                onClick={() => updateSettings({ mosqueLogoBgMode: bg })}
                              ></md-filter-chip>
                            ))}
                          </div>
                        </div>

                        {/* Blend mode */}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                            {t("logoBlendModeLabel" as any)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(['none', 'multiply', 'screen'] as const).map(blend => (
                              /* @ts-ignore */
                              <md-filter-chip
                                key={blend}
                                label={
                                  blend === 'none' ? t("none") :
                                  blend === 'multiply' ? t("logoBlendMultiply" as any) :
                                  t("logoBlendScreen" as any)
                                }
                                selected={(settings.mosqueLogoBlendMode || 'none') === blend}
                                onClick={() => updateSettings({ mosqueLogoBlendMode: blend })}
                              ></md-filter-chip>
                            ))}
                          </div>
                          <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] leading-normal mt-1 italic opacity-85">
                            {settings.language === 'ms'
                              ? "* Ciri adunan latar belakang menggunakan CSS blend modes untuk membuang warna latar. Sesuai untuk fail JPG tanpa latar lut sinar."
                              : "* Background removal uses CSS blend modes to discard background colors. Ideal for JPG files that lack transparent channels."}
                          </p>
                        </div>

                        {/* Alignment */}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                            {t("logoAlignmentLabel" as any)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(['left', 'right', 'top'] as const).map(align => (
                              /* @ts-ignore */
                              <md-filter-chip
                                key={align}
                                label={
                                  align === 'left' ? t("logoAlignLeft" as any) :
                                  align === 'right' ? t("logoAlignRight" as any) :
                                  t("logoAlignTop" as any)
                                }
                                selected={(settings.mosqueLogoAlignment || 'left') === align}
                                onClick={() => updateSettings({ mosqueLogoAlignment: align })}
                              ></md-filter-chip>
                            ))}
                          </div>
                        </div>

                        {/* Logo Size and Padding Sliders */}
                        <div className="flex flex-col gap-4 bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                              {t("logoSizeLabel" as any)}
                            </span>
                            <div className="flex items-center gap-2 max-w-[200px] w-full justify-end">
                              {/* @ts-ignore */}
                              <md-slider
                                min="32"
                                max="120"
                                step="4"
                                value={settings.mosqueLogoSize ?? 48}
                                labeled
                                ticks
                                onChange={(e: any) => updateSettings({ mosqueLogoSize: parseInt(e.target.value) })}
                                className="flex-1"
                              ></md-slider>
                              <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-12 text-right">
                                {settings.mosqueLogoSize ?? 48}px
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                            <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                              {t("logoPaddingLabel" as any)}
                            </span>
                            <div className="flex items-center gap-2 max-w-[200px] w-full justify-end">
                              {/* @ts-ignore */}
                              <md-slider
                                min="0"
                                max="24"
                                step="2"
                                value={settings.mosqueLogoPadding ?? 0}
                                labeled
                                ticks
                                onChange={(e: any) => updateSettings({ mosqueLogoPadding: parseInt(e.target.value) })}
                                className="flex-1"
                              ></md-slider>
                              <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-12 text-right">
                                {settings.mosqueLogoPadding ?? 0}px
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Live TV Header Mockup Preview */}
                        {previewLogoUrl && (
                          <div className="flex flex-col p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                              {settings.language === "ms" ? "Pratonton Kepala TV Secara Langsung" : "Live TV Header Mock Preview"}
                            </span>
                            
                            <div className="relative p-4 bg-[var(--md-sys-color-surface-container-lowest)]/50 backdrop-blur-xl border border-[var(--md-sys-color-outline-variant)]/20 rounded-2xl w-full overflow-hidden islamic-pattern-overlay min-h-[90px] flex items-center justify-between shadow-inner">
                              {/* Left/Center side depending on alignment */}
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={cn(
                                  "text-sm font-black tracking-tight text-[var(--md-sys-color-primary)] flex items-center transition-all duration-300",
                                  settings.mosqueLogoAlignment === 'top' ? "flex-col items-center gap-1.5 text-center" :
                                  settings.mosqueLogoAlignment === 'right' ? "flex-row-reverse items-center gap-2" :
                                  "flex-row items-center gap-2"
                                )}>
                                  <div
                                    className={cn(
                                      "flex items-center justify-center shrink-0 overflow-hidden shadow-sm transition-all duration-300",
                                      settings.mosqueLogoBgMode === 'white' ? 'bg-white' :
                                      settings.mosqueLogoBgMode === 'theme-container' ? 'bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/10' :
                                      settings.mosqueLogoBgMode === 'theme-primary' ? 'bg-[var(--md-sys-color-primary)]' :
                                      'bg-transparent',
                                      settings.mosqueLogoShape === 'circle' ? 'rounded-full' :
                                      settings.mosqueLogoShape === 'square' ? 'rounded-none' :
                                      settings.mosqueLogoShape === 'rounded' ? 'rounded-lg' :
                                      ''
                                    )}
                                    style={{
                                      width: `${(settings.mosqueLogoSize ?? 48) * 0.7}px`,
                                      height: `${(settings.mosqueLogoSize ?? 48) * 0.7}px`,
                                      padding: `${(settings.mosqueLogoPadding ?? 0) * 0.7}px`,
                                    }}
                                  >
                                    <img
                                      src={previewLogoUrl}
                                      alt="Mosque Logo"
                                      className="max-h-full max-w-full object-contain"
                                      style={{
                                        mixBlendMode: settings.mosqueLogoBlendMode === 'multiply' ? 'multiply' :
                                                       settings.mosqueLogoBlendMode === 'screen' ? 'screen' :
                                                       'normal'
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs truncate max-w-[150px]">{settings.mosqueName || "AlurWaktu TV"}</span>
                                </div>
                                
                                {/* Mini location badge */}
                                <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[9px] font-bold border border-[var(--md-sys-color-outline-variant)]/30">
                                  <MapPin size={10} className="text-[var(--md-sys-color-primary)]" />
                                  <span className="truncate max-w-[80px]">{settings.locationName || t("selectedZone")}</span>
                                </div>
                              </div>

                              {/* Right side: Mock Clock & Date */}
                              <div className="flex flex-col items-end text-right justify-center gap-0.5 font-sans relative z-10">
                                <span className="text-xs font-black tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-1 font-mono">
                                  <Clock size={10} className="text-[var(--md-sys-color-primary)]" />
                                  12:45:00
                                </span>
                                <span className="text-[8px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                                  {settings.language === 'ms' ? 'Jumaat, 12 Jun 2026' : 'Friday, 12 Jun 2026'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 4: CENTER WIDGET */}
        <div className="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
          <button
            type="button"
            onClick={() => toggleAccordion('widget')}
            className="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                {t("sectionCenterWidget" as any)}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
                openAccordions.widget ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {openAccordions.widget && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* TV Reminder rotation interval slider */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3">
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

                  {/* Center Widget Selection */}
                  <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5">
                    <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                      {t("tvModeCenterWidgetLabel" as any)}
                    </span>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                      {settings.language === "ms"
                        ? "Pilih kandungan untuk dipaparkan di lajur tengah. Lajur ketiga akan dibuka dan reka letak TV diselaraskan secara automatik."
                        : "Choose what content to display in the center column. The third column will open and the TV layout adapts automatically."}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("widgetNone" as any)}
                        selected={settings.tvModeCenterWidget === "none" || !settings.tvModeCenterWidget}
                        onClick={() => updateSettings({ tvModeCenterWidget: "none" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("widgetReminders" as any)}
                        selected={settings.tvModeCenterWidget === "reminders"}
                        onClick={() => updateSettings({ tvModeCenterWidget: "reminders" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("widgetSlideshow" as any)}
                        selected={settings.tvModeCenterWidget === "slideshow"}
                        onClick={() => updateSettings({ tvModeCenterWidget: "slideshow" })}
                      ></md-filter-chip>
                      {/* @ts-ignore */}
                      <md-filter-chip
                        label={t("widgetCamera" as any)}
                        selected={settings.tvModeCenterWidget === "camera"}
                        onClick={() => updateSettings({ tvModeCenterWidget: "camera" })}
                      ></md-filter-chip>
                    </div>
                  </div>

                  {/* Conditional Settings based on Center Widget */}
                  {settings.tvModeCenterWidget === "slideshow" && (
                    <div className="space-y-4">
                      <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5">
                        <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                          {t("tvModeSlideshowUrlsLabel" as any)}
                        </span>
                        <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                          {settings.language === "ms"
                            ? "Masukkan URL imej poster atau banner untuk paparan slaid (Satu per baris)."
                            : "Enter image URLs for posters or banners to display (One per line)."}
                        </span>
                        <textarea
                          rows={4}
                          value={settings.tvModeSlideshowUrls ?? ""}
                          onChange={(e) => updateSettings({ tvModeSlideshowUrls: e.target.value })}
                          placeholder="https://example.com/poster1.jpg&#10;https://example.com/poster2.jpg"
                          className="w-full mt-3 p-4 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none transition-all placeholder-[var(--md-sys-color-on-surface-variant)]/30 resize-y font-sans font-medium"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 gap-3">
                        <div>
                          <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                            {t("tvModeSlideshowIntervalLabel" as any)}
                          </span>
                          <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5">
                            {settings.language === "ms" ? "Sela masa antara gambar slaid." : "Duration between slide transitions."}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 max-w-[250px] w-full self-end sm:self-auto justify-end">
                          {/* @ts-ignore */}
                          <md-slider
                            min="5"
                            max="60"
                            step="5"
                            value={settings.tvModeSlideshowInterval ?? 15}
                            labeled
                            ticks
                            onChange={(e: any) => updateSettings({ tvModeSlideshowInterval: e.target.value })}
                            className="flex-1"
                          ></md-slider>
                          <span className="w-12 text-right font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums text-sm">
                            {settings.tvModeSlideshowInterval ?? 15}s
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {settings.tvModeCenterWidget === "camera" && (
                    <div className="flex flex-col p-4 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline)]/5 space-y-4">
                      <div>
                        <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm block">
                          {t("cameraSelectLabel" as any)}
                        </span>
                        <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block mt-0.5 leading-relaxed">
                          {settings.language === "ms"
                            ? "Pilih peranti kamera/webcam daripada PC/Laptop anda untuk memaparkan suapan langsung penceramah."
                            : "Select a camera/webcam device from your PC/Laptop to display live speaker stream."}
                        </span>
                      </div>

                      {cameraPermissionStatus !== 'granted' ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-[var(--md-sys-color-surface-container)] rounded-2xl text-center space-y-3">
                          <AlertCircle size={24} className="text-[var(--md-sys-color-warning)]" />
                          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                            {t("cameraNoPermission" as any)}
                          </p>
                          <button
                            type="button"
                            onClick={() => checkCameraPermissionsAndLoad(true)}
                            className="px-4 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
                          >
                            {t("cameraAccessBtn" as any)}
                          </button>
                        </div>
                      ) : (
                        <select
                          value={settings.tvModeCameraDeviceId ?? ""}
                          onChange={(e) => updateSettings({ tvModeCameraDeviceId: e.target.value })}
                          className="w-full px-4 py-3 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] outline-none transition-all font-sans font-medium"
                        >
                          <option value="">-- {t("cameraNotSelected" as any)} --</option>
                          {videoDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 5: REMINDERS MANAGER */}
        <div className="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
          <button
            type="button"
            onClick={() => toggleAccordion('reminders')}
            className="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Heart size={18} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
                {t("sectionRemindersManager" as any)}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
                openAccordions.reminders ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {openAccordions.reminders && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Reminder Summary & Bulk Actions Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-2xl border border-[var(--md-sys-color-outline)]/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-[var(--md-sys-color-on-surface)]">
                        {countText}
                      </span>
                      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">
                        {settings.language === "ms"
                          ? "Urus peringatan tersuai anda. Setiap peringatan boleh dihias mengikut kategori masing-masing."
                          : "Manage your custom reminders. Each reminder can be styled differently based on its category."}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleBulkToggleReminders}
                        disabled={remindersList.length === 0}
                        className="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("bulkToggleAll" as any)}
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAllReminders}
                        disabled={remindersList.length === 0}
                        className="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("collapseAll" as any)}
                      </button>
                      <button
                        type="button"
                        onClick={handleExpandAllReminders}
                        disabled={remindersList.length === 0}
                        className="px-2.5 py-1 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t("expandAll" as any)}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddReminder}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                      >
                        <Plus size={10} />
                        {t("addReminderBtn" as any)}
                      </button>
                    </div>
                  </div>

                  {/* Reminders List & Empty State */}
                  {remindersList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline)]/10 rounded-2xl text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                        <BookOpen size={20} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                          {t("noRemindersTitle" as any)}
                        </h5>
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1 max-w-[240px]">
                          {t("noRemindersDesc" as any)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddReminder}
                        className="flex items-center gap-1 px-4 py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold transition-all hover:opacity-90 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <Plus size={14} />
                        {t("addReminderBtn" as any)}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {remindersList.map((reminder, idx) => {
                        const isCollapsed = !!collapsedReminders[reminder.id];
                        const { cardClass, badgeClass } = getCategoryStyles(reminder.type, reminder.enabled !== false);
                        return (
                          <div
                            key={reminder.id}
                            className={cn(
                              "rounded-2xl border transition-all duration-300 relative overflow-hidden",
                              cardClass
                            )}
                          >
                            {/* Reminder Card Header */}
                            <div className="flex items-center justify-between p-3 gap-2 bg-[var(--md-sys-color-surface-container-high)]/50 rounded-t-2xl border-b border-[var(--md-sys-color-outline)]/5">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Grab Handle */}
                                <div className="text-[var(--md-sys-color-on-surface-variant)]/50 select-none cursor-grab flex items-center justify-center">
                                  <GripVertical size={16} />
                                </div>
                                <span className="text-xs font-black text-[var(--md-sys-color-primary)]">
                                  #{idx + 1}
                                </span>
                                {/* Type Badge */}
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                  badgeClass
                                )}>
                                  {reminder.type}
                                </span>
                                {/* Collapsed Preview Text */}
                                {isCollapsed && (
                                  <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] truncate max-w-[120px] sm:max-w-[200px] ml-1">
                                    {reminder.title || reminder.text}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Enabled switch */}
                                {/* @ts-ignore */}
                                <md-switch
                                  selected={reminder.enabled !== false}
                                  onChange={(e: any) => handleUpdateReminder(reminder.id, { enabled: e.target.selected })}
                                  icons
                                  className="scale-[0.8] origin-right"
                                ></md-switch>

                                {/* Move buttons */}
                                <div className="flex items-center gap-0.5 border-l border-[var(--md-sys-color-outline)]/10 pl-1.5">
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveReminder(idx, 'up')}
                                    className={cn(
                                      "p-1 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full transition-all cursor-pointer",
                                      idx === 0 && "opacity-30 cursor-not-allowed"
                                    )}
                                    title={t("moveUp" as any)}
                                  >
                                    <ChevronUp size={14} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    disabled={idx === remindersList.length - 1}
                                    onClick={() => handleMoveReminder(idx, 'down')}
                                    className={cn(
                                      "p-1 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full transition-all cursor-pointer",
                                      idx === remindersList.length - 1 && "opacity-30 cursor-not-allowed"
                                    )}
                                    title={t("moveDown" as any)}
                                  >
                                    <ChevronDown size={14} />
                                  </motion.button>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-0.5 border-l border-[var(--md-sys-color-outline)]/10 pl-1.5">
                                  {/* Duplicate */}
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => handleDuplicateReminder(reminder)}
                                    className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full transition-all cursor-pointer"
                                    title={t("duplicateReminder" as any)}
                                  >
                                    <Copy size={14} />
                                  </motion.button>
                                  {/* Collapse/Expand toggle */}
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => toggleReminderCollapse(reminder.id)}
                                    className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full transition-all cursor-pointer"
                                    title={isCollapsed ? t("expandAll" as any) : t("collapseAll" as any)}
                                  >
                                    <ChevronDown size={14} className={cn("transition-transform duration-200", !isCollapsed && "rotate-180")} />
                                  </motion.button>
                                  {/* Delete */}
                                  <motion.button
                                    whileHover={{ scale: 1.15, backgroundColor: "var(--md-sys-color-error-container)" }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => handleDeleteReminder(reminder.id)}
                                    className="p-1 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)]/30 rounded-full transition-all cursor-pointer"
                                    title={t("delete" as any)}
                                  >
                                    <Trash2 size={14} />
                                  </motion.button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Editing Fields */}
                            {!isCollapsed && (
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Title */}
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1">
                                      {t("reminderTitleLabel" as any)}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={t("reminderTitleLabel" as any)}
                                      value={reminder.title ?? ""}
                                      onChange={(e) => handleUpdateReminder(reminder.id, { title: e.target.value })}
                                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none focus:border-[var(--md-sys-color-primary)] font-sans font-medium search-focus-ring animate-all duration-300"
                                    />
                                  </div>
                                  {/* Type */}
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1">
                                      {settings.language === "ms" ? "Kategori" : "Category"}
                                    </span>
                                    <select
                                      value={reminder.type}
                                      onChange={(e) => handleUpdateReminder(reminder.id, { type: e.target.value as any })}
                                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none font-bold search-focus-ring animate-all duration-300"
                                    >
                                      <option value="hadith">{t("reminderTypeHadith" as any)}</option>
                                      <option value="quran">{t("reminderTypeQuran" as any)}</option>
                                      <option value="warning">{t("reminderTypeWarning" as any)}</option>
                                      <option value="info">{t("reminderTypeInfo" as any)}</option>
                                      <option value="donation">{t("reminderTypeDonation" as any)}</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Text */}
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1">
                                    {settings.language === "ms" ? "Teks Kandungan" : "Content Text"}
                                  </span>
                                  <textarea
                                    rows={2}
                                    placeholder={t("reminderTextLabel" as any)}
                                    value={reminder.text}
                                    onChange={(e) => handleUpdateReminder(reminder.id, { text: e.target.value })}
                                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none focus:border-[var(--md-sys-color-primary)] resize-y font-sans font-medium search-focus-ring animate-all duration-300"
                                  />
                                </div>

                                {reminder.type === 'donation' && (
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)] mb-1">
                                      {t("reminderImageUrlLabel" as any)}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={t("reminderImageUrlLabel" as any)}
                                      value={reminder.imageUrl ?? ""}
                                      onChange={(e) => handleUpdateReminder(reminder.id, { imageUrl: e.target.value })}
                                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)]/10 outline-none focus:border-[var(--md-sys-color-primary)] font-sans font-medium search-focus-ring animate-all duration-300"
                                    />
                                  </div>
                                )}

                                {/* Duration */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-[var(--md-sys-color-outline)]/5">
                                  <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                                    {t("reminderDurationLabel" as any)}
                                  </span>
                                  <div className="flex items-center gap-2 max-w-[200px] w-full justify-end">
                                    {/* @ts-ignore */}
                                    <md-slider
                                      min="5"
                                      max="120"
                                      step="5"
                                      value={reminder.duration ?? settings.tvModeReminderInterval ?? 15}
                                      labeled
                                      ticks
                                      onChange={(e: any) => handleUpdateReminder(reminder.id, { duration: parseInt(e.target.value) })}
                                      className="flex-1"
                                    ></md-slider>
                                    <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-8 text-right">
                                      {reminder.duration ?? settings.tvModeReminderInterval ?? 15}s
                                    </span>
                                  </div>
                                </div>

                                {/* Live Preview */}
                                <div className="rounded-xl border border-[var(--md-sys-color-outline)]/10 p-3 bg-[var(--md-sys-color-surface-container-high)] text-center space-y-1 relative overflow-hidden">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]/60 block text-left mb-1.5 relative z-10">
                                    {settings.language === "ms" ? "Pratonton Kad" : "Card Live Preview"}
                                  </span>
                                  <div className={cn(
                                    "p-4 rounded-2xl flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[100px] border shadow-sm w-full transition-colors",
                                    reminder.type === 'hadith' ? "bg-[var(--md-sys-color-primary-container)]/10 border-[var(--md-sys-color-primary)]/20 shadow-[0_0_15px_-3px_rgba(168,85,247,0.15)]" :
                                    reminder.type === 'quran' ? "bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]" :
                                    reminder.type === 'warning' ? "bg-[var(--md-sys-color-error-container)]/5 border-[var(--md-sys-color-error)]/25 shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)]" :
                                    reminder.type === 'info' ? "bg-blue-500/5 border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]" :
                                    "bg-rose-500/5 border-rose-500/20 flex-row justify-between items-center text-left shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]"
                                  )}>
                                    {/* Repeating Islamic geometric pattern background overlay */}
                                    <div className="absolute inset-0 islamic-pattern-overlay opacity-[0.07] pointer-events-none z-0" />
                                    
                                    {reminder.type === 'donation' ? (
                                      <>
                                        <div className="flex-1 flex flex-col justify-center items-start relative z-10">
                                          <Heart size={20} className="text-rose-500 mb-1.5 stroke-[2]" />
                                          <span className="text-[9px] uppercase tracking-wider font-bold text-rose-500 mb-0.5">
                                            {settings.language === 'ms' ? 'SUMBANGAN' : 'DONATION'}
                                          </span>
                                          {reminder.title && <h5 className="text-xs font-black text-[var(--md-sys-color-on-surface)] leading-tight">{reminder.title}</h5>}
                                          <p className="text-[10px] font-medium text-[var(--md-sys-color-on-surface-variant)] leading-normal mt-0.5">{reminder.text}</p>
                                        </div>
                                        {reminder.imageUrl && (
                                          <div className="w-12 h-12 bg-white p-1 rounded-lg border border-[var(--md-sys-color-outline)]/10 flex items-center justify-center shrink-0 relative z-10">
                                            <img src={reminder.imageUrl} className="w-full h-full object-contain" alt="QR" />
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {reminder.type === 'hadith' && <BookOpen size={20} className="text-purple-500 mb-1.5 stroke-[2] relative z-10" />}
                                        {reminder.type === 'quran' && <Sparkles size={20} className="text-amber-500 mb-1.5 stroke-[2] relative z-10" />}
                                        {reminder.type === 'warning' && <VolumeX size={20} className="text-orange-500 mb-1.5 stroke-[2] relative z-10" />}
                                        {reminder.type === 'info' && <Tv size={20} className="text-blue-500 mb-1.5 stroke-[2] relative z-10" />}
                                        <span className={cn(
                                          "text-[9px] uppercase tracking-widest font-black mb-1 relative z-10",
                                          reminder.type === 'hadith' ? "text-purple-650 dark:text-purple-400" :
                                          reminder.type === 'quran' ? "text-amber-600 dark:text-amber-400" :
                                          reminder.type === 'warning' ? "text-orange-650 dark:text-orange-400" :
                                          "text-blue-600 dark:text-blue-400"
                                        )}>
                                          {reminder.type === 'hadith' ? (settings.language === 'ms' ? 'HADITH' : 'AUTHENTIC HADITH') :
                                           reminder.type === 'quran' ? (settings.language === 'ms' ? 'AL-QURAN' : 'AL-QURAN REVELATION') :
                                           reminder.type === 'warning' ? (settings.language === 'ms' ? 'PERINGATAN MESRA' : 'KIND REMINDER') :
                                           (settings.language === 'ms' ? 'MAKLUMAN MASJID' : 'ANNOUNCEMENT')}
                                        </span>
                                        <p className={cn(
                                          "text-xs leading-relaxed max-w-xs font-medium relative z-10",
                                          reminder.type === 'warning' ? "font-bold text-[var(--md-sys-color-on-surface)]" : "italic font-serif text-[var(--md-sys-color-on-surface-variant)]"
                                        )}>
                                          "{reminder.text}"
                                        </p>
                                        {reminder.title && (
                                          <span className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] mt-1.5 bg-[var(--md-sys-color-surface)] px-2 py-0.5 rounded-full border border-[var(--md-sys-color-outline)]/10 relative z-10">
                                            {reminder.title}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
