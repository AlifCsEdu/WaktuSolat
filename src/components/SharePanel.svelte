<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import {
    X, Copy, Check, Share2, MessageCircle, Send, ChevronDown, ChevronLeft,
    ChevronRight, Link2, ExternalLink, Search, Download, QrCode, Sparkles,
    Image as ImageIcon, MapPin, Calendar, ClipboardCheck,
  } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import { JAKIM_ZONES } from "../lib/zones";
  import "@material/web/iconbutton/icon-button.js";
  import "@material/web/icon/icon.js";
  import "@material/web/textfield/outlined-text-field.js";
  import "@material/web/button/text-button.js";
  import "@material/web/tabs/tabs.js";
  import "@material/web/tabs/primary-tab.js";
  import { appSettings } from "../state/settings.svelte";
  import { getHijriFormatted } from "../lib/holidays";
  import { QRCode } from "../lib/qr";
  import { StorageManager } from "../lib/StorageManager";
  import { sanitizeInput } from "../lib/security";

  interface SharePanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentZone: string;
    currentZoneData: any;
  }

  let { isOpen, onClose, currentZone, currentZoneData }: SharePanelProps = $props();

  function getZoneLabel(zoneCode: string): string {
    for (const state of JAKIM_ZONES) {
      for (const z of state.zones) {
        if (z.v === zoneCode) return z.l;
      }
    }
    return zoneCode;
  }

  function getStateLabel(zoneCode: string): string {
    for (const state of JAKIM_ZONES) {
      for (const z of state.zones) {
        if (z.v === zoneCode) return state.state;
      }
    }
    return "";
  }

  function buildShareUrl(zone: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}?zone=${zone}`;
  }

  // Canvas dynamic text-wrapping helper
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    let linesCount = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
        linesCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return linesCount + 1;
  }

  const t = (k: any, p?: any) => appSettings.t(k, p);
  let settings = $derived(appSettings.settings);
  let visualStyle = $derived(settings.visualStyle);
  let iconStroke = $derived(visualStyle === 'retro' ? 3 : visualStyle === 'glass' || visualStyle === 'soft' ? 1.5 : 2);

  let isMalay = $derived(settings.language === "ms");
  // svelte-ignore state_referenced_locally
  let shareZone = $state(currentZone);
  let copied = $state(false);
  let showZonePicker = $state(false);
  let searchQuery = $state("");
  let activeTab = $state<"link" | "image" | "qr">("link");

  let copyImageState = $state<"idle" | "success" | "error">("idle");
  let dayOffset = $state(0);

  let fetchedData = $state<any[] | null>(null);
  let loadingData = $state(false);

  $effect(() => {
    if (isOpen) {
      shareZone = currentZone;
      activeTab = "link";
      searchQuery = "";
      showZonePicker = false;
      copyImageState = "idle";
      dayOffset = 0;
    }
  });

  $effect(() => {
    if (!isOpen) return;

    let active = true;
    const fetchZoneData = async () => {
      loadingData = true;
      try {
        const cached = StorageManager.getCachedPrayerData(shareZone);
        if (active && cached && cached.length > 0) {
          fetchedData = cached;
          loadingData = false;
          return;
        }

        const res = await fetch(`/api/solat/${shareZone}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active && data && data.prayerTime) {
          fetchedData = data.prayerTime;
          StorageManager.setCachedPrayerData(shareZone, data.prayerTime);
        }
      } catch (err) {
        console.error("Failed to load preview zone data:", err);
      } finally {
        if (active) loadingData = false;
      }
    };

    fetchZoneData();
    return () => {
      active = false;
    };
  });

  let targetDate = $derived.by(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  });

  let formattedDateString = $derived.by(() => {
    const day = String(targetDate.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    return `${day}-${month}-${year}`;
  });

  let previewTodayData = $derived.by(() => {
    const targetFormatted = formattedDateString;
    if (fetchedData) {
      return fetchedData.find((d: any) => d.date === targetFormatted) || null;
    }
    if (shareZone === currentZone && dayOffset === 0) {
      return currentZoneData;
    }
    const cached = StorageManager.getCachedPrayerData(shareZone);
    if (cached && cached.length > 0) {
      return cached.find((d: any) => d.date === targetFormatted) || cached[0] || null;
    }
    return null;
  });

  let activeKeys = $derived.by(() => {
    const rawKeys = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];
    return rawKeys.filter((k) => k !== "imsak" && k !== "syuruk" || settings.trackImsak);
  });

  let shareUrl = $derived(buildShareUrl(shareZone));
  let shareTitle = $derived(
    isMalay
      ? `Waktu Solat ${shareZone} — ${getZoneLabel(shareZone)}`
      : `Prayer Times ${shareZone} — ${getZoneLabel(shareZone)}`
  );
  let shareText = $derived(
    isMalay
      ? `Lihat waktu solat terkini untuk ${getZoneLabel(shareZone)} di AlurWaktu.`
      : `Check the latest prayer times for ${getZoneLabel(shareZone)} on AlurWaktu.`
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const drawPostcard = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not construct 2D context");

    const width = 800;
    const height = 1000;
    const scale = 2;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const getCssVar = (name: string, fallback: string): string => {
      if (typeof window === "undefined") return fallback;
      const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return val || fallback;
    };

    const colorPrimary = getCssVar("--md-sys-color-primary", "#6750A4");
    const colorOnPrimary = getCssVar("--md-sys-color-on-primary", "#FFFFFF");
    const colorPrimaryContainer = getCssVar("--md-sys-color-primary-container", "#EADDFF");
    const colorSecondaryContainer = getCssVar("--md-sys-color-secondary-container", "#E8DEF8");
    const colorOnSecondaryContainer = getCssVar("--md-sys-color-on-secondary-container", "#1D192B");
    const colorTertiary = getCssVar("--md-sys-color-tertiary", "#7D5260");
    const colorSurface = getCssVar("--md-sys-color-surface", "#FEF7FF");
    const colorSurfaceContainer = getCssVar("--md-sys-color-surface-container", "#F3EDF7");
    const colorSurfaceContainerHigh = getCssVar("--md-sys-color-surface-container-high", "#ECE6F0");
    const colorSurfaceContainerLow = getCssVar("--md-sys-color-surface-container-low", "#F7F2FA");
    const colorOnSurface = getCssVar("--md-sys-color-on-surface", "#1D1B20");
    const colorOnSurfaceVariant = getCssVar("--md-sys-color-on-surface-variant", "#49454F");
    const colorOutline = getCssVar("--md-sys-color-outline", "#79747E");

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, colorPrimaryContainer);
    bgGrad.addColorStop(0.35, colorSurfaceContainerLow);
    bgGrad.addColorStop(1, colorSurfaceContainerHigh);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = colorOutline;
    ctx.globalAlpha = 0.08;
    for (let x = 30; x < width; x += 40) {
      for (let y = 30; y < height; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.textAlign = "left";
    ctx.fillStyle = colorOnSurfaceVariant;
    ctx.globalAlpha = 0.7;
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("ALURWAKTU", 75, 75);
    ctx.globalAlpha = 1.0;

    const zoneName = getZoneLabel(shareZone);
    const stateName = getStateLabel(shareZone);
    const maxLabelLen = 28;
    const truncatedZoneName = zoneName.length > maxLabelLen ? zoneName.slice(0, maxLabelLen) + "..." : zoneName;

    ctx.fillStyle = colorPrimary;
    ctx.font = "900 64px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.fillText(shareZone, 75, 148);

    ctx.fillStyle = colorOnSurface;
    ctx.font = "bold 24px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "0px";
    ctx.fillText(truncatedZoneName, 75, 192);

    ctx.fillStyle = colorOnSurfaceVariant;
    ctx.globalAlpha = 0.8;
    ctx.font = "bold 12px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText(stateName.toUpperCase(), 75, 222);
    ctx.globalAlpha = 1.0;

    const badgeW = 80;
    const badgeH = 28;
    const badgeX = width - 75 - badgeW;
    const badgeY = 53;

    ctx.fillStyle = colorPrimary;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fill();
    
    ctx.strokeStyle = colorPrimary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = colorOnPrimary;
    ctx.font = "bold 10px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(isMalay ? "POSTER" : "CARD", badgeX + badgeW / 2, badgeY + 17);

    const datesY = 258;
    const datePillW = 380;
    const datePillH = 80;
    const datePillX = width / 2 - datePillW / 2;

    ctx.fillStyle = colorSecondaryContainer;
    ctx.beginPath();
    ctx.roundRect(datePillX, datesY, datePillW, datePillH, 20);
    ctx.fill();
    ctx.strokeStyle = colorOutline;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    const gregDateStr = targetDate.toLocaleDateString(isMalay ? "ms-MY" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const rawGreg = previewTodayData?.date || targetDate.toISOString();
    const hijriDateStr = getHijriFormatted(rawGreg, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, previewTodayData?.hijri).split(" (")[0];

    ctx.textAlign = "center";
    ctx.fillStyle = colorOnSecondaryContainer;
    ctx.font = "bold 18px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.fillText(`📅 ${gregDateStr}`, width / 2, datesY + 34);

    if (hijriDateStr) {
      ctx.fillStyle = colorTertiary;
      ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
      ctx.fillText(hijriDateStr, width / 2, datesY + 60);
    }

    const tableY = 368;
    const tableWidth = 650;
    const tableHeight = 470;
    const tableX = width / 2 - tableWidth / 2;

    ctx.fillStyle = colorSurfaceContainer;
    ctx.beginPath();
    ctx.roundRect(tableX, tableY, tableWidth, tableHeight, 32);
    ctx.fill();
    ctx.strokeStyle = colorOutline;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    const rowHeight = tableHeight / activeKeys.length;

    activeKeys.forEach((key, idx) => {
      const rowY = tableY + idx * rowHeight;
      const rawTime = previewTodayData ? previewTodayData[key] : "--:--";
      let formattedTime = rawTime;
      if (rawTime && rawTime !== "--:--") {
        try {
          const [hStr, mStr] = rawTime.split(":");
          const hr = parseInt(hStr, 10);
          if (settings.timeFormat === "12h") {
            const period = hr >= 12 ? "PM" : "AM";
            const displayHr = hr % 12 === 0 ? 12 : hr % 12;
            formattedTime = `${String(displayHr).padStart(2, "0")}:${mStr} ${period}`;
          } else {
            formattedTime = `${hStr}:${mStr}`;
          }
        } catch {
          formattedTime = rawTime;
        }
      }

      const pLabel = (isMalay ? t(key as any) : key).toUpperCase();

      ctx.textAlign = "left";
      ctx.fillStyle = colorOnSurfaceVariant;
      ctx.font = "bold 20px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
      ctx.letterSpacing = "1.5px";
      ctx.fillText(pLabel, tableX + 50, rowY + rowHeight / 2 + 7);

      ctx.textAlign = "right";
      ctx.fillStyle = colorOnSurface;
      ctx.font = "900 22px 'JetBrains Mono', monospace, sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText(formattedTime, tableX + tableWidth - 50, rowY + rowHeight / 2 + 7);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = colorOnSurfaceVariant;
    ctx.globalAlpha = 0.5;
    ctx.font = "bold 13px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("ALURWAKTU.PAGES.DEV", width / 2, 905);
    ctx.globalAlpha = 1.0;

    return canvas;
  };

  const handleDownloadImage = async () => {
    try {
      const canvas = await drawPostcard();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `AlurWaktu_Share_${shareZone}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Postcard download failed:", err);
    }
  };

  const handleCopyImageToClipboard = async () => {
    try {
      const canvas = await drawPostcard();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          copyImageState = "error";
          return;
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const data = [new ClipboardItem({ "image/png": blob })];
            await navigator.clipboard.write(data);
            copyImageState = "success";
            setTimeout(() => (copyImageState = "idle"), 2500);
          } else {
            copyImageState = "error";
            setTimeout(() => (copyImageState = "idle"), 2500);
          }
        } catch (err) {
          console.error("Clipboard write error:", err);
          copyImageState = "error";
          setTimeout(() => (copyImageState = "idle"), 2500);
        }
      }, "image/png");
    } catch (err) {
      console.error("Copy image failed:", err);
      copyImageState = "error";
      setTimeout(() => (copyImageState = "idle"), 2500);
    }
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        if (navigator.canShare && activeTab === "image") {
          const canvas = await drawPostcard();
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `AlurWaktu_${shareZone}.png`, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: shareTitle,
                text: shareText,
              });
            } else {
              await navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl,
              });
            }
          });
        } else {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
        }
      } catch {
        // Cancelled
      }
    }
  };

  let filteredZones = $derived.by(() => {
    if (!searchQuery.trim()) {
      return JAKIM_ZONES;
    }
    const q = searchQuery.toLowerCase();
    return JAKIM_ZONES.map((state) => {
      const matched = state.zones.filter(
        (z) =>
          z.v.toLowerCase().includes(q) ||
          z.l.toLowerCase().includes(q) ||
          state.state.toLowerCase().includes(q)
      );
      return {
        ...state,
        zones: matched,
      };
    }).filter((state) => state.zones.length > 0);
  });

  let qrMatrix = $derived.by(() => {
    if (activeTab !== "qr") return null;
    try {
      const qr = new QRCode(shareUrl);
      return qr.getModules();
    } catch (e) {
      console.error("QR Code calculation error:", e);
      return null;
    }
  });

  function onTabClick(tab: "link" | "image" | "qr") {
    activeTab = tab;
  }
</script>

{#if isOpen}
  <div
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
    class="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    style="isolation: isolate"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="absolute inset-0 bg-black/85 backdrop-blur-sm" onclick={onClose}></div>

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:fly={{ y: 80, duration: 220, opacity: 0 }}
      out:fly={{ y: 60, duration: 220, opacity: 0 }}
      onclick={(e) => e.stopPropagation()}
      class={cn(
        "relative bg-[var(--md-sys-color-surface-container)] w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl shadow-black/60 flex flex-col max-h-[96vh] sm:max-h-[88vh] transition-all",
        visualStyle === "retro" && "border-[3px] border-[var(--md-sys-color-on-surface)] shadow-[6px_6px_0px_0px_var(--md-sys-color-on-surface)] rounded-none",
        visualStyle === "glass" && "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)]",
        visualStyle === "soft" && "shadow-[var(--soft-shadow-heavy)] rounded-t-[40px] sm:rounded-[40px] border border-white/5"
      )}
    >
      <div class="flex justify-center pt-2.5 pb-1 sm:hidden">
        <div class="w-12 h-1.5 rounded-full bg-[var(--md-sys-color-outline)]/20"></div>
      </div>

      <div class="flex items-center justify-between px-5 py-2 sm:px-6 sm:pt-4 sm:pb-3 border-b border-[var(--md-sys-color-outline)]/10 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)]/10 flex items-center justify-center relative overflow-hidden group">
            <div class="animate-spin" style="animation-duration: 4.5s; animation-direction: alternate;">
              <Share2 size={20} class="text-[var(--md-sys-color-primary)] relative z-10" />
            </div>
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-black tracking-tight text-[var(--md-sys-color-on-surface)]">
              {t("shareHeader")}
            </h3>
            <p class="text-[9px] text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider font-bold">
              {t("shareSubheader")}
            </p>
          </div>
        </div>
        <md-icon-button onclick={onClose}>
          <md-icon>close</md-icon>
        </md-icon-button>
      </div>

      <div class="px-5 py-2.5 sm:px-6 border-b border-[var(--md-sys-color-outline)]/8 bg-[var(--md-sys-color-surface-container-low)] shrink-0">
        <div class="flex items-center justify-between gap-3 mb-1">
          <span class="text-[9px] uppercase tracking-widest font-black text-[var(--md-sys-color-primary)] flex items-center gap-1.5">
            <MapPin size={11} class="text-[var(--md-sys-color-primary)]" />
            {t("selectShareZone")}
          </span>
          {#if shareZone !== currentZone}
            <md-text-button onclick={() => (shareZone = currentZone)}>
              {t("resetDefault")}
            </md-text-button>
          {/if}
        </div>

        <button
          onclick={() => (showZonePicker = !showZonePicker)}
          class={cn(
            "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/12 text-left transition-all hover:ring-[var(--md-sys-color-primary)]/40 shadow-sm cursor-pointer",
            visualStyle === "retro" && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)] ring-0 rounded-none",
            visualStyle === "soft" && "rounded-2xl"
          )}
        >
          <div class="flex-1 min-w-0">
            <span class="font-black text-xs sm:text-sm text-[var(--md-sys-color-primary)]">
              {shareZone}
            </span>
            <span class="text-[11px] sm:text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] ml-3 truncate">
              {getZoneLabel(shareZone)} ({getStateLabel(shareZone)})
            </span>
          </div>
          <ChevronDown
            size={15}
            strokeWidth={iconStroke}
            class={cn(
              "text-[var(--md-sys-color-outline)] transition-transform duration-250",
              showZonePicker && "rotate-180"
            )}
          />
        </button>

        {#if showZonePicker}
          <div
            in:fly={{ y: -10, duration: 160, opacity: 0 }}
            out:fly={{ y: -10, duration: 160, opacity: 0 }}
            class="overflow-hidden origin-top"
          >
            <div class="max-h-[250px] sm:max-h-[220px] flex flex-col mt-1.5 rounded-2xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/12 shadow-xl overflow-hidden">
              <div class="px-3 py-2 border-b border-[var(--md-sys-color-outline)]/10 bg-[var(--md-sys-color-surface-container-low)]">
                <md-outlined-text-field
                  value={searchQuery}
                  oninput={(e: any) => (searchQuery = sanitizeInput(e.target.value))}
                  placeholder={t("searchZonePlaceholder")}
                  class="w-full"
                  style="--md-outlined-text-field-container-shape: 28px; --md-sys-color-surface-variant: var(--md-sys-color-surface-container-high);"
                >
                  <div slot="leading-icon"><md-icon>search</md-icon></div>
                  {#if searchQuery}
                    <div slot="trailing-icon">
                      <md-icon-button onclick={() => (searchQuery = "")}>
                        <md-icon>close</md-icon>
                      </md-icon-button>
                    </div>
                  {/if}
                </md-outlined-text-field>
              </div>

              <div class="flex-1 overflow-y-auto divide-y divide-[var(--md-sys-color-outline)]/5 no-scrollbar">
                {#if filteredZones.length > 0}
                  {#each filteredZones as state (state.state)}
                    <div>
                      <div class="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-high)]/40 sticky top-0 backdrop-blur-sm">
                        {state.state}
                      </div>
                      {#each state.zones as z (z.v)}
                        <button
                          onclick={() => {
                            shareZone = z.v;
                            showZonePicker = false;
                            copied = false;
                          }}
                          class={cn(
                            "relative overflow-hidden w-full text-left px-4 py-2.5 text-[11px] flex items-center gap-3 transition-colors hover:bg-[var(--md-sys-color-primary)]/8 cursor-pointer",
                            z.v === shareZone &&
                              "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold"
                          )}
                        >
                          <md-ripple></md-ripple>
                          <span class="font-black text-[11px] text-[var(--md-sys-color-primary)] w-12 shrink-0">
                            {z.v}
                          </span>
                          <span class="truncate text-[11px] text-[var(--md-sys-color-on-surface)]">
                            {z.l}
                          </span>
                        </button>
                      {/each}
                    </div>
                  {/each}
                {:else}
                  <div class="p-6 text-center text-[11px] text-[var(--md-sys-color-outline)] font-bold">
                    {t("noMatchesFound")}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4 no-scrollbar">
        <div class="mb-2 w-full bg-[var(--md-sys-color-surface-container)] rounded-[20px] overflow-hidden">
          <md-tabs activeTabIndex={activeTab === 'link' ? 0 : activeTab === 'image' ? 1 : 2}>
            <md-primary-tab onclick={() => onTabClick('link')}>
              {t("smartLink")}
              <div slot="icon"><md-icon>link</md-icon></div>
            </md-primary-tab>
            <md-primary-tab onclick={() => onTabClick('image')}>
              {t("scheduleCard")}
              <div slot="icon"><md-icon>image</md-icon></div>
            </md-primary-tab>
            <md-primary-tab onclick={() => onTabClick('qr')}>
              {t("offlineQR")}
              <div slot="icon"><md-icon>qr_code_2</md-icon></div>
            </md-primary-tab>
          </md-tabs>
        </div>

        {#if activeTab === "link"}
          <div in:fly={{ y: 8, duration: 200 }} out:fly={{ y: -8, duration: 200 }} class="space-y-3">
            <div class="bg-[var(--md-sys-color-primary)]/8 border border-[var(--md-sys-color-primary)]/15 rounded-2xl p-3.5 flex gap-3 text-xs text-[var(--md-sys-color-on-surface-variant)]">
              <Sparkles size={15} class="text-[var(--md-sys-color-primary)] shrink-0 mt-0.5" />
              <p class="leading-relaxed text-[11px]">
                {t("linkInfoDesc")}
              </p>
            </div>

            <div class="space-y-1">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="text-[9px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] ml-1">
                {t("linkToShare")}
              </label>
              <div class="flex gap-2">
                <div class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] ring-1 ring-[var(--md-sys-color-outline)]/10 min-w-0">
                  <Link2 size={15} class="text-[var(--md-sys-color-outline)] shrink-0" />
                  <span class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono truncate tracking-tight select-all">
                    {shareUrl}
                  </span>
                </div>
                <button
                  onclick={handleCopy}
                  class={cn(
                    "px-3.5 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[11px] shadow-sm transition-all cursor-pointer shrink-0 min-w-[85px] active:scale-95 hover:scale-105",
                    copied
                      ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                      : "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:bg-[var(--md-sys-color-primary)] hover:text-white"
                  )}
                >
                  {#if copied}
                    <Check size={13} strokeWidth={iconStroke} />
                    {t("copied")}
                  {:else}
                    <Copy size={13} strokeWidth={iconStroke} />
                    {t("copy")}
                  {/if}
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="text-[9px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] ml-1 block">
                {t("directShare")}
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  onclick={handleWhatsApp}
                  class="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-[#25D366]/8 text-[#25D366] border border-[#25D366]/15 font-black text-[10px] cursor-pointer hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-transform"
                >
                  <MessageCircle size={18} strokeWidth={iconStroke} />
                  WhatsApp
                </button>
                <button
                  onclick={handleTelegram}
                  class="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-[#0088cc]/8 text-[#0088cc] border border-[#0088cc]/15 font-black text-[10px] cursor-pointer hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Send size={18} strokeWidth={iconStroke} />
                  Telegram
                </button>
                <button
                  onclick={handleSystemShare}
                  disabled={typeof navigator !== "undefined" && !navigator.share}
                  class="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-[var(--md-sys-color-primary-container)]/30 text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-primary)]/10 font-black text-[10px] cursor-pointer disabled:opacity-40 disabled:pointer-events-none hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-transform"
                >
                  <ExternalLink size={18} strokeWidth={iconStroke} />
                  {t("systemShare")}
                </button>
              </div>
            </div>
          </div>
        {:else if activeTab === "image"}
          <div in:fly={{ y: 8, duration: 200 }} out:fly={{ y: -8, duration: 200 }} class="space-y-3">
            <div class="space-y-1">
              <div class="flex items-center justify-between px-1">
                <span class="text-[9px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                  {t("postcardPreview")}
                </span>
                {#if loadingData}
                  <span class="text-[8px] font-black text-[var(--md-sys-color-primary)] animate-pulse uppercase tracking-wider">
                    {t("updating")}
                  </span>
                {/if}
              </div>

              <div class="flex items-center justify-between max-w-[190px] mx-auto mb-2.5 bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/8 rounded-full p-1 shadow-sm">
                <button
                  onclick={() => (dayOffset -= 1)}
                  title={isMalay ? "Hari sebelumnya" : "Previous day"}
                  class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)]/10 cursor-pointer transition-colors hover:scale-110 active:scale-90"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-on-surface)] select-none">
                  {dayOffset === 0
                    ? t("today")
                    : dayOffset === 1
                      ? (isMalay ? "Esok" : "Tomorrow")
                      : dayOffset === -1
                        ? (isMalay ? "Semalam" : "Yesterday")
                        : targetDate.toLocaleDateString(isMalay ? "ms-MY" : "en-US", { day: "numeric", month: "short" })}
                </span>
                <button
                  onclick={() => (dayOffset += 1)}
                  title={isMalay ? "Hari berikutnya" : "Next day"}
                  class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)]/10 cursor-pointer transition-colors hover:scale-110 active:scale-90"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div
                class={cn(
                  "relative rounded-[32px] overflow-hidden text-[var(--md-sys-color-on-surface)] shadow-xl shadow-black/5 border border-[var(--md-sys-color-outline)]/12 select-none bg-gradient-to-br from-[var(--md-sys-color-primary-container)]/18 to-[var(--md-sys-color-surface-container-high)] p-6 aspect-[4/5] flex flex-col justify-between w-full max-w-[260px] xs:max-w-[290px] sm:max-w-[310px] mx-auto transition-all",
                  loadingData && "animate-pulse"
                )}
              >
                <div class="absolute inset-0 bg-grid opacity-[0.03] dark:opacity-[0.06] pointer-events-none"></div>

                <div class="flex justify-between items-start shrink-0 relative z-10 w-full text-left">
                  <div class="flex-1 min-w-0">
                    <span class="text-[9.5px] uppercase tracking-[0.25em] font-black text-[var(--md-sys-color-on-surface-variant)]/80 block">
                      ALURWAKTU
                    </span>
                    <span class="text-2xl sm:text-3xl font-black text-[var(--md-sys-color-primary)] tracking-tight mt-1 block">
                      {shareZone}
                    </span>
                    <h4 class="text-xs sm:text-sm font-black text-[var(--md-sys-color-on-surface)] leading-snug truncate mt-1 max-w-[170px] xs:max-w-[190px] sm:max-w-[210px]">
                      {getZoneLabel(shareZone)}
                    </h4>
                    <span class="text-[9px] text-[var(--md-sys-color-on-surface-variant)]/80 font-bold uppercase tracking-widest mt-0.5 block">
                      {getStateLabel(shareZone)}
                    </span>
                  </div>
                  
                  <div class="px-3 py-1 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border border-[var(--md-sys-color-primary)]/10 text-[8px] font-black tracking-widest uppercase shrink-0 shadow-sm">
                    {isMalay ? "POSTER" : "CARD"}
                  </div>
                </div>

                <div class="my-2 text-center relative z-10 flex justify-center w-full">
                  <div class="inline-flex flex-col items-center py-2 px-4 rounded-2xl bg-[var(--md-sys-color-secondary-container)] border border-[var(--md-sys-color-outline)]/10 min-w-[170px] sm:min-w-[190px] shadow-sm">
                    <span class="text-[10px] sm:text-[11px] font-black text-[var(--md-sys-color-on-secondary-container)] flex items-center gap-1.5 justify-center">
                      <Calendar size={11} class="text-[var(--md-sys-color-on-secondary-container)]/85" />
                      {targetDate.toLocaleDateString(isMalay ? "ms-MY" : "en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {#if previewTodayData?.hijri}
                      <span class="text-[8px] sm:text-[9px] font-black text-[var(--md-sys-color-tertiary)] mt-1 tracking-wide uppercase">
                        {getHijriFormatted(previewTodayData.date, settings.hijriMethod, settings.hijriAdjustment, "text", settings.language as any, previewTodayData?.hijri).split(" (")[0]}
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="bg-[var(--md-sys-color-surface-container)]/95 rounded-[24px] p-4 border border-[var(--md-sys-color-outline)]/10 space-y-1 relative z-10 flex-1 flex flex-col justify-center my-1.5 max-h-[160px] sm:max-h-[185px] shadow-inner">
                  {#if loadingData}
                    <div class="flex flex-col items-center justify-center h-full py-4 space-y-1.5">
                      <div class="w-5 h-5 border-2 border-[var(--md-sys-color-primary)]/30 border-t-[var(--md-sys-color-primary)] rounded-full animate-spin"></div>
                      <span class="text-[9px] font-black text-[var(--md-sys-color-on-surface-variant)]/60">
                        {t("loading")}
                      </span>
                    </div>
                  {:else}
                    {#each activeKeys as key (key)}
                      {@const rawTime = previewTodayData ? previewTodayData[key] : "--:--"}
                      {@const formatted = (() => {
                        let f = rawTime;
                        if (rawTime && rawTime !== "--:--") {
                          try {
                            const [h, m] = rawTime.split(":");
                            const hr = parseInt(h, 10);
                            if (settings.timeFormat === "12h") {
                              const p = hr >= 12 ? "PM" : "AM";
                              const dh = hr % 12 === 0 ? 12 : hr % 12;
                              f = `${String(dh).padStart(2, "0")}:${m} ${p}`;
                            } else {
                              f = `${h}:${m}`;
                            }
                          } catch {
                            f = rawTime;
                          }
                        }
                        return f;
                      })()}
                      <div class="flex items-center justify-between px-2.5 py-0.5 rounded-lg hover:bg-[var(--md-sys-color-primary)]/8 hover:text-[var(--md-sys-color-primary)] transition-all text-[11px] font-black">
                        <span class="text-[var(--md-sys-color-on-surface-variant)] text-[9px] sm:text-[10px] tracking-wide">
                          {(isMalay ? t(key as any) : key).toUpperCase()}
                        </span>
                        <span class="font-mono text-[var(--md-sys-color-on-surface)] tracking-normal text-[10px] sm:text-[11px] font-extrabold">{formatted}</span>
                      </div>
                    {/each}
                  {/if}
                </div>

                <div class="text-center shrink-0 pt-0.5 relative z-10 w-full">
                  <span class="text-[8px] text-[var(--md-sys-color-on-surface-variant)]/50 tracking-[0.25em] font-black uppercase">
                    ALURWAKTU.PAGES.DEV
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2.5 w-full pt-1">
              <button
                onclick={handleCopyImageToClipboard}
                class={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-xs cursor-pointer shadow-md transition-all select-none hover:scale-105 active:scale-95 hover:-translate-y-[1px]",
                  copyImageState === "success"
                    ? "bg-[#25D366] text-white"
                    : copyImageState === "error"
                      ? "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]"
                      : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:shadow-lg hover:shadow-[var(--md-sys-color-primary)]/20"
                )}
              >
                {#if copyImageState === "success"}
                  <ClipboardCheck size={16} strokeWidth={iconStroke} />
                  {t("copiedToast")}
                {:else}
                  <Copy size={16} strokeWidth={iconStroke} />
                  {t("copyPoster")}
                {/if}
              </button>

              <button
                onclick={handleDownloadImage}
                title={t("downloadPNG")}
                class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline)]/10 shadow-sm cursor-pointer shrink-0 transition-all hover:scale-110 hover:rotate-6 hover:-translate-y-[1px] active:scale-90"
              >
                <Download size={16} strokeWidth={iconStroke} />
              </button>

              <button
                onclick={handleSystemShare}
                disabled={typeof navigator !== "undefined" && !navigator.share}
                title={t("sharePoster")}
                class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-outline)]/10 shadow-sm cursor-pointer shrink-0 disabled:opacity-40 transition-all hover:scale-110 hover:-rotate-6 hover:-translate-y-[1px] active:scale-90"
              >
                <Share2 size={16} strokeWidth={iconStroke} />
              </button>
            </div>
          </div>
        {:else if activeTab === "qr"}
          <div in:fly={{ y: 8, duration: 200 }} out:fly={{ y: -8, duration: 200 }} class="space-y-3 flex flex-col items-center text-center">
            <div class="bg-[var(--md-sys-color-primary)]/8 border border-[var(--md-sys-color-primary)]/15 rounded-2xl p-3.5 text-xs text-[var(--md-sys-color-on-surface-variant)] text-left w-full">
              <p class="leading-relaxed text-[11px]">
                {t("qrInfoDesc")}
              </p>
            </div>

            <div class="p-4 rounded-[28px] bg-white ring-1 ring-black/5 shadow-inner inline-flex items-center justify-center relative overflow-hidden my-1">
              {#if qrMatrix}
                <div class="grid gap-[2px] bg-white p-0.5" style={`grid-template-columns: repeat(${qrMatrix.length}, minmax(0, 1fr))`}>
                  {#each qrMatrix as row, rIdx}
                    {#each row as cell, cIdx}
                      <div
                        class={cn(
                          "w-[4.5px] h-[4.5px] sm:w-[5.5px] sm:h-[5.5px] transition-all duration-200",
                          cell ? "bg-[#0b1f1a]" : "bg-transparent",
                          ((rIdx < 7 && cIdx < 7) || (rIdx < 7 && cIdx >= qrMatrix.length - 7) || (rIdx >= qrMatrix.length - 7 && cIdx < 7))
                            ? cell ? "bg-[var(--md-sys-color-primary)]" : "bg-transparent"
                            : cell ? "rounded-full" : ""
                        )}
                      ></div>
                    {/each}
                  {/each}
                </div>
              {:else}
                <div class="w-[150px] h-[150px] flex items-center justify-center text-[11px] font-black text-[var(--md-sys-color-outline)]">
                  {t("generatingQR")}
                </div>
              {/if}
            </div>

            <div class="text-center w-full px-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[var(--md-sys-color-primary)] block">
                {shareZone} — {getZoneLabel(shareZone)}
              </span>
              <span class="text-[9px] text-[var(--md-sys-color-outline)] font-medium mt-0.5 block truncate select-all">
                {shareUrl}
              </span>
            </div>

            <button
              onclick={handleCopy}
              class={cn(
                "w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs shadow-sm transition-all cursor-pointer active:scale-95 hover:scale-105",
                copied
                  ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                  : "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
              )}
            >
              {#if copied}
                <Check size={15} strokeWidth={iconStroke} />
                {t("copiedToClipboard")}
              {:else}
                <Copy size={15} strokeWidth={iconStroke} />
                {t("copyQRLink")}
              {/if}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
