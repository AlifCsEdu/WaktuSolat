import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  ChevronDown,
  Link2,
  ExternalLink,
} from "lucide-react";
import { cn } from "../lib/utils";
import { JAKIM_ZONES } from "../lib/zones";
import { useAppContext } from "../AppContext";

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentZone: string;
}

function getZoneLabel(zoneCode: string): string {
  for (const state of JAKIM_ZONES) {
    for (const z of state.zones) {
      if (z.v === zoneCode) return `${z.l} (${state.state})`;
    }
  }
  return zoneCode;
}

function buildShareUrl(zone: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}?zone=${zone}`;
}

export function SharePanel({ isOpen, onClose, currentZone }: SharePanelProps) {
  const { t, settings } = useAppContext();
  const isMalay = settings.language === "ms";

  const [shareZone, setShareZone] = useState(currentZone);
  const [copied, setCopied] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  // Reset when opening
  const shareUrl = useMemo(() => buildShareUrl(shareZone), [shareZone]);
  const shareTitle = isMalay
    ? `Waktu Solat ${shareZone} — ${getZoneLabel(shareZone)}`
    : `Prayer Times ${shareZone} — ${getZoneLabel(shareZone)}`;
  const shareText = isMalay
    ? `Lihat waktu solat untuk ${getZoneLabel(shareZone)}`
    : `Check prayer times for ${getZoneLabel(shareZone)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
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

  const shareOptions = [
    {
      id: "copy",
      label: copied
        ? isMalay ? "Disalin!" : "Copied!"
        : isMalay ? "Salin Pautan" : "Copy Link",
      icon: copied ? Check : Copy,
      action: handleCopy,
      accent: copied,
    },
    ...(typeof navigator !== "undefined" && navigator.share
      ? [
          {
            id: "system",
            label: isMalay ? "Kongsi..." : "Share...",
            icon: ExternalLink,
            action: handleSystemShare,
            accent: false,
          },
        ]
      : []),
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      action: handleWhatsApp,
      accent: false,
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: Send,
      action: handleTelegram,
      accent: false,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ isolation: "isolate" }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />

          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[var(--md-sys-color-surface-container)] w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl border border-[var(--md-sys-color-outline)]/15 shadow-black/40"
          >
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--md-sys-color-outline)]/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 sm:pt-6 sm:pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary)]/12 flex items-center justify-center">
                  <Share2 size={20} className="text-[var(--md-sys-color-primary)]" />
                </div>
                <div>
                  <h3 className="md3-title-medium font-black text-[var(--md-sys-color-on-surface)]">
                    {isMalay ? "Kongsi Waktu Solat" : "Share Prayer Times"}
                  </h3>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] transition-colors"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Zone Picker */}
            <div className="px-6 pt-2 pb-1">
              <label className="text-[11px] uppercase tracking-widest font-black text-[var(--md-sys-color-on-surface-variant)] mb-1.5 block">
                {isMalay ? "Zon untuk dikongsi" : "Zone to share"}
              </label>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowZonePicker(!showZonePicker)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/10 text-left transition-all hover:ring-[var(--md-sys-color-primary)]/30"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm text-[var(--md-sys-color-primary)]">
                    {shareZone}
                  </span>
                  <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] ml-2 truncate">
                    {getZoneLabel(shareZone)}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-[var(--md-sys-color-outline)] transition-transform",
                    showZonePicker && "rotate-180"
                  )}
                />
              </motion.button>

              <AnimatePresence>
                {showZonePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="max-h-[200px] overflow-y-auto mt-2 rounded-2xl bg-[var(--md-sys-color-surface)] ring-1 ring-[var(--md-sys-color-outline)]/10 divide-y divide-[var(--md-sys-color-outline)]/5">
                      {JAKIM_ZONES.map((state) => (
                        <div key={state.state}>
                          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container-low)] sticky top-0">
                            {state.state}
                          </div>
                          {state.zones.map((z) => (
                            <button
                              key={z.v}
                              onClick={() => {
                                setShareZone(z.v);
                                setShowZonePicker(false);
                                setCopied(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--md-sys-color-primary)]/8",
                                z.v === shareZone &&
                                  "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold"
                              )}
                            >
                              <span className="font-black text-xs text-[var(--md-sys-color-primary)] w-12 shrink-0">
                                {z.v}
                              </span>
                              <span className="truncate text-xs">
                                {z.l}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* URL Preview */}
            <div className="px-6 pt-3 pb-1">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]/60 ring-1 ring-[var(--md-sys-color-outline)]/5">
                <Link2 size={14} className="text-[var(--md-sys-color-outline)] shrink-0" />
                <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate font-mono tracking-tight">
                  {shareUrl}
                </span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="px-6 pt-4 pb-6 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {shareOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={opt.action}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm",
                        opt.accent
                          ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                          : opt.id === "copy"
                            ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] ring-1 ring-[var(--md-sys-color-primary)]/15"
                            : opt.id === "whatsapp"
                              ? "bg-[#25D366]/15 text-[#25D366] ring-1 ring-[#25D366]/20"
                              : opt.id === "telegram"
                                ? "bg-[#0088cc]/15 text-[#0088cc] ring-1 ring-[#0088cc]/20"
                                : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] ring-1 ring-[var(--md-sys-color-outline)]/10"
                      )}
                    >
                      <Icon size={18} />
                      {opt.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
