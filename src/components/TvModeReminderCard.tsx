import React from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Sparkles,
  VolumeX,
  Tv,
  Heart,
  Quote,
  AlertCircle
} from "lucide-react";
import { TvModeReminder, TvModeReminderText, TvModeReminderImage } from "../types";
import { cn } from "../lib/utils";

interface TvModeReminderCardProps {
  reminder: TvModeReminder;
  assetUrls?: Record<string, string>;
  language?: 'ms' | 'en';
  isTvMode?: boolean; // Toggles text sizes between widescreen TV and settings preview
}

// Map sizes to Tailwind font sizes based on display mode
const getFontSizeClass = (size: string | undefined, isTvMode: boolean) => {
  const s = size || 'md';
  if (isTvMode) {
    switch (s) {
      case 'sm': return 'text-lg';
      case 'md': return 'text-xl sm:text-2xl';
      case 'lg': return 'text-2xl sm:text-3xl';
      case 'xl': return 'text-3xl sm:text-4xl';
      case '2xl': return 'text-4xl sm:text-5xl';
      case '3xl': return 'text-5xl sm:text-6xl';
      default: return 'text-2xl';
    }
  } else {
    switch (s) {
      case 'sm': return 'text-[9px]';
      case 'md': return 'text-[11px]';
      case 'lg': return 'text-xs';
      case 'xl': return 'text-sm';
      case '2xl': return 'text-base';
      case '3xl': return 'text-lg';
      default: return 'text-[11px]';
    }
  }
};

const getFontFamilyClass = (font: string | undefined) => {
  switch (font) {
    case 'serif': return 'font-serif italic';
    case 'mono': return 'font-mono';
    case 'sans':
    default:
      return 'font-sans';
  }
};

const getFontWeightClass = (weight: string | undefined) => {
  switch (weight) {
    case 'medium': return 'font-medium';
    case 'bold': return 'font-bold';
    case 'black': return 'font-black';
    case 'normal':
    default:
      return 'font-normal';
  }
};

const getTextAlignClass = (align: string | undefined) => {
  switch (align) {
    case 'left': return 'text-left';
    case 'right': return 'text-right';
    case 'justify': return 'text-justify';
    case 'center':
    default:
      return 'text-center';
  }
};

// Preset colors and border highlights
const getPresetStyles = (type: string, isTvMode: boolean) => {
  switch (type) {
    case 'hadith':
      return {
        bg: "bg-[var(--md-sys-color-primary-container)]/10 border-[var(--md-sys-color-primary)]/10",
        border: "border-l-4 border-l-[var(--md-sys-color-primary)]",
        glow: "rgba(168, 85, 247, 0.15)",
        watermark: "text-[var(--md-sys-color-primary)]/5"
      };
    case 'quran':
      return {
        bg: "bg-amber-500/5 border-amber-500/10",
        border: "border-l-4 border-l-amber-500",
        glow: "rgba(245, 158, 11, 0.15)",
        watermark: "text-amber-500/5"
      };
    case 'warning':
      return {
        bg: "bg-[var(--md-sys-color-error-container)]/5 border-[var(--md-sys-color-error)]/10",
        border: "border-l-4 border-l-[var(--md-sys-color-error)]",
        glow: "rgba(239, 68, 68, 0.15)",
        watermark: "text-[var(--md-sys-color-error)]/5"
      };
    case 'info':
      return {
        bg: "bg-blue-500/5 border-blue-500/10",
        border: "border-l-4 border-l-blue-500",
        glow: "rgba(59, 130, 246, 0.15)",
        watermark: "text-blue-500/5"
      };
    case 'donation':
      return {
        bg: "bg-rose-500/5 border-rose-500/10",
        border: "border-l-4 border-l-rose-500",
        glow: "rgba(244, 63, 94, 0.15)",
        watermark: "text-rose-500/5"
      };
    default:
      return {
        bg: "bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline)]/10",
        border: "",
        glow: "rgba(0, 0, 0, 0.05)",
        watermark: "text-[var(--md-sys-color-on-surface)]/2"
      };
  }
};

export function TvModeReminderCard({ reminder, assetUrls = {}, language = 'ms', isTvMode = false }: TvModeReminderCardProps) {
  // Normalize layout properties
  const isLegacy = !reminder.texts;
  
  // 1. Normalize Texts
  const texts = React.useMemo<TvModeReminderText[]>(() => {
    if (reminder.texts && reminder.texts.length > 0) return reminder.texts;
    // Legacy fallback
    const legacyTexts: TvModeReminderText[] = [];
    if (reminder.title && reminder.type !== 'donation') {
      legacyTexts.push({
        id: 'legacy-ref',
        content: reminder.title,
        type: 'subtitle',
        size: 'lg',
        font: 'sans',
        align: 'center',
        weight: 'bold'
      });
    }
    if (reminder.text) {
      legacyTexts.push({
        id: 'legacy-body',
        content: reminder.text,
        type: 'body',
        size: 'md',
        font: reminder.type === 'warning' ? 'sans' : 'serif',
        align: 'center',
        weight: reminder.type === 'warning' ? 'bold' : 'normal'
      });
    }
    if (reminder.title && reminder.type === 'donation') {
      legacyTexts.push({
        id: 'legacy-title',
        content: reminder.title,
        type: 'title',
        size: 'xl',
        font: 'sans',
        align: 'left',
        weight: 'black'
      });
    }
    return legacyTexts;
  }, [reminder.texts, reminder.title, reminder.text, reminder.type]);

  // 2. Normalize Images
  const images = React.useMemo<TvModeReminderImage[]>(() => {
    if (reminder.images && reminder.images.length > 0) return reminder.images;
    // Legacy fallback
    if (reminder.imageUrl) {
      return [{
        id: 'legacy-img',
        url: reminder.imageUrl,
        position: reminder.type === 'donation' ? 'right' : 'background',
        width: reminder.type === 'donation' ? 40 : 100,
        shape: reminder.type === 'donation' ? 'rounded' : 'original',
        blendMode: 'none',
        padding: 0
      }];
    }
    return [];
  }, [reminder.images, reminder.imageUrl, reminder.type]);

  const layout = reminder.layout || (reminder.type === 'donation' ? 'flex-row' : 'flex-col');
  const gap = reminder.gap ?? 6;
  const bgPattern = reminder.bgPattern || 'none';
  const bgPatternOpacity = reminder.bgPatternOpacity ?? 0.07;
  const borderHighlight = reminder.borderHighlight || (isLegacy ? 'left' : 'none');

  // Load preset base styles
  const presets = getPresetStyles(reminder.type, isTvMode);

  // Background inline styles
  const cardStyle: React.CSSProperties = {};
  if (reminder.bgColor) {
    cardStyle.backgroundColor = reminder.bgColor;
  }
  if (reminder.bgGradient) {
    // Custom gradient
    cardStyle.backgroundImage = reminder.bgGradient;
  }

  // Glow shadow inline styles
  if (reminder.bgGlowColor) {
    cardStyle.boxShadow = `0 10px 40px -10px ${reminder.bgGlowColor}`;
  } else if (reminder.type !== 'custom') {
    cardStyle.boxShadow = `0 10px 40px -10px ${presets.glow}`;
  }

  // Border highlight classes
  let borderClasses = "border border-[var(--md-sys-color-outline)]/10";
  if (borderHighlight !== 'none') {
    const highlightColorClass = reminder.borderColor 
      ? "" 
      : (reminder.type === 'hadith' ? "border-[var(--md-sys-color-primary)]" :
         reminder.type === 'quran' ? "border-amber-500" :
         reminder.type === 'warning' ? "border-[var(--md-sys-color-error)]" :
         reminder.type === 'info' ? "border-blue-500" :
         reminder.type === 'donation' ? "border-rose-500" : "border-[var(--md-sys-color-primary)]");

    switch (borderHighlight) {
      case 'left':
        borderClasses = cn("border-l-4 border-y border-r border-[var(--md-sys-color-outline)]/10", highlightColorClass);
        break;
      case 'top':
        borderClasses = cn("border-t-4 border-x border-b border-[var(--md-sys-color-outline)]/10", highlightColorClass);
        break;
      case 'right':
        borderClasses = cn("border-r-4 border-y border-l border-[var(--md-sys-color-outline)]/10", highlightColorClass);
        break;
      case 'bottom':
        borderClasses = cn("border-b-4 border-x border-t border-[var(--md-sys-color-outline)]/10", highlightColorClass);
        break;
      case 'all':
        borderClasses = cn("border-4 border-[var(--md-sys-color-outline)]/10", highlightColorClass);
        break;
    }
  }

  // Separate background images from layout flow images
  const bgImages = images.filter(img => img.position === 'background');
  const flowImages = images.filter(img => img.position !== 'background');

  // Helper to resolve image source URL
  const resolveImgSrc = (img: typeof images[0]) => {
    if (img.isUploaded && img.assetKey) {
      return assetUrls[img.assetKey] || img.url;
    }
    return img.url;
  };

  // Preset watermark icon
  const renderWatermark = () => {
    // Only render watermarks if it's a standard category and has no background image
    if (bgImages.length > 0) return null;
    
    const iconSize = isTvMode ? 140 : 64;
    const iconClass = cn(presets.watermark, "absolute -right-2 -top-2 pointer-events-none rotate-180 z-0 opacity-40");
    
    switch (reminder.type) {
      case 'hadith':
        return <Quote size={iconSize} className={iconClass} />;
      case 'quran':
        return <Sparkles size={iconSize} className={iconClass} />;
      case 'warning':
        return <AlertCircle size={iconSize} className={iconClass} />;
      case 'info':
        return <Tv size={iconSize} className={iconClass} />;
      case 'donation':
        return <Heart size={iconSize} className={iconClass} />;
      default:
        return null;
    }
  };

  // Style gap mappings
  const gapClass = `gap-${gap}`;

  // Image layout components (left/right/top/bottom)
  const leftImages = flowImages.filter(img => img.position === 'left');
  const rightImages = flowImages.filter(img => img.position === 'right');
  const topImages = flowImages.filter(img => img.position === 'top');
  const bottomImages = flowImages.filter(img => img.position === 'bottom');

  const renderImageItem = (img: typeof images[0]) => {
    const src = resolveImgSrc(img);
    if (!src) return null;

    const imgStyle: React.CSSProperties = {};
    if (img.width) {
      imgStyle.width = `${img.width}%`;
    }
    if (img.height) {
      imgStyle.maxHeight = isTvMode ? `${img.height * 2.2}px` : `${img.height}px`;
    }
    if (img.padding) {
      imgStyle.padding = `${img.padding}px`;
    }

    return (
      <div
        key={img.id}
        className={cn(
          "shrink-0 flex items-center justify-center transition-all bg-white overflow-hidden shadow-sm",
          img.shape === 'circle' ? "rounded-full" :
          img.shape === 'rounded' ? (isTvMode ? "rounded-3xl" : "rounded-xl") :
          img.shape === 'square' ? "rounded-none" : "rounded-xl",
          img.align === 'start' ? "self-start" :
          img.align === 'end' ? "self-end" : "self-center",
          img.blendMode && img.blendMode !== 'none' ? `mix-blend-${img.blendMode}` : ""
        )}
        style={imgStyle}
      >
        <img
          src={src}
          alt="Reminder Media"
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    );
  };

  return (
    <motion.div
      key={reminder.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "flex-grow flex p-6 sm:p-10 rounded-[36px] relative overflow-hidden transition-all duration-500 select-none min-h-[140px] items-center justify-center",
        reminder.bgColor || reminder.bgGradient ? "" : presets.bg,
        borderClasses
      )}
      style={cardStyle}
    >
      {/* 1. Background Pattern Overlay */}
      {bgPattern !== 'none' && (
        <div 
          className={cn(
            "absolute inset-0 pointer-events-none z-0 transition-opacity",
            bgPattern === 'islamic' ? "islamic-pattern-overlay" :
            bgPattern === 'dots' ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-500/10 via-transparent to-transparent bg-[size:10px_10px]" :
            "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]"
          )}
          style={{ opacity: bgPatternOpacity }}
        />
      )}

      {/* 2. Background Uploaded/URL Images */}
      {bgImages.map(img => {
        const src = resolveImgSrc(img);
        if (!src) return null;
        return (
          <img
            key={img.id}
            src={src}
            alt="Background pattern"
            className={cn(
              "absolute inset-0 w-full h-full object-cover pointer-events-none z-0 transition-all",
              img.blendMode && img.blendMode !== 'none' ? `mix-blend-${img.blendMode}` : "opacity-15",
              img.shape === 'circle' ? "rounded-full" : ""
            )}
            style={{ 
              opacity: (img.width ? img.width / 100 : 0.15),
              padding: img.padding ? `${img.padding}px` : undefined
            }}
          />
        );
      })}

      {/* 3. Watermark */}
      {renderWatermark()}

      {/* 5. Main Content Layout (Texts and Flow Images) */}
      <div 
        className={cn(
          "w-full h-full flex relative z-10 items-center justify-center",
          layout === 'flex-row' ? "flex-row" :
          layout === 'flex-row-reverse' ? "flex-row-reverse" :
          layout === 'flex-col-reverse' ? "flex-col-reverse" :
          layout === 'overlay' ? "relative" : "flex-col",
          gapClass
        )}
      >
        {/* Left media block */}
        {leftImages.length > 0 && (
          <div className="flex flex-col gap-2 shrink-0">
            {leftImages.map(renderImageItem)}
          </div>
        )}

        {/* Vertical group for Top images, Texts, and Bottom images */}
        <div className="flex-grow flex flex-col justify-center w-full gap-3">
          {topImages.length > 0 && (
            <div className="flex flex-row gap-2 justify-center flex-wrap">
              {topImages.map(renderImageItem)}
            </div>
          )}

          {/* Texts blocks list */}
          <div className="space-y-2 w-full flex flex-col justify-center">
            {texts.map((t) => {
              const textStyle: React.CSSProperties = {};
              if (t.color) {
                textStyle.color = t.color;
              }
              
              // Preset text style matching standard categories
              const isTitle = t.type === 'title';
              const isSubtitle = t.type === 'subtitle';
              const isCaption = t.type === 'caption';
              
              const defaultColorClass = t.color ? "" : (
                isTitle ? "text-[var(--md-sys-color-on-surface)]" :
                isSubtitle ? "text-[var(--md-sys-color-primary)] dark:text-[var(--md-sys-color-secondary)]" :
                isCaption ? "text-[var(--md-sys-color-on-surface-variant)]/60" :
                "text-[var(--md-sys-color-on-surface-variant)]"
              );

              return (
                <div
                  key={t.id}
                  className={cn(
                    getFontSizeClass(t.size, isTvMode),
                    getFontFamilyClass(t.font),
                    getFontWeightClass(t.weight),
                    getTextAlignClass(t.align),
                    defaultColorClass,
                    isTitle ? "tracking-wide uppercase mb-1 font-black" :
                    isSubtitle ? "tracking-widest uppercase mb-1" : ""
                  )}
                  style={textStyle}
                >
                  {t.content}
                </div>
              );
            })}
          </div>

          {bottomImages.length > 0 && (
            <div className="flex flex-row gap-2 justify-center flex-wrap">
              {bottomImages.map(renderImageItem)}
            </div>
          )}
        </div>

        {/* Right media block */}
        {rightImages.length > 0 && (
          <div className="flex flex-col gap-2 shrink-0">
            {rightImages.map(renderImageItem)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
