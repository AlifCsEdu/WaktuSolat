<script lang="ts">
  import { onMount } from "svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import GooeyBackground from "./GooeyBackground.svelte";

  let isMorphing = $state(false);
  onMount(() => {
    const timer = setTimeout(() => {
      isMorphing = true;
    }, 450);
    const disableTimer = setTimeout(() => {
      isMorphing = false;
    }, 20000);
    return () => {
      clearTimeout(timer);
      clearTimeout(disableTimer);
    };
  });
  import { Compass, X, Clock } from "lucide-svelte";
  import { format } from "date-fns";
  import { appSettings } from "../state/settings.svelte";
  import { cn } from "../lib/utils";
  import "@material/web/button/filled-tonal-button.js";

  let {
    prayerName,
    remainingSeconds,
    showClock = true,
    showQibla = true,
    isDuaStage = false,
    isTvMode = false,
    onExit,
  }: {
    prayerName: string;
    remainingSeconds: number;
    showClock?: boolean;
    showQibla?: boolean;
    isDuaStage?: boolean;
    isTvMode?: boolean;
    onExit: () => void;
  } = $props();

  let currentTime = $state(new Date());
  let showExitButton = $state(false);
  let exitTapCount = $state(0);

  onMount(() => {
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    return () => clearInterval(timer);
  });

  // TV Remote controls/keyboard wake-up event listener
  onMount(() => {
    if (!isTvMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      showExitButton = true;
      if (exitTapCount < 1) {
        exitTapCount = 1;
      } else {
        onExit();
        exitTapCount = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Show exit button on tap/click and hide after 4 seconds
  $effect(() => {
    if (showExitButton) {
      const timeout = setTimeout(() => {
        showExitButton = false;
        exitTapCount = 0;
      }, 4000);
      return () => clearTimeout(timeout);
    }
  });

  // Handle temporary tap count reset for the exit button
  $effect(() => {
    if (exitTapCount > 0) {
      const timeout = setTimeout(() => {
        exitTapCount = 0;
      }, 2000);
      return () => clearTimeout(timeout);
    }
  });

  // Dhikr cycling for the Dua stage
  let dhikrIndex = $state(0);
  $effect(() => {
    if (isDuaStage) {
      const interval = setInterval(() => {
        dhikrIndex = (dhikrIndex + 1) % 3;
      }, 8000);
      return () => clearInterval(interval);
    }
  });

  function handleContainerClick() {
    showExitButton = true;
  }

  function handleExitClick(e: MouseEvent) {
    e.stopPropagation();
    if (exitTapCount < 1) {
      exitTapCount = 1;
    } else {
      onExit();
      exitTapCount = 0;
    }
  }

  let formattedClock = $derived(format(currentTime, "HH:mm"));

  let dhikrs = $derived([
    appSettings.t("solatModeDuaDhikr1"),
    appSettings.t("solatModeDuaDhikr2"),
    appSettings.t("solatModeDuaDhikr3"),
  ]);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  in:fade={{ duration: 300 }}
  out:fade={{ duration: 300 , isExit: true}}
  onoutrostart={() => isMorphing = false}
  onclick={handleContainerClick}
  class={cn(
    "fixed inset-0 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] flex flex-col items-center justify-between cursor-pointer select-none overflow-hidden",
    isTvMode ? "z-[10000] p-12 sm:p-20" : "z-[500] p-8 sm:p-12"
  )}
>
  <!-- Calm ambient breathing backdrop -->
  <GooeyBackground isMorphing={isMorphing} class="opacity-45 scale-110" />
  <div class="absolute inset-0 bg-black/40 dark:bg-black/60 pointer-events-none"></div>

  <!-- Repeating Islamic geometric pattern background -->
  <div class="absolute inset-0 islamic-pattern-overlay opacity-30 z-0 pointer-events-none"></div>

  <!-- Top Header: Solat Mode Indicator & Clock -->
  <div class="w-full flex items-center justify-between z-10">
    <div
      class={cn(
        "flex items-center text-[var(--md-sys-color-on-surface-variant)] font-extrabold tracking-widest uppercase bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] rounded-full",
        isTvMode ? "gap-3.5 text-sm lg:text-base px-6 py-3" : "gap-2 text-xs px-4 py-2"
      )}
    >
      <span
        class={cn(
          "rounded-full bg-[var(--md-sys-color-primary)]",
          isTvMode ? "w-3 h-3" : "w-2 h-2",
          isDuaStage ? "opacity-80" : "animate-pulse"
        )}
      ></span>
      {isDuaStage ? "Dua & Remembrance" : "Solat Sedang Berlangsung"}
    </div>

    {#if showClock}
      <div
        class={cn(
          "flex items-center text-[var(--md-sys-color-on-surface)] font-black tracking-tight bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/50",
          isTvMode ? "gap-3.5 text-3xl px-6 py-3 rounded-3xl" : "gap-2 text-xl px-4 py-2 rounded-2xl"
        )}
      >
        <Clock size={isTvMode ? 26 : 18} class="text-[var(--md-sys-color-on-surface-variant)] shrink-0" />
        <span class="font-sans tabular-nums">{formattedClock}</span>
      </div>
    {/if}
  </div>

  <!-- Center Section: Transition dynamically between Praying Mode and Dua Screensaver -->
  <div class="grid flex-1 items-center justify-center w-full z-10">
    {#if !isDuaStage}
      <div
        in:fly={{ y: 10, duration: 800, delay: 800 }}
        out:fly={{ y: -10, duration: 800 , isExit: true}}
        class={cn(
          "col-start-1 row-start-1 flex flex-col items-center justify-center text-center",
          isTvMode ? "gap-10" : "gap-6"
        )}
      >
        <span
          class={cn(
            "text-[var(--md-sys-color-primary)]/80 font-black uppercase",
            isTvMode ? "text-lg sm:text-xl lg:text-2xl tracking-[0.5em]" : "text-xs sm:text-sm tracking-[0.4em]"
          )}
        >
          {appSettings.t("solatModeHeading")}
        </span>

        <h1
          class={cn(
            "font-black tracking-tight text-[var(--md-sys-color-on-surface)] animate-[pulse-opacity_4s_ease-in-out_infinite]",
            isTvMode ? "text-7xl sm:text-8xl lg:text-[7.5rem] xl:text-[9.5rem]" : "text-5xl sm:text-7xl lg:text-8xl"
          )}
        >
          {prayerName}
        </h1>

        <p
          class={cn(
            "text-[var(--md-sys-color-on-surface-variant)] font-medium tracking-wide leading-relaxed",
            isTvMode ? "text-xl sm:text-2xl lg:text-3xl max-w-3xl mt-4" : "text-sm sm:text-base max-w-sm mt-2"
          )}
        >
          {appSettings.t("solatModeInstruction")}
        </p>

        <!-- Elegant static divider -->
        <div
          class={cn(
            "rounded bg-[var(--md-sys-color-primary)]/30",
            isTvMode ? "w-32 h-1.5 mt-8" : "w-16 h-0.5 mt-4"
          )}
        ></div>
      </div>
    {:else}
      <div
        in:fly={{ y: 10, duration: 800, delay: 800 }}
        out:fly={{ y: -10, duration: 800 , isExit: true}}
        class={cn(
          "col-start-1 row-start-1 flex flex-col items-center justify-center text-center",
          isTvMode ? "gap-10" : "gap-8"
        )}
      >
        <span
          class={cn(
            "text-[var(--md-sys-color-primary)]/80 font-black uppercase",
            isTvMode ? "text-lg sm:text-xl lg:text-2xl tracking-[0.5em]" : "text-xs sm:text-sm tracking-[0.4em]"
          )}
        >
          {appSettings.t("solatModeDuaHeading")}
        </span>

        <!-- Calligraphic Dhikr Screen -->
        <div
          class={cn(
            "grid items-center justify-center px-4 w-full",
            isTvMode ? "min-h-[220px]" : "min-h-[140px]"
          )}
        >
          {#key dhikrIndex}
            <p
              in:scale={{ start: 0.95, duration: 1200, delay: 1200 }}
              out:scale={{ start: 1.05, duration: 1200 }}
              class={cn(
                "col-start-1 row-start-1 font-serif text-[var(--md-sys-color-tertiary)] font-bold leading-relaxed tracking-wide drop-shadow-[0_2px_15px_rgba(var(--md-sys-color-tertiary-rgb),0.15)]",
                isTvMode ? "text-5xl sm:text-7xl lg:text-[6.5rem] xl:text-[8rem]" : "text-3.5xl sm:text-5.5xl lg:text-6.5xl"
              )}
            >
              {dhikrs[dhikrIndex]}
            </p>
          {/key}
        </div>

        <p
          class={cn(
            "text-[var(--md-sys-color-on-surface-variant)]/80 font-semibold tracking-wide leading-relaxed animate-pulse",
            isTvMode ? "text-lg sm:text-xl lg:text-2.5xl max-w-3xl mt-4" : "text-xs sm:text-sm max-w-md mt-2"
          )}
        >
          {appSettings.t("solatModeDuaInstruction")}
        </p>

        <!-- Elegant static divider -->
        <div
          class={cn(
            "rounded bg-[var(--md-sys-color-primary)]/20",
            isTvMode ? "w-24 h-1.5 mt-6" : "w-12 h-0.5 mt-2"
          )}
        ></div>
      </div>
    {/if}
  </div>

  <!-- Bottom: Qibla & Exit Panel -->
  <div
    class={cn(
      "w-full flex flex-col items-center z-10",
      isTvMode ? "gap-8" : "gap-6"
    )}
  >
    {#if showQibla}
      <div
        class={cn(
          "flex items-center text-[var(--md-sys-color-on-surface-variant)] font-semibold tracking-wider bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40",
          isTvMode ? "gap-3.5 text-lg lg:text-xl px-8 py-4 rounded-[24px]" : "gap-2.5 text-sm px-5 py-3 rounded-full"
        )}
      >
        <Compass
          size={isTvMode ? 24 : 16}
          class="text-[var(--md-sys-color-primary)]/80 shrink-0 animate-[spin_4s_linear_infinite]"
        />
        <span>Kiblat: 292.41° (Barat Laut)</span>
      </div>
    {/if}

    <div
      class={cn(
        "text-[var(--md-sys-color-on-surface-variant)]/60 font-medium h-4",
        isTvMode ? "text-base lg:text-lg" : "text-xs"
      )}
    >
      Automatik tamat dalam {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
    </div>
  </div>

  <!-- Overlay dismiss panel with Accidental Dismiss Protection -->
  {#if showExitButton}
    <div
      in:fly={{ y: 20, duration: 300 }}
      out:fly={{ y: 10, duration: 300 , isExit: true}}
      class="absolute bottom-24 inset-x-0 mx-auto w-fit z-20 flex flex-col items-center gap-2"
    >
      <md-filled-tonal-button
        onclick={handleExitClick}
        class="shadow-xl"
        style="--md-filled-tonal-button-container-shape: 24px; --md-filled-tonal-button-container-height: 48px; --md-filled-tonal-button-label-text-size: 14px;"
      >
        <span slot="icon" class="flex"><X size={16} class="stroke-[2.5]" /></span>
        {exitTapCount > 0 ? appSettings.t("doubleTapExit") : appSettings.t("exitSolatMode")}
      </md-filled-tonal-button>
      {#if exitTapCount > 0}
        <span
          in:fly={{ y: 5, duration: 200 }}
          class="text-[var(--md-sys-color-on-error-container)] font-bold bg-[var(--md-sys-color-error-container)] px-4 py-2 rounded-full shadow-sm text-center text-[10px]"
        >
          {appSettings.t("doubleTapExit")}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Typographic remote exit prompt for TV Mode -->
  {#if isTvMode && showExitButton}
    <div
      transition:fade={{ duration: 300 }}
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md text-center p-12"
    >
      <div
        in:fly={{ y: 15, duration: 400 }}
        out:fly={{ y: 15, duration: 300 , isExit: true}}
        class="space-y-6 max-w-3xl flex flex-col items-center"
      >
        <div
          class="w-24 h-24 rounded-full bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--md-sys-color-primary)]/20 shadow-inner"
        >
          <Clock size={48} class="animate-pulse" />
        </div>
        <h2 class="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase">
          {appSettings.t("exitSolatMode")}
        </h2>
        <p class="text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          {appSettings.t("wakeUpPrompt")}
        </p>
        <div class="pt-8">
          <span
            class="text-xs font-black tracking-widest text-[var(--md-sys-color-primary)] uppercase bg-[var(--md-sys-color-primary-container)]/20 px-5 py-2.5 rounded-full border border-[var(--md-sys-color-primary)]/30"
          >
            {exitTapCount > 0 ? "PRESS ANY KEY AGAIN TO EXIT" : "PRESS ANY KEY TO WAKE SCREEN"}
          </span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes pulse-opacity {
    0%,
    100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }
</style>
