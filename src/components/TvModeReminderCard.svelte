<script module lang="ts">
  export const playSynthesizedChime = (chimeType: 'bell' | 'chime' | 'gong' | 'notification', volumeVal: number) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const dest = ctx.destination;
      
      const gainNode = ctx.createGain();
      const gainVal = (volumeVal ?? 80) / 100 * 0.35;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.02);
      gainNode.connect(dest);
      
      if (chimeType === 'bell') {
        const frequencies = [880, 1320, 1760, 2200];
        const gains = [1.0, 0.5, 0.25, 0.1];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(gains[idx], ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 3.0);
        });
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
      } else if (chimeType === 'chime') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const startTime = ctx.currentTime + idx * 0.15;
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          oscGain.gain.setValueAtTime(0.4, startTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(startTime);
          osc.stop(startTime + 1.5);
        });
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      } else if (chimeType === 'gong') {
        const freqs = [110, 115, 220, 330];
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = freq < 150 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.0);
          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 4.0);
        });
        const bufferSize = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 2.0);
        filter.Q.setValueAtTime(3.0, ctx.currentTime);
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
        
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(gainNode);
        noiseNode.start(ctx.currentTime);
        noiseNode.stop(ctx.currentTime + 2.0);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.0);
      } else if (chimeType === 'notification') {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        oscGain.gain.setValueAtTime(0.5, ctx.currentTime);
        oscGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.1);
        oscGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Failed to play synthesized chime:", e);
    }
  };
</script>

<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { Sparkles, Tv, Heart, Quote, AlertCircle } from "lucide-svelte";
  import type { TvModeReminder, TvModeReminderText, TvModeReminderImage } from "../types";
  import { cn } from "../lib/utils";

  let { reminder, assetUrls = {}, language = 'ms', isTvMode = false } = $props<{
    reminder: TvModeReminder;
    assetUrls?: Record<string, string>;
    language?: 'ms' | 'en';
    isTvMode?: boolean;
  }>();

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

  function customTransitionIn(node: Element, { type, duration }: { type: string; duration: number }) {
    switch (type) {
      case 'slide-left': return fly(node, { x: 100, duration });
      case 'slide-right': return fly(node, { x: -100, duration });
      case 'zoom': return scale(node, { start: 0.8, duration });
      case 'fade':
      default: return scale(node, { start: 0.96, duration });
    }
  }

  function customTransitionOut(node: Element, { type, duration }: { type: string; duration: number }) {
    switch (type) {
      case 'slide-left': return fly(node, { x: -100, duration });
      case 'slide-right': return fly(node, { x: 100, duration });
      case 'zoom': return scale(node, { start: 0.8, duration });
      case 'fade':
      default: return scale(node, { start: 0.96, duration });
    }
  }

  let timeLeft = $state<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  $effect(() => {
    if (isTvMode && reminder.chime && reminder.chime !== 'none') {
      playSynthesizedChime(reminder.chime, reminder.chimeVolume ?? 80);
    }
  });

  $effect(() => {
    if (!reminder.countdownTarget) {
      timeLeft = null;
      return;
    }
    
    const calculateTimeLeft = () => {
      const targetTime = new Date(reminder.countdownTarget!).getTime();
      if (isNaN(targetTime)) return null;
      
      const difference = targetTime - Date.now();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    const initial = calculateTimeLeft();
    timeLeft = initial;
    if (!initial) return;

    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      if (updated) {
        timeLeft = updated;
      }
    }, 1000);

    return () => clearInterval(timer);
  });

  let isLegacy = $derived(!reminder.texts);

  let texts = $derived.by<TvModeReminderText[]>(() => {
    if (reminder.texts && reminder.texts.length > 0) return reminder.texts;
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
  });

  let images = $derived.by<TvModeReminderImage[]>(() => {
    if (reminder.images && reminder.images.length > 0) return reminder.images;
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
  });

  let layout = $derived(reminder.layout || (reminder.type === 'donation' ? 'flex-row' : 'flex-col'));
  let gap = $derived(reminder.gap ?? 6);
  let bgPattern = $derived(reminder.bgPattern || 'none');
  let bgPatternOpacity = $derived(reminder.bgPatternOpacity ?? 0.07);
  let borderHighlight = $derived(reminder.borderHighlight || (isLegacy ? 'left' : 'none'));

  let presets = $derived(getPresetStyles(reminder.type, isTvMode));

  let cardStyle = $derived.by(() => {
    const s: string[] = [];
    if (reminder.bgColor) s.push(`background-color: ${reminder.bgColor}`);
    if (reminder.bgGradient) s.push(`background-image: ${reminder.bgGradient}`);
    if (reminder.bgGlowColor) {
      s.push(`box-shadow: 0 10px 40px -10px ${reminder.bgGlowColor}`);
    } else if (reminder.type !== 'custom') {
      s.push(`box-shadow: 0 10px 40px -10px ${presets.glow}`);
    }
    return s.join('; ');
  });

  let borderClasses = $derived.by(() => {
    let classes = "border border-[var(--md-sys-color-outline)]/10";
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
          classes = cn("border-l-4 border-y border-r border-[var(--md-sys-color-outline)]/10", highlightColorClass);
          break;
        case 'top':
          classes = cn("border-t-4 border-x border-b border-[var(--md-sys-color-outline)]/10", highlightColorClass);
          break;
        case 'right':
          classes = cn("border-r-4 border-y border-l border-[var(--md-sys-color-outline)]/10", highlightColorClass);
          break;
        case 'bottom':
          classes = cn("border-b-4 border-x border-t border-[var(--md-sys-color-outline)]/10", highlightColorClass);
          break;
        case 'all':
          classes = cn("border-4 border-[var(--md-sys-color-outline)]/10", highlightColorClass);
          break;
      }
    }
    return classes;
  });

  let bgImages = $derived(images.filter(img => img.position === 'background'));
  let flowImages = $derived(images.filter(img => img.position !== 'background'));

  function resolveImgSrc(img: TvModeReminderImage) {
    if (img.isUploaded && img.assetKey) {
      return assetUrls[img.assetKey] || img.url;
    }
    return img.url;
  }

  let leftImages = $derived(flowImages.filter(img => img.position === 'left'));
  let rightImages = $derived(flowImages.filter(img => img.position === 'right'));
  let topImages = $derived(flowImages.filter(img => img.position === 'top'));
  let bottomImages = $derived(flowImages.filter(img => img.position === 'bottom'));
</script>

<style>
  @keyframes card-marquee-scroll {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  :global(.card-marquee-container) {
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    display: block;
  }
  :global(.card-marquee-content) {
    display: inline-block;
    animation: card-marquee-scroll 20s linear infinite;
    will-change: transform;
  }
  @keyframes float-particle-up {
    0% { transform: translateY(110%) scale(0.7); opacity: 0; }
    20% { opacity: 0.35; }
    80% { opacity: 0.35; }
    100% { transform: translateY(-20%) scale(1.1); opacity: 0; }
  }
  :global(.floating-particle) {
    position: absolute;
    bottom: -40px;
    background: radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    animation: float-particle-up linear infinite;
  }
  @keyframes ambient-pulse-slow {
    0% { transform: scale(1) translate(0px, 0px); opacity: 0.06; }
    50% { transform: scale(1.15) translate(25px, -20px); opacity: 0.14; }
    100% { transform: scale(1) translate(0px, 0px); opacity: 0.06; }
  }
  @keyframes ambient-pulse-slow-reverse {
    0% { transform: scale(1.1) translate(0px, 0px); opacity: 0.04; }
    50% { transform: scale(0.95) translate(-30px, 15px); opacity: 0.11; }
    100% { transform: scale(1.1) translate(0px, 0px); opacity: 0.04; }
  }
  :global(.ambient-pulse-blob-1) {
    position: absolute;
    width: 60%;
    height: 60%;
    top: 5%;
    left: 5%;
    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
    filter: blur(50px);
    animation: ambient-pulse-slow 20s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }
  :global(.ambient-pulse-blob-2) {
    position: absolute;
    width: 60%;
    height: 60%;
    bottom: 5%;
    right: 5%;
    border-radius: 60% 40% 30% 70% / 50% 60% 50% 40%;
    filter: blur(50px);
    animation: ambient-pulse-slow-reverse 26s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }
</style>

{#snippet imageItem(img: TvModeReminderImage)}
  {@const src = resolveImgSrc(img)}
  {@const imgStyle = [
    img.width ? `width: ${img.width}%` : '',
    img.height ? `max-height: ${isTvMode ? img.height * 2.2 : img.height}px` : '',
    img.padding ? `padding: ${img.padding}px` : ''
  ].filter(Boolean).join('; ')}
  {#if src}
    <div
      class={cn(
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
        class="w-full h-full object-contain pointer-events-none"
      />
    </div>
  {/if}
{/snippet}

{#key reminder.id}
  <div
    in:customTransitionIn={{ type: reminder.transition || 'fade', duration: 450 }}
    out:customTransitionOut={{ type: reminder.transition || 'fade', duration: 450 }}
    class={cn(
      "flex-grow flex p-6 sm:p-10 rounded-[36px] relative overflow-hidden transition-all duration-500 select-none min-h-[140px] items-center justify-center",
      reminder.bgColor || reminder.bgGradient ? "" : presets.bg,
      borderClasses
    )}
    style={cardStyle}
  >
    <!-- 1. Background Pattern Overlay -->
    {#if bgPattern !== 'none'}
      <div 
        class={cn(
          "absolute inset-0 pointer-events-none z-0 transition-opacity",
          bgPattern === 'islamic' ? "islamic-pattern-overlay" :
          bgPattern === 'dots' ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-500/10 via-transparent to-transparent bg-[size:10px_10px]" :
          "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]"
        )}
        style="opacity: {bgPatternOpacity}"
      ></div>
    {/if}

    <!-- 1b. Ambient Visual Effects -->
    {#if reminder.bgEffect === 'floating-particles'}
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {#each Array.from({ length: 8 }) as _, idx}
          {@const size = 30 + (idx * 15) % 65}
          {@const left = 5 + (idx * 13) % 90}
          {@const duration = 12 + (idx * 3) % 13}
          {@const delay = (idx * 1.5) % 8}
          <div 
            class="floating-particle"
            style="width: {size}px; height: {size}px; left: {left}%; animation-duration: {duration}s; animation-delay: {delay}s;"
          ></div>
        {/each}
      </div>
    {/if}

    {#if reminder.bgEffect === 'ambient-pulses'}
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          class="ambient-pulse-blob-1 bg-[var(--md-sys-color-primary)]"
          style={reminder.borderColor ? `background: ${reminder.borderColor}` : ""}
        ></div>
        <div 
          class="ambient-pulse-blob-2 bg-[var(--md-sys-color-secondary-container)]"
          style={reminder.bgGlowColor ? `background: ${reminder.bgGlowColor}` : ""}
        ></div>
      </div>
    {/if}

    <!-- 2. Background Uploaded/URL Images -->
    {#each bgImages as img (img.id)}
      {@const src = resolveImgSrc(img)}
      {@const bgImgStyle = `opacity: ${img.width ? img.width / 100 : 0.15};${img.padding ? ` padding: ${img.padding}px;` : ''}`}
      {#if src}
        <img
          src={src}
          alt="Background pattern"
          class={cn(
            "absolute inset-0 w-full h-full object-cover pointer-events-none z-0 transition-all",
            img.blendMode && img.blendMode !== 'none' ? `mix-blend-${img.blendMode}` : "opacity-15",
            img.shape === 'circle' ? "rounded-full" : ""
          )}
          style={bgImgStyle}
        />
      {/if}
    {/each}

    <!-- 3. Watermark -->
    {#if bgImages.length === 0}
      {@const iconSize = isTvMode ? 140 : 64}
      {@const iconClass = cn(presets.watermark, "absolute -right-2 -top-2 pointer-events-none rotate-180 z-0 opacity-40")}
      {#if reminder.type === 'hadith'}
        <Quote size={iconSize} class={iconClass} />
      {:else if reminder.type === 'quran'}
        <Sparkles size={iconSize} class={iconClass} />
      {:else if reminder.type === 'warning'}
        <AlertCircle size={iconSize} class={iconClass} />
      {:else if reminder.type === 'info'}
        <Tv size={iconSize} class={iconClass} />
      {:else if reminder.type === 'donation'}
        <Heart size={iconSize} class={iconClass} />
      {/if}
    {/if}

    <!-- 5. Main Content Layout (Texts and Flow Images) -->
    <div 
      class={cn(
        "w-full h-full flex relative z-10 items-center justify-center",
        layout === 'flex-row' ? "flex-row" :
        layout === 'flex-row-reverse' ? "flex-row-reverse" :
        layout === 'flex-col-reverse' ? "flex-col-reverse" :
        layout === 'overlay' ? "relative" : "flex-col",
        `gap-${gap}`
      )}
    >
      <!-- Left media block -->
      {#if leftImages.length > 0}
        <div class="flex flex-col gap-2 shrink-0">
          {#each leftImages as img (img.id)}
            {@render imageItem(img)}
          {/each}
        </div>
      {/if}

      <!-- Vertical group for Top images, Texts, and Bottom images -->
      <div class="flex-grow flex flex-col justify-center w-full gap-3">
        {#if topImages.length > 0}
          <div class="flex flex-row gap-2 justify-center flex-wrap">
            {#each topImages as img (img.id)}
              {@render imageItem(img)}
            {/each}
          </div>
        {/if}

        <!-- Texts blocks list -->
        <div class="space-y-2 w-full flex flex-col justify-center">
          {#each texts as t (t.id)}
            {@const isTitle = t.type === 'title'}
            {@const isSubtitle = t.type === 'subtitle'}
            {@const isCaption = t.type === 'caption'}
            
            {@const defaultColorClass = t.color ? "" : (
              isTitle ? "text-[var(--md-sys-color-on-surface)]" :
              isSubtitle ? "text-[var(--md-sys-color-primary)] dark:text-[var(--md-sys-color-secondary)]" :
              isCaption ? "text-[var(--md-sys-color-on-surface-variant)]/60" :
              "text-[var(--md-sys-color-on-surface-variant)]"
            )}
            
            {@const textStyle = `${t.color ? `color: ${t.color};` : ''}${t.glow ? `text-shadow: 0 0 10px ${t.color || 'var(--md-sys-color-primary)'}, 0 0 20px ${t.color || 'var(--md-sys-color-primary)'};` : ''}`}

            {#if t.marquee}
              <div 
                class={cn(
                  "card-marquee-container",
                  getFontSizeClass(t.size, isTvMode),
                  getFontFamilyClass(t.font),
                  getFontWeightClass(t.weight),
                  defaultColorClass,
                  isTitle ? "tracking-wide uppercase mb-1 font-black" :
                  isSubtitle ? "tracking-widest uppercase mb-1" : ""
                )}
                style={textStyle}
              >
                <div class="card-marquee-content">
                  {t.content}
                  <span class="opacity-40 px-12">&bull;</span>
                  {t.content}
                  <span class="opacity-40 px-12">&bull;</span>
                </div>
              </div>
            {:else}
              <div
                class={cn(
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
            {/if}
          {/each}
        </div>

        <!-- Countdown Widget -->
        {#if timeLeft}
          <div class={cn("flex flex-col items-center mt-4 mb-2 z-10 w-full", isTvMode ? "gap-4" : "gap-1")}>
            {#if reminder.countdownLabel}
              <div class={cn(
                "font-sans font-medium text-center opacity-85 tracking-wide",
                isTvMode ? "text-xl" : "text-[10px]"
              )}>
                {reminder.countdownLabel}
              </div>
            {/if}
            <div class="flex flex-row items-center justify-center gap-2">
              {#each [
                { value: timeLeft.days, label: language === 'ms' ? 'Hari' : 'Days' },
                { value: timeLeft.hours, label: language === 'ms' ? 'Jam' : 'Hours' },
                { value: timeLeft.minutes, label: language === 'ms' ? 'Min' : 'Mins' },
                { value: timeLeft.seconds, label: language === 'ms' ? 'Saat' : 'Secs' },
              ] as item, idx}
                <div class={cn(
                  "flex flex-col items-center justify-center bg-black/15 dark:bg-white/10 border border-white/10 rounded-2xl shadow-inner",
                  isTvMode ? "p-3 min-w-[100px] h-[90px]" : "p-1 min-w-[44px] h-[36px]"
                )}>
                  <span class={cn("font-mono font-bold leading-none", isTvMode ? "text-3xl" : "text-sm")}>
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span class={cn("font-sans uppercase opacity-60 tracking-wider font-semibold", isTvMode ? "text-[10px] mt-1" : "text-[6px] mt-0.5")}>
                    {item.label}
                  </span>
                </div>
                {#if idx < 3}
                  <span class={cn("font-mono font-bold opacity-60", isTvMode ? "text-3xl mx-1" : "text-sm mx-0.5")}>
                    :
                  </span>
                {/if}
              {/each}
            </div>
          </div>
        {/if}

        {#if bottomImages.length > 0}
          <div class="flex flex-row gap-2 justify-center flex-wrap">
            {#each bottomImages as img (img.id)}
              {@render imageItem(img)}
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right media block -->
      {#if rightImages.length > 0}
        <div class="flex flex-col gap-2 shrink-0">
          {#each rightImages as img (img.id)}
            {@render imageItem(img)}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/key}
