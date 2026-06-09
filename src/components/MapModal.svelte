<script lang="ts">
  import { X, Navigation, MapPin } from "lucide-svelte";
  import { fade, fly } from "svelte/transition";
  import L from "leaflet";
  import type { FeatureCollection, Geometry, Feature } from "geojson";
  // @ts-ignore
  import "leaflet/dist/leaflet.css";
  import { appSettings } from "../state/settings.svelte";
  import { JAKIM_ZONES } from "../lib/zones";
  import { ZONE_COORDINATES } from "../lib/zoneCoordinates";
  import "@material/web/iconbutton/icon-button.js";
  import "@material/web/button/filled-tonal-button.js";

  // Fix for leaflet default icon
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });

  let { isOpen = false, onClose, selectedZone, userLocation, onZoneSelect } = $props<{
    isOpen: boolean;
    onClose: () => void;
    selectedZone: string;
    userLocation: { lat: number; lng: number } | null;
    onZoneSelect?: (zone: string) => void;
  }>();

  let map: L.Map | null = null;
  let tileLayer: L.TileLayer | null = null;
  let geoJsonLayer: L.GeoJSON | null = null;
  let markerLayer: L.Marker | null = null;

  let geoData = $state<FeatureCollection | null>(null);
  let isDark = $state(false);

  let zoneLabel = $derived.by(() => {
    for (const state of JAKIM_ZONES) {
      const found = state.zones.find((z) => z.v === selectedZone);
      if (found) {
        return found.l;
      }
    }
    return "";
  });

  $effect(() => {
    if (isOpen) {
      isDark = document.documentElement.classList.contains('dark');
      const observer = new MutationObserver(() => {
        isDark = document.documentElement.classList.contains('dark');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  });

  $effect(() => {
    if (isOpen && !geoData) {
      fetch('/malaysia-jakim.geojson')
        .then(res => res.json())
        .then(data => {
          geoData = data;
        })
        .catch(err => console.error("Failed to load geojson", err));
    }
  });

  const styleFeature = (feature: any, currentSelectedZone: string) => {
    const isSelected = currentSelectedZone === feature.properties?.jakim_code;
    
    return {
      color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
      fillColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)',
      weight: isSelected ? 5 : 1.5,
      opacity: isSelected ? 1 : 0.6,
      fillOpacity: isSelected ? 0.4 : 0.1,
      dashArray: isSelected ? undefined : ''
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer, currentSelectedZone: string) => {
    const jakimCode = feature.properties?.jakim_code;
    const isSelected = currentSelectedZone === jakimCode;

    let zoneName = feature.properties?.name || jakimCode;
    let stateName = "";
    for (const state of JAKIM_ZONES) {
      const found = state.zones.find(z => z.v === jakimCode);
      if (found) {
        zoneName = found.l;
        stateName = state.state;
        break;
      }
    }

    layer.on({
      click: (e) => {
        if (onZoneSelect && jakimCode) {
          onZoneSelect(jakimCode);
        }
      },
      mouseover: (e) => {
        const target = e.target as L.Path;
        if (currentSelectedZone !== jakimCode) {
          target.setStyle({
            fillOpacity: 0.4,
            fillColor: 'var(--md-sys-color-secondary-container)',
            weight: 2,
            color: 'var(--md-sys-color-secondary)'
          });
          target.bringToFront();
        }
      },
      mouseout: (e) => {
        const target = e.target as L.Path;
        if (currentSelectedZone !== jakimCode) {
          if (geoJsonLayer) geoJsonLayer.resetStyle(target);
        }
      }
    });

    if (jakimCode) {
      layer.bindTooltip(`
        <div class="font-sans max-w-[220px] text-center p-1">
          <strong class="text-base block mb-1 text-[var(--md-sys-color-primary)]">${zoneName}</strong>
          <span class="text-xs font-mono font-bold block text-[var(--md-sys-color-on-surface-variant)] opacity-90">${jakimCode} - ${stateName}</span>
          ${!isSelected ? `<span class="text-[10px] text-[var(--md-sys-color-on-surface-variant)] uppercase mt-2 block opacity-70 border-t border-[var(--md-sys-color-outline-variant)] pt-1">Click to select</span>` : ''}
        </div>
      `, { direction: 'top', sticky: true, className: 'custom-m3e-tooltip border-none shadow-xl rounded-xl overflow-hidden' });
    }
  };

  // Map initialization action
  function mapAction(node: HTMLElement) {
    map = L.map(node, {
      zoomControl: false,
    });
    
    // tile layer
    tileLayer = L.tileLayer(
      isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
    ).addTo(map);

    let currentCenter: [number, number] = [4.2105, 101.9758];
    let currentZoom = 6;
    if (ZONE_COORDINATES[selectedZone]) {
      currentCenter = ZONE_COORDINATES[selectedZone];
      currentZoom = 9;
    } else if (userLocation) {
      currentCenter = [userLocation.lat, userLocation.lng];
      currentZoom = 10;
    }
    map.setView(currentCenter, currentZoom);
    setTimeout(() => map?.invalidateSize(), 200);

    return {
      destroy() {
        if (map) {
          map.remove();
          map = null;
          geoJsonLayer = null;
          markerLayer = null;
          tileLayer = null;
        }
      }
    };
  }

  // Handle tileLayer url change
  $effect(() => {
    if (tileLayer) {
      tileLayer.setUrl(isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png");
    }
  });

  // Handle user marker
  $effect(() => {
    if (map) {
      if (userLocation) {
        if (markerLayer) {
          markerLayer.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          markerLayer = L.marker([userLocation.lat, userLocation.lng]).addTo(map);
          markerLayer.bindPopup(`<span class="font-bold text-lg">${appSettings.t('yourLocation')}</span>`);
        }
      } else if (markerLayer) {
        markerLayer.remove();
        markerLayer = null;
      }
    }
  });

  // Handle GeoJSON initialization
  $effect(() => {
    if (map && geoData) {
      if (!geoJsonLayer) {
        geoJsonLayer = L.geoJSON(geoData, {
          style: (feature) => styleFeature(feature, selectedZone),
          onEachFeature: (feature, layer) => onEachFeature(feature, layer, selectedZone)
        }).addTo(map);
      }
    }
  });

  // Handle selectedZone changes
  $effect(() => {
    if (map && geoJsonLayer && selectedZone) {
      geoJsonLayer.setStyle((feature) => styleFeature(feature, selectedZone));
      geoJsonLayer.eachLayer((layer: any) => {
        if (layer.feature) {
          layer.off('click mouseover mouseout');
          layer.unbindTooltip();
          onEachFeature(layer.feature, layer, selectedZone);
        }
        if (layer.feature?.properties?.jakim_code === selectedZone) {
          map?.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 10 });
        }
      });
    }
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 sm:overflow-y-auto" 
    transition:fade={{ duration: 200 }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      transition:fly={{ y: 50, duration: 400 }}
      class="w-full max-w-6xl bg-[var(--md-sys-color-surface)] rounded-[var(--md-sys-shape-corner-extra-large)] shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:my-auto"
      onintroend={() => window.dispatchEvent(new Event('resize'))}
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between p-6 md:p-8 border-b border-[var(--md-sys-color-outline)]/10 shrink-0 gap-4 bg-[var(--md-sys-color-surface)]">
        <div>
          <h2 class="text-3xl md:text-4xl font-black tracking-tighter text-[var(--md-sys-color-primary)] mb-1">
            {appSettings.t('mapView')}
          </h2>
          <div class="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)]">
            <MapPin size={16} class="shrink-0" />
            <p class="text-base font-bold truncate max-w-[300px] md:max-w-none">{zoneLabel || selectedZone}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 self-end sm:self-auto shrink-0">
          {#if userLocation}
            <md-filled-tonal-button 
              onclick={() => {
                if (map) {
                  map.setView([userLocation!.lat, userLocation!.lng], 12);
                }
              }}
              style="--md-filled-tonal-button-container-shape: 20px;"
            >
              <span slot="icon" class="flex items-center justify-center"><Navigation size={18} /></span>
              {appSettings.t('yourLocation')}
            </md-filled-tonal-button>
          {/if}
          <button
            onclick={onClose}
            class="w-12 h-12 flex items-center justify-center rounded-full text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] shrink-0 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-error)]"
          >
            <X size={24} class="stroke-[3]" />
          </button>
        </div>
      </div>
      
      <div class="flex-1 w-full relative shrink-0 bg-[var(--md-sys-color-surface-container-lowest)]">
        <!-- Floating Selection Indicator -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] pointer-events-none w-[90%] max-w-sm">
          {#key selectedZone}
            <div
              in:fly={{ y: 20, duration: 400 }}
              out:fly={{ y: -20, duration: 300 }}
              class="bg-[var(--md-sys-color-primary)] shadow-[0_16px_32px_rgba(0,0,0,0.3)] rounded-3xl p-5 flex flex-col items-center justify-center text-center overflow-hidden"
            >
              <span class="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[var(--md-sys-color-on-primary)] opacity-90 mb-1">
                {appSettings.t('selectedZone' as any)}
              </span>
              <span class="text-xl sm:text-3xl font-black text-[var(--md-sys-color-on-primary)] leading-tight drop-shadow-sm truncate w-full px-2">
                {zoneLabel || selectedZone}
              </span>
              <div class="absolute -right-4 -bottom-4 opacity-10">
                <MapPin size={80} class="text-[var(--md-sys-color-on-primary)]" />
              </div>
            </div>
          {/key}
        </div>

        {#if !geoData}
          <div class="absolute inset-0 z-50 flex items-center justify-center bg-[var(--md-sys-color-surface)]/50 backdrop-blur-sm">
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 border-4 border-[var(--md-sys-color-primary)]/30 border-t-[var(--md-sys-color-primary)] rounded-full animate-spin"></div>
              <span class="font-bold text-[var(--md-sys-color-primary)] animate-pulse tracking-widest uppercase">Loading Boundaries...</span>
            </div>
          </div>
        {/if}
        
        <div 
          use:mapAction
          style="width: 100%; height: 100%; min-height: 400px;"
        ></div>
      </div>
    </div>
  </div>
{/if}
