<script lang="ts">
import { JAKIM_ZONES } from "../lib/zones";
import { Search, MapPin, X, Crosshair, Map as MapIcon, CheckCircle2 } from "lucide-svelte";
import { cn } from "../lib/utils";
import { fade, fly, slide } from "svelte/transition";
import "@material/web/iconbutton/filled-icon-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/ripple/ripple.js";
import "@material/web/elevation/elevation.js";
import "@material/web/focus/md-focus-ring.js";
import "@material/web/switch/switch.js";
import "@material/web/tabs/tabs.js";
import "@material/web/icon/icon.js";
import "@material/web/chips/filter-chip.js";
import "@material/web/textfield/outlined-text-field.js";

import MapModal from "./MapModal.svelte";
import { fetchReverseGeocode, matchZoneFromGeocode, ALIASES } from "../lib/geocoding";
import { analytics } from "../lib/analytics";
import { StorageManager } from "../lib/StorageManager";
import { sanitizeInput } from "../lib/security";
import { appSettings } from "../state/settings.svelte";

const STATE_FLAGS: Record<string, string> = {
  Johor: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Johor.svg",
  Kedah: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Kedah.svg",
  Kelantan: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Kelantan.svg",
  Melaka: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Malacca.svg",
  "Negeri Sembilan": "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Negeri_Sembilan.svg",
  Pahang: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Pahang.svg",
  Perak: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Perak.svg",
  Perlis: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Perlis.svg",
  "Pulau Pinang": "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Penang_(Malaysia).svg",
  Sabah: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Sabah.svg",
  Sarawak: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Sarawak.svg",
  Selangor: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Selangor.svg",
  Terengganu: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Terengganu.svg",
  "Wilayah Persekutuan": "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_the_Federal_Territories.svg",
};

let {
  selectedZone,
  onZoneSelect,
  isAutoDetecting = false,
  currentLocationName = null
}: {
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
  isAutoDetecting?: boolean;
  currentLocationName?: string | null;
} = $props();

const t = (key: any, params?: any) => appSettings.t(key, params);
const visualStyle = $derived(appSettings.settings.visualStyle);

let isOpen = $state(false);
let isMapOpen = $state(false);
let searchQuery = $state("");
let isDetecting = $state(false);
let locationPermission = $state<PermissionState | null>(null);
let userCoords = $state<{ lat: number; lng: number } | null>(null);
let inputRef = $state<any>(null);
let activeScrollState = $state<string | null>(null);
let scrollTimeoutRef = $state<number | null>(null);
let detectReason = $state<string | null>(null);

$effect(() => {
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      locationPermission = result.state;
      result.onchange = () => {
        locationPermission = result.state;
      };
    }).catch(() => {});
  }
});

$effect(() => {
  if (isOpen) {
    const timer = setTimeout(() => {
      if (inputRef) inputRef.focus();
    }, 150);
    return () => clearTimeout(timer);
  } else {
    searchQuery = "";
  }
});

const handleAutoDetect = () => {
  if ("geolocation" in navigator) {
    isDetecting = true;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        userCoords = { lat: latitude, lng: longitude };
        try {
          const data = await fetchReverseGeocode(latitude, longitude);
          const match = matchZoneFromGeocode(data);
          
          let reasonFound = "";
          if (match.reasonKey === "alias" || match.reasonKey === "locality") {
            reasonFound = t(match.reasonKey === "alias" ? "reasonMatchingArea" : "reasonMatchingLocality").replace(
              match.reasonKey === "alias" ? "{area}" : "{locality}",
              match.detailVal
            );
          } else if (match.reasonKey === "state") {
            reasonFound = t("reasonStateCapital").replace("{state}", match.detailVal);
          } else {
            reasonFound = "Kuala Lumpur (Lalai)";
          }

          onZoneSelect(match.zone);
          detectReason = reasonFound;
          setTimeout(() => { detectReason = null; }, 5000);
          isOpen = false;
        } catch (err) {
          analytics.logError(err, { context: "ZoneSelector_handleAutoDetect" });
          alert(t("failDetectLocation"));
        } finally {
          isDetecting = false;
        }
      },
      (geoError) => {
        analytics.logError(geoError, { context: "ZoneSelector_geolocation" });
        isDetecting = false;
        alert(t("failDetectLocation"));
      },
      { timeout: 5000 }
    );
  } else {
    alert(t("noSupportLocation"));
  }
};

let selectedLabel = $derived.by(() => {
  let label = t("selectZone");
  for (const state of JAKIM_ZONES) {
    const zone = state.zones.find((z) => z.v === selectedZone);
    if (zone) {
      label = zone.l;
      break;
    }
  }
  return label;
});

let selectedState = $derived.by(() => {
  let stateName = "";
  for (const state of JAKIM_ZONES) {
    const zone = state.zones.find((z) => z.v === selectedZone);
    if (zone) {
      stateName = state.state;
      break;
    }
  }
  return stateName;
});

let filteredZones = $derived.by(() => {
  if (!searchQuery.trim()) return JAKIM_ZONES;

  const query = searchQuery.toLowerCase().trim();
  const aliasZoneCode = ALIASES[query];

  return JAKIM_ZONES.map((state) => {
    const matchingZones = state.zones.filter(
      (zone) =>
        zone.l.toLowerCase().includes(query) ||
        zone.v.toLowerCase().includes(query) ||
        (aliasZoneCode && zone.v === aliasZoneCode)
    );
    return {
      ...state,
      zones: matchingZones,
    };
  }).filter((state) => state.zones.length > 0);
});

let recentFiltered = $derived(
  !searchQuery ? StorageManager.getRecentZones().filter((z: string) => z !== selectedZone).slice(0, 5) : []
);

function getZoneLabel(code: string) {
  for (const state of JAKIM_ZONES) {
    const found = state.zones.find(z => z.v === code);
    if (found) return found.l;
  }
  return code;
}

const handleScroll = (e: Event) => {
  const container = e.currentTarget as HTMLDivElement;

  const stateSections = container.querySelectorAll('.state-group-marker');
  let closestState: string | null = null;
  let minDistance = Infinity;
  
  stateSections.forEach(section => {
    const rect = section.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const distance = Math.abs(rect.top - containerRect.top);
    if (distance < minDistance && distance < 300) {
      minDistance = distance;
      closestState = section.getAttribute('data-state');
    }
  });

  if (closestState && closestState !== activeScrollState) {
    activeScrollState = closestState;
  }

  if (scrollTimeoutRef !== null) {
    clearTimeout(scrollTimeoutRef);
  }
  
  scrollTimeoutRef = setTimeout(() => {
    activeScrollState = null;
  }, 800) as any;
};
</script>

{#if detectReason}
  <div
    in:fly={{ y: -50, duration: 300 }}
    out:fly={{ y: -20, duration: 300 }}
    class="fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-[90vw] w-max bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] px-6 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--md-sys-color-primary)]/20 flex items-center gap-3 font-semibold text-sm"
  >
    <MapPin
      size={20}
      class="text-[var(--md-sys-color-primary)] animate-pulse"
    />
    <span class="truncate">{detectReason}</span>
  </div>
{/if}

<div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
  <button
    onclick={() => isOpen = true}
    class={cn(
      "relative flex-1 max-w-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] rounded-[20px] sm:rounded-[24px] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between group shadow-sm border border-[var(--md-sys-color-outline)]/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
      visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] hover:shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)]",
      visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[8px] border border-[var(--glass-border)]",
      visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
    )}
  >
    <md-ripple></md-ripple>
    <div class="flex items-center w-full min-w-0">
      <div class="w-9 h-9 lg:w-11 lg:h-11 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-[10px] sm:rounded-[12px] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm mr-3">
        <MapPin size={20} class={cn(
          "lg:w-6 lg:h-6",
          visualStyle === 'retro' && "stroke-[3]",
          (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
          !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.5]"
        )} />
      </div>
      <div class="flex flex-col overflow-hidden min-w-0 flex-1 text-left justify-center">
        <span class="text-lg sm:text-xl lg:text-2xl leading-tight font-black tracking-tighter truncate w-full group-hover:text-[var(--md-sys-color-primary)] transition-colors">
          {selectedLabel}
        </span>
        <span class="text-[10px] sm:text-[11px] lg:text-xs font-bold tracking-wide flex items-center gap-1.5 truncate mt-0.5 opacity-80">
          {#if STATE_FLAGS[selectedState]}
            <div class="flex items-center justify-center w-[16px] h-[12px] sm:w-[18px] sm:h-[14px] bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.1)] shrink-0 rounded-[2px]">
              <img
                src={STATE_FLAGS[selectedState]}
                alt=""
                class="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
          {/if}
          <span class="truncate">{selectedState}</span>
          <span class="font-sans font-black ml-auto flex-shrink-0 opacity-70">
            {selectedZone}
          </span>
        </span>
      </div>
    </div>
  </button>

  <div class="shrink-0 inline-flex w-[48px] h-[48px] lg:w-[56px] lg:h-[56px] hover:scale-105 active:scale-95 transition-transform duration-200">
    <md-filled-tonal-icon-button
      onclick={() => isMapOpen = true}
      title={t("viewMap")}
      style="--md-filled-tonal-icon-button-container-shape: 20px; width: 100%; height: 100%;"
    >
      <MapIcon class={cn(
        "w-[22px] h-[22px] lg:w-[24px] lg:h-[24px]",
        visualStyle === 'retro' && "stroke-[3]",
        (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
        !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.5]"
      )} />
    </md-filled-tonal-icon-button>
  </div>
</div>

<MapModal
  isOpen={isMapOpen}
  onClose={() => isMapOpen = false}
  {selectedZone}
  userLocation={userCoords}
  onZoneSelect={(zone: string) => {
    onZoneSelect(zone);
    isMapOpen = false;
  }}
/>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 sm:overflow-y-auto"
    onclick={() => isOpen = false}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:fly={{ y: 200, duration: 400 }}
      out:fly={{ y: 200, duration: 300 }}
      onclick={(e) => e.stopPropagation()}
      class="bg-[var(--md-sys-color-surface)] w-full max-w-4xl h-[85vh] sm:h-[85vh] max-h-[800px] flex flex-col rounded-[var(--md-sys-shape-corner-extra-large)] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.3)] sm:my-auto border border-[var(--md-sys-color-outline)]/10"
    >
      <div class="p-6 md:p-8 bg-[var(--md-sys-color-surface-container-low)]/80 backdrop-blur-xl z-10 shrink-0 border-b border-[var(--md-sys-color-outline)]/10 flex flex-col gap-6">
        <div class="flex items-start justify-between">
          <div class="pr-4">
            <h2 class="text-3xl md:text-5xl font-black tracking-tighter text-[var(--md-sys-color-primary)] leading-none mb-2 drop-shadow-sm">
              {t("selectZone")}
            </h2>
            <p class="text-[var(--md-sys-color-on-surface-variant)] text-base font-medium opacity-80">
              {t("selectZoneDesc")}
            </p>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <md-icon-button onclick={() => isOpen = false}>
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>

        <div class="mb-2 w-full bg-[var(--md-sys-color-surface-container-high)]/50 backdrop-blur-md rounded-[20px] overflow-hidden">
          <md-tabs activeTabIndex={appSettings.settings.locationMode === 'auto' ? 1 : 0}>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-primary-tab onclick={() => appSettings.updateSettings({ locationMode: 'manual' })}>
              {t('modeManual') || "Manual Selection"}
              <md-icon slot="icon">search</md-icon>
            </md-primary-tab>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-primary-tab onclick={() => {
              appSettings.updateSettings({ locationMode: 'auto' });
              searchQuery = "";
            }}>
              {t('modeAuto') || "Auto Tracking"}
              <md-icon slot="icon">my_location</md-icon>
            </md-primary-tab>
          </md-tabs>
        </div>

        {#if locationPermission === 'denied'}
          <div
            in:slide={{ duration: 180 }}
            out:slide={{ duration: 180 }}
            class="bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-on-error-container)] px-5 py-4 rounded-2xl mb-2 text-sm shadow-sm"
          >
            <h4 class="font-bold mb-1">Akses Lokasi Ditolak</h4>
            <p class="opacity-90 leading-tight">Sila benarkan akses lokasi dalam tetapan pelayar web anda untuk menggunakan ciri kemas kini zon automatik.</p>
          </div>
        {/if}

        {#if appSettings.settings.locationMode !== 'auto'}
          <div 
            in:slide={{ duration: 180 }}
            out:slide={{ duration: 180 }}
            class="flex flex-col gap-4"
          >
            <div class="relative group w-full mb-2">
              <md-outlined-text-field
                bind:this={inputRef}
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                oninput={(e: any) => searchQuery = sanitizeInput(e.target.value)}
                class="w-full"
                style="--md-outlined-text-field-container-shape: 28px; --md-sys-color-surface-variant: var(--md-sys-color-surface-container-highest);"
              >
                <md-icon slot="leading-icon">search</md-icon>
                {#if searchQuery}
                  <md-icon-button
                    slot="trailing-icon"
                    onclick={() => searchQuery = ""}
                  >
                    <md-icon>close</md-icon>
                  </md-icon-button>
                {/if}
              </md-outlined-text-field>
            </div>

            {#if !searchQuery}
              <md-filled-tonal-button
                onclick={handleAutoDetect}
                disabled={isDetecting}
                class="w-full shadow-sm"
                style="--md-filled-tonal-button-container-height: 52px; --md-filled-tonal-button-container-shape: 26px;"
              >
                <span slot="icon" class="contents">
                  <Crosshair
                    size={20}
                    class={isDetecting ? "animate-spin" : ""}
                  />
                </span>
                {isDetecting ? t("detecting") : t("detectLocation")}
              </md-filled-tonal-button>
            {/if}
          </div>
        {/if}
      </div>

      <div 
        class="flex-1 overflow-y-auto bg-[var(--md-sys-color-surface)] scroll-smooth custom-scrollbar relative"
        onscroll={handleScroll}
        ontouchmove={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        {#if appSettings.settings.locationMode === 'auto'}
          <div
            in:fade={{ duration: 200 }}
            class="flex flex-col items-center justify-center h-full p-6 text-center"
          >
            <div class="w-20 h-20 bg-[var(--md-sys-color-secondary-container)] rounded-full flex items-center justify-center mb-6 text-[var(--md-sys-color-on-secondary-container)] shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <Crosshair size={36} class={cn("opacity-80", isAutoDetecting && "animate-spin")} />
            </div>
            <h3 class="text-2xl font-black text-[var(--md-sys-color-on-surface)] mb-2">
              {isAutoDetecting ? t("detecting") : (t('autoModeActive') || "Auto Mode Active")}
            </h3>
            <p class="text-[var(--md-sys-color-on-surface-variant)] text-base max-w-[280px] mx-auto mb-10 opacity-80">
              {isAutoDetecting ? "Memeriksa isyarat GPS..." : (t('autoModeActiveDesc') || "Your zone will update automatically as you travel.")}
            </p>
            
            <div class="bg-[var(--md-sys-color-surface-container)]/80 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm border border-[var(--md-sys-color-outline)]/10 shadow-lg relative overflow-hidden group">
              <div class="absolute inset-0 bg-gradient-to-br from-[var(--md-sys-color-primary)]/5 to-[var(--md-sys-color-secondary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <p class="text-[11px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-2 opacity-80 relative z-10">
                {t('autoModeCurrent') || "Current Detected Location:"}
              </p>
              <p class="text-2xl font-black leading-tight text-[var(--md-sys-color-on-surface)] mb-2 truncate relative z-10">
                {isAutoDetecting ? "Sedang menjejak..." : (currentLocationName || selectedLabel)}
              </p>
              <div class="inline-flex bg-[var(--md-sys-color-surface-variant)]/60 px-3 py-1 rounded-lg text-sm font-sans font-bold text-[var(--md-sys-color-on-surface-variant)] mt-1 relative z-10 shadow-sm border border-[var(--md-sys-color-outline)]/5">
                {selectedZone}
              </div>
            </div>
          </div>
        {:else}
          <div in:fade={{ duration: 200 }}>
            {#if !searchQuery && recentFiltered.length > 0}
              <div class="px-6 md:px-8 pt-6 pb-2">
                <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--md-sys-color-primary)] mb-3 flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] opacity-80"></span>
                  {t('recentLocations') || "Recent Locations"}
                </h3>
                <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-2 px-2 snap-x">
                  {#each recentFiltered as code (code)}
                    <md-filter-chip
                      label={getZoneLabel(code)}
                      class="snap-start shrink-0"
                      onclick={() => {
                        onZoneSelect(code);
                        isOpen = false;
                      }}
                    ></md-filter-chip>
                  {/each}
                </div>
              </div>
            {/if}

            {#if activeScrollState}
              <div
                transition:fly={{ y: -20, duration: 300 }}
                class="fixed top-[45%] left-1/2 -translate-x-1/2 z-[300] pointer-events-none bg-[var(--md-sys-color-surface-container-highest)]/90 backdrop-blur-3xl px-8 py-6 rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center gap-4 border border-[var(--md-sys-color-outline)]/20"
              >
                {#if STATE_FLAGS[activeScrollState]}
                  <div class="w-[84px] h-[56px] bg-white rounded-[6px] overflow-hidden shadow-md">
                     <img src={STATE_FLAGS[activeScrollState]} class="w-full h-full object-cover" alt="State Flag" />
                  </div>
                {/if}
                <h3 class="text-2xl md:text-3xl font-black text-[var(--md-sys-color-on-surface)] uppercase tracking-[0.15em] leading-none drop-shadow-md">
                  {activeScrollState}
                </h3>
              </div>
            {/if}

            {#if filteredZones.length === 0}
              <div
                in:fade={{ duration: 200 }}
                class="h-full flex flex-col items-center justify-center opacity-70 space-y-4 p-4 md:p-6 mt-12"
              >
                <div class="w-20 h-20 rounded-full bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center shadow-inner">
                  <Search
                    size={40}
                    class="text-[var(--md-sys-color-on-surface-variant)]"
                  />
                </div>
                <p class="text-[var(--md-sys-color-on-surface-variant)] font-bold text-xl">
                  {t("noMatch")} "{searchQuery}"
                </p>
              </div>
            {:else}
              <div class="pb-16 px-4 md:px-6">
                <md-list class="bg-transparent p-0">
                  {#each filteredZones as state (state.state)}
                    <div class="mb-6 state-group-marker relative" data-state={state.state}>
                      <div class="flex items-center gap-3 sm:gap-4 sticky top-0 z-20 bg-[var(--md-sys-color-surface)]/95 backdrop-blur-2xl py-3 px-2 shadow-sm border-b border-[var(--md-sys-color-outline)]/10">
                        <div class="flex items-center justify-center w-[28px] h-[18px] sm:w-[32px] sm:h-[22px] bg-white overflow-hidden shadow-sm shrink-0 rounded-[3px]">
                          {#if STATE_FLAGS[state.state]}
                            <img
                              src={STATE_FLAGS[state.state]}
                              alt={`Bendera ${state.state}`}
                              class="w-full h-full object-cover"
                            />
                          {:else}
                            <MapPin size={18} class="text-gray-400" />
                          {/if}
                        </div>
                        <h3 class="text-[var(--md-sys-color-primary)] font-black uppercase tracking-[0.15em] text-sm sm:text-base pr-2">
                          {state.state}
                        </h3>
                      </div>
                      <div class="flex flex-col mt-2">
                        {#each state.zones as zone (zone.v)}
                          {@const isSelected = selectedZone === zone.v}
                          <md-list-item
                            type="button"
                            onclick={() => {
                              onZoneSelect(zone.v);
                              isOpen = false;
                            }}
                            class="my-0.5 block w-full outline-none"
                            style="--md-list-item-container-shape: 16px; --md-list-item-container-color: {isSelected ? 'var(--md-sys-color-primary-container)' : 'transparent'}; --md-list-item-label-text-color: {isSelected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)'}; --md-list-item-supporting-text-color: {isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'}; --md-list-item-hover-state-layer-color: var(--md-sys-color-on-surface); --md-list-item-hover-state-layer-opacity: 0.08;"
                          >
                            <div slot="headline" class={cn(
                              "font-bold text-[15px] leading-tight transition-colors",
                              isSelected ? "text-[var(--md-sys-color-on-primary-container)]" : "text-[var(--md-sys-color-on-surface)]"
                            )}>
                              {zone.l}
                            </div>
                            <div slot="supporting-text" class={cn(
                              "text-xs font-sans font-bold tracking-wider mt-0.5 transition-colors",
                              isSelected ? "text-[var(--md-sys-color-primary)]" : "text-[var(--md-sys-color-on-surface-variant)]"
                            )}>
                              {zone.v}
                            </div>
                            {#if isSelected}
                              <div slot="end" class="text-[var(--md-sys-color-primary)] flex items-center justify-center w-8 h-8 rounded-full bg-[var(--md-sys-color-on-primary)] shadow-sm shrink-0">
                                <CheckCircle2 size={18} strokeWidth={3} />
                              </div>
                            {/if}
                          </md-list-item>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </md-list>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
