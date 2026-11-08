<script lang="ts">
import { tick } from 'svelte';
import { JAKIM_ZONES } from "../lib/zones";
import { Search, MapPin, X, Crosshair, Map as MapIcon, CheckCircle2 } from "lucide-svelte";
import { cn } from "../lib/utils";
import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
import { Tabs, TextField, FilterChip, Button, IconButton } from "$lib/components/ui";
import { ripple } from "$lib/actions/ripple";
import { goto } from "$app/navigation";
import { fetchReverseGeocode, matchZoneFromGeocode, findNearestZone, ALIASES } from "../lib/geocoding";
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
  currentLocationName = null,
  isSearching = $bindable(false)
}: {
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
  isAutoDetecting?: boolean;
  currentLocationName?: string | null;
  isSearching?: boolean;
} = $props();

const t = (key: any, params?: any) => appSettings.t(key, params);
const visualStyle = $derived(appSettings.settings.visualStyle);

let isOpen = $state(false);
let searchQuery = $state("");
let isDetecting = $state(false);
let locationPermission = $state<PermissionState | null>(null);
let userCoords = $state<{ lat: number; lng: number } | null>(null);
let activeScrollState = $state<string | null>(null);
let scrollTimeoutRef = $state<number | null>(null);
let detectReason = $state<string | null>(null);

// Inline search expander state
let inlineSearchInput = $state<HTMLInputElement | undefined>();
let inlineSearchQuery = $state("");
let activeInlineIndex = $state(0);
let searchContainerRef = $state<HTMLDivElement | undefined>();

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
  if (!isOpen) {
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
          // Offline GPS centroid fallback
          try {
            const nearest = findNearestZone(latitude, longitude);
            onZoneSelect(nearest);
            detectReason = "GPS Centroid (Luar Talian)";
            setTimeout(() => { detectReason = null; }, 5000);
            isOpen = false;
          } catch (offlineErr) {
            analytics.logError(err, { context: "ZoneSelector_handleAutoDetect" });
            alert(t("failDetectLocation"));
          }
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

function openInlineSearch() {
  isSearching = true;
  inlineSearchQuery = "";
  activeInlineIndex = 0;
  tick().then(() => {
    inlineSearchInput?.focus();
  });
}

function closeInlineSearch() {
  isSearching = false;
  inlineSearchQuery = "";
}

function handleInlineSelect(zoneCode: string) {
  onZoneSelect(zoneCode);
  closeInlineSearch();
}

function handleInlineKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeInlineSearch();
    return;
  }
  const total = inlineResultsList.length;
  if (total === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeInlineIndex = (activeInlineIndex + 1) % total;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeInlineIndex = (activeInlineIndex - 1 + total) % total;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const selected = inlineResultsList[activeInlineIndex];
    if (selected) {
      handleInlineSelect(selected.v);
    }
  }
}

function handleWindowClick(e: MouseEvent) {
  if (isSearching && searchContainerRef && !searchContainerRef.contains(e.target as Node)) {
    closeInlineSearch();
  }
}

let inlineResultsList = $derived.by(() => {
  const q = inlineSearchQuery.toLowerCase().trim();
  if (!q) {
    const recentCodes = StorageManager.getRecentZones().filter((z: string) => z !== selectedZone).slice(0, 4);
    if (recentCodes.length > 0) {
      return recentCodes.map(code => {
        let stateName = "";
        let label = code;
        for (const s of JAKIM_ZONES) {
          const found = s.zones.find(z => z.v === code);
          if (found) {
            stateName = s.state;
            label = found.l;
            break;
          }
        }
        return { state: stateName, v: code, l: label, isRecent: true };
      });
    }
    const defaults = ['WLY01', 'SGR01', 'JHR02', 'PNG01', 'PRK02'];
    return defaults.map(code => {
      let stateName = "";
      let label = code;
      for (const s of JAKIM_ZONES) {
        const found = s.zones.find(z => z.v === code);
        if (found) {
          stateName = s.state;
          label = found.l;
          break;
        }
      }
      return { state: stateName, v: code, l: label, isRecent: false };
    });
  }

  const aliasZoneCode = ALIASES[q];
  const results: { state: string; v: string; l: string; isRecent: boolean }[] = [];

  for (const state of JAKIM_ZONES) {
    for (const zone of state.zones) {
      const matchesLabel = zone.l.toLowerCase().includes(q);
      const matchesCode = zone.v.toLowerCase().includes(q);
      const matchesState = state.state.toLowerCase().includes(q);
      const matchesAlias = aliasZoneCode && zone.v.toLowerCase() === aliasZoneCode.toLowerCase();

      if (matchesLabel || matchesCode || matchesState || matchesAlias) {
        results.push({
          state: state.state,
          v: zone.v,
          l: zone.l,
          isRecent: false
        });
      }
    }
  }
  return results.slice(0, 8);
});
</script>

{#if detectReason}
  <div
    in:fly={{ y: -50, duration: 300 }}
    out:fly={{ y: -20, duration: 300 , isExit: true}}
    class="fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-[90vw] w-max bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] px-6 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--md-sys-color-primary)]/20 flex items-center gap-3 font-semibold text-sm"
  >
    <MapPin
      size={20}
      class="text-[var(--md-sys-color-primary)] animate-pulse"
    />
    <span class="truncate">{detectReason}</span>
  </div>
{/if}

<svelte:window onmousedown={handleWindowClick} />

<div class="relative flex items-center gap-2 flex-1 min-w-0" bind:this={searchContainerRef}>
  {#if isSearching}
    <div
      in:fly={{ y: -6, duration: 250 }}
      out:fly={{ y: -6, duration: 200 }}
      class={cn(
        "relative flex-1 h-11 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-full flex items-center px-2.5 sm:px-3 gap-2 border border-[var(--md-sys-color-primary)]/50 shadow-sm focus-within:ring-2 focus-within:ring-[var(--md-sys-color-primary)] transition-all",
        visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)]",
        visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[12px] border border-[var(--glass-border)]"
      )}
    >
      <div class="w-7 h-7 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0">
        <Search size={14} class="stroke-[2.5]" />
      </div>

      <input
        bind:this={inlineSearchInput}
        bind:value={inlineSearchQuery}
        type="text"
        placeholder={t("searchPlaceholder") || "Cari zon atau daerah..."}
        class="bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-on-surface-variant)]/60 flex-1 min-w-0 font-medium"
        onkeydown={handleInlineKeydown}
      />

      {#if inlineSearchQuery}
        <button
          type="button"
          onclick={() => { inlineSearchQuery = ""; inlineSearchInput?.focus(); }}
          class="w-6 h-6 rounded-full hover:bg-[var(--md-sys-color-outline)]/20 flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] transition-colors shrink-0"
          title="Kosongkan carian"
          aria-label="Clear search"
        >
          <X size={14} class="stroke-[2.5]" />
        </button>
      {/if}

      <button
        type="button"
        onclick={closeInlineSearch}
        class="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-surface-container-highest)] text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1 transition-colors border border-[var(--md-sys-color-outline-variant)]/40 shrink-0 cursor-pointer"
        title="Tutup carian"
        aria-label="Close search"
      >
        <span class="hidden sm:inline">Batal</span>
        <X size={14} class="sm:hidden stroke-[2.2]" />
      </button>
    </div>

    <!-- Floating Results Popover Dropdown -->
    <div
      in:fly={{ y: -8, duration: 200 }}
      out:fade={{ duration: 150 }}
      class="absolute top-[calc(100%+8px)] left-0 w-full min-w-[280px] sm:min-w-[380px] md:min-w-[460px] max-w-[calc(100vw-24px)] bg-[var(--md-sys-color-surface-container-high)] rounded-3xl shadow-2xl border border-[var(--md-sys-color-outline-variant)]/40 p-2 z-[150] max-h-[380px] flex flex-col overflow-hidden backdrop-blur-xl"
    >
      <!-- Quick GPS Auto-Detect Option -->
      <button
        use:ripple
        type="button"
        onclick={() => { closeInlineSearch(); handleAutoDetect(); }}
        disabled={isDetecting}
        class="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[var(--md-sys-color-primary-container)]/50 text-[var(--md-sys-color-on-surface)] transition-colors text-left group cursor-pointer"
      >
        <div class="w-8 h-8 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shrink-0">
          <Crosshair size={16} class={cn("stroke-[2.2]", isDetecting && "animate-spin")} />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-[var(--md-sys-color-primary)]">
            {isDetecting ? (t("detecting") || "Mengesan lokasi...") : (t("detectLocation") || "Kesan Lokasi GPS Semasa")}
          </div>
          <div class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">
            {currentLocationName || "Padankan zon secara automatik berasaskan GPS"}
          </div>
        </div>
      </button>

      <div class="h-px bg-[var(--md-sys-color-outline-variant)]/30 my-1"></div>

      <!-- Results List Header -->
      <div class="px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
        <span>{inlineSearchQuery ? `${inlineResultsList.length} Zon Dijumpai` : 'Cadangan & Zon Terkini'}</span>
        <span class="text-[10px] opacity-70">Tekan Enter untuk pilih</span>
      </div>

      <!-- Scrollable Results -->
      <div class="flex-1 overflow-y-auto no-scrollbar space-y-1 max-h-[220px]">
        {#if inlineResultsList.length === 0}
          <div class="p-4 text-center text-xs text-[var(--md-sys-color-on-surface-variant)]">
            Tiada zon dijumpai untuk "{inlineSearchQuery}". Cuba cari nama daerah atau negeri.
          </div>
        {:else}
          {#each inlineResultsList as item, idx}
            {@const isHighlighted = idx === activeInlineIndex}
            <button
              use:ripple
              type="button"
              onclick={() => handleInlineSelect(item.v)}
              onmouseenter={() => activeInlineIndex = idx}
              class={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left transition-colors cursor-pointer",
                isHighlighted
                  ? "bg-[var(--md-sys-color-surface-container-highest)] ring-1 ring-[var(--md-sys-color-primary)]/40"
                  : "hover:bg-[var(--md-sys-color-surface-container)]"
              )}
            >
              {#if STATE_FLAGS[item.state]}
                <div class="flex items-center justify-center w-[20px] h-[14px] bg-white overflow-hidden shadow-xs shrink-0 rounded-[3px]">
                  <img
                    src={STATE_FLAGS[item.state]}
                    alt=""
                    class="w-full h-full object-cover select-none pointer-events-none"
                  />
                </div>
              {:else}
                <div class="w-5 h-5 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center shrink-0">
                  <MapPin size={11} />
                </div>
              {/if}

              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                  {item.l}
                </div>
                <div class="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate flex items-center gap-1.5">
                  <span>{item.state}</span>
                  {#if item.isRecent}
                    <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] font-semibold">Terkini</span>
                  {/if}
                </div>
              </div>

              <span class="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-primary)] border border-[var(--md-sys-color-outline-variant)]/30 shrink-0">
                {item.v}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Bottom action: Open full modal -->
      <div class="h-px bg-[var(--md-sys-color-outline-variant)]/30 my-1"></div>
      <button
        use:ripple
        type="button"
        onclick={() => { closeInlineSearch(); goto(`/map?zone=${selectedZone}`); }}
        class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer"
      >
        <MapIcon size={14} class="stroke-[2.2]" />
        <span>Papar pada Peta Interaktif (GPS)</span>
      </button>
      <button
        use:ripple
        type="button"
        onclick={() => { closeInlineSearch(); isOpen = true; }}
        class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors cursor-pointer"
      >
        <span>Lihat Semua 14 Negeri & Tetapan Zon Lengkap</span>
      </button>
    </div>
  {:else}
    <button
      use:ripple
      onclick={openInlineSearch}
      class={cn(
        "relative flex-1 max-w-full h-11 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] rounded-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] px-2.5 sm:px-3 flex items-center justify-between group shadow-xs border border-[var(--md-sys-color-outline-variant)]/40 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer",
        visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[4px_4px_0px_0px_var(--md-sys-color-on-surface)] hover:shadow-[2px_2px_0px_0px_var(--md-sys-color-on-surface)]",
        visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[8px] border border-[var(--glass-border)]",
        visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
      )}
      title="Cari atau tukar zon solat"
    >
      <div class="flex items-center w-full min-w-0">
        <div class="w-8 h-8 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shrink-0 shadow-xs mr-2.5">
          <MapPin size={16} class={cn(
            "shrink-0",
            visualStyle === 'retro' && "stroke-[3]",
            (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
            !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.2]"
          )} />
        </div>
        <div class="flex flex-col overflow-hidden min-w-0 flex-1 text-left justify-center">
          <span class="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate leading-tight">
            {selectedLabel}
          </span>
          <span class="text-[11px] font-medium text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1.5 truncate leading-none mt-0.5">
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
            <span class="font-sans font-bold ml-auto flex-shrink-0 opacity-70 text-[10px]">
              {selectedZone}
            </span>
          </span>
        </div>
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] opacity-60 group-hover:opacity-100 group-hover:bg-[var(--md-sys-color-outline)]/10 ml-1.5 shrink-0 transition-all">
          <Search size={14} class="stroke-[2.2]" />
        </div>
      </div>
    </button>

    <div class="shrink-0 inline-flex hover:scale-105 active:scale-95 transition-transform duration-200" style:view-transition-name="map-transition">
      <IconButton
        variant="tonal"
        shape="circle"
        size="md"
        class="w-11 h-11"
        onclick={() => goto(`/map?zone=${selectedZone}`)}
        title={t("viewMap")}
        ariaLabel={t("viewMap")}
      >
        <MapIcon class={cn(
          "w-5 h-5",
          visualStyle === 'retro' && "stroke-[3]",
          (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
          !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.2]"
        )} />
      </IconButton>
    </div>
  {/if}
</div>

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
      out:fly={{ y: 200, duration: 300 , isExit: true}}
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
          <div class="flex items-center gap-2">
            <IconButton
              variant="tonal"
              size="md"
              shape="circle"
              onclick={() => {
                isOpen = false;
                goto(`/map?zone=${selectedZone}`);
              }}
              title={t("viewMap")}
              ariaLabel={t("viewMap")}
            >
              <MapIcon size={20} class="stroke-[2.2]" />
            </IconButton>
            <IconButton
              variant="standard"
              size="md"
              shape="circle"
              onclick={() => isOpen = false}
              title="Close"
              ariaLabel="Close"
            >
              <X size={24} strokeWidth={2.5} />
            </IconButton>
          </div>
        </div>

        <div class="mb-2 w-full">
          <Tabs
            tabs={[
              { id: 'manual', label: t('modeManual') || "Manual Selection", icon: Search },
              { id: 'auto', label: t('modeAuto') || "Auto Tracking", icon: Crosshair }
            ]}
            activeTab={appSettings.settings.locationMode || 'auto'}
            onchange={(tabId) => {
              appSettings.updateSettings({ locationMode: tabId as any });
              if (tabId === 'auto') {
                searchQuery = "";
              }
            }}
          />
        </div>

        {#if locationPermission === 'denied'}
          <div
            in:slide={{ duration: 180 }}
            out:slide={{ duration: 180 , isExit: true}}
            class="bg-[var(--md-sys-color-error-container)]/80 text-[var(--md-sys-color-on-error-container)] px-5 py-4 rounded-2xl mb-2 text-sm shadow-sm"
          >
            <h4 class="font-bold mb-1">Akses Lokasi Ditolak</h4>
            <p class="opacity-90 leading-tight">Sila benarkan akses lokasi dalam tetapan pelayar web anda untuk menggunakan ciri kemas kini zon automatik.</p>
          </div>
        {/if}

        {#if appSettings.settings.locationMode !== 'auto'}
          <div 
            in:slide={{ duration: 180 }}
            out:slide={{ duration: 180 , isExit: true}}
            class="flex flex-col gap-4"
          >
            <div class="relative group w-full mb-2">
              <TextField
                bind:value={searchQuery}
                placeholder={t("searchPlaceholder")}
                clearable={true}
                class="w-full"
              >
                {#snippet leadingIcon()}
                  <Search size={20} class="text-[var(--md-sys-color-on-surface-variant)]" />
                {/snippet}
              </TextField>
            </div>

            {#if !searchQuery}
              <Button
                variant="tonal"
                shape="pill"
                size="lg"
                onclick={handleAutoDetect}
                disabled={isDetecting}
                class="w-full shadow-sm"
              >
                {#snippet leadingIcon()}
                  <Crosshair
                    size={20}
                    class={isDetecting ? "animate-spin" : ""}
                  />
                {/snippet}
                {isDetecting ? t("detecting") : t("detectLocation")}
              </Button>
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
                    <div class="snap-start shrink-0">
                      <FilterChip
                        label={getZoneLabel(code)}
                        onclick={() => {
                          onZoneSelect(code);
                          isOpen = false;
                        }}
                      />
                    </div>
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
                <div class="flex flex-col gap-8">
                  {#each filteredZones as state (state.state)}
                    <div class="state-group-marker relative" data-state={state.state}>
                      <div class="flex items-center gap-3 sm:gap-4 sticky top-0 z-20 bg-[var(--md-sys-color-surface)]/90 backdrop-blur-3xl py-3 px-2 mb-3 shadow-sm border-b border-[var(--md-sys-color-outline)]/10 rounded-b-xl">
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
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {#each state.zones as zone (zone.v)}
                          {@const isSelected = selectedZone === zone.v}
                          <button
                            type="button"
                            use:ripple
                            onclick={() => {
                              onZoneSelect(zone.v);
                              isOpen = false;
                            }}
                            class={cn(
                              "relative overflow-hidden text-left px-4 py-3 sm:py-4 rounded-[20px] flex items-center justify-between group transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]",
                              isSelected 
                                ? "bg-[var(--md-sys-color-primary-container)] shadow-sm scale-[1.02] sm:scale-100" 
                                : "hover:bg-[var(--md-sys-color-surface-container-high)] bg-[var(--md-sys-color-surface-container-low)] hover:scale-[1.02] active:scale-[0.98]"
                            )}
                          >
                            <div class="flex flex-col flex-1 min-w-0 pr-3">
                              <span class={cn(
                                "font-bold text-[14px] sm:text-[15px] leading-tight transition-colors truncate",
                                isSelected ? "text-[var(--md-sys-color-on-primary-container)]" : "text-[var(--md-sys-color-on-surface)] group-hover:text-[var(--md-sys-color-primary)]"
                              )}>
                                {zone.l}
                              </span>
                              <span class={cn(
                                "text-[11px] font-sans font-bold tracking-widest mt-1 transition-colors",
                                isSelected ? "text-[var(--md-sys-color-primary)]" : "text-[var(--md-sys-color-on-surface-variant)]"
                              )}>
                                {zone.v}
                              </span>
                            </div>
                            {#if isSelected}
                              <div class="text-[var(--md-sys-color-primary)] flex items-center justify-center w-8 h-8 rounded-full bg-[var(--md-sys-color-on-primary)] shadow-sm shrink-0 transition-transform animate-in zoom-in duration-300">
                                <CheckCircle2 size={18} strokeWidth={3} />
                              </div>
                            {/if}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
