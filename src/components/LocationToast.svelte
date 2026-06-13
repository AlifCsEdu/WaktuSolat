<script lang="ts">
import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
import { onMount } from "svelte";
import GooeyBackground from "./GooeyBackground.svelte";

let isMorphing = $state(false);
onMount(() => {
  const timer = setTimeout(() => {
    isMorphing = true;
  }, 450);
  return () => clearTimeout(timer);
});
import { MapPin, Check, X } from "lucide-svelte";
import { JAKIM_ZONES } from "../lib/zones";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import { appSettings } from "../state/settings.svelte";
import { locationState } from "../state/location.svelte";

function getZoneName(zoneCode: string) {
  for (const state of JAKIM_ZONES) {
    const found = state.zones.find((z) => z.v === zoneCode);
    if (found) return found.l;
  }
  return zoneCode;
}

let {
  promptZone,
  promptLocationName,
  autoUpdatedZone,
  autoUpdatedLocationName,
  onAccept,
  onDismiss,
} = $props<{
  promptZone: string | null;
  promptLocationName?: string | null;
  autoUpdatedZone: string | null;
  autoUpdatedLocationName?: string | null;
  onAccept: () => void;
  onDismiss: () => void;
}>();

const t = (key: any, params?: any) => appSettings.t(key, params);
</script>

{#if promptZone || autoUpdatedZone}
  <div transition:fly={{ y: 50, duration: 300 }} onoutrostart={() => isMorphing = false} class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
    <div class="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)]/20 shadow-2xl rounded-[28px] p-5 flex flex-col gap-3 backdrop-blur-xl relative overflow-hidden">
      <GooeyBackground isMorphing={isMorphing} />
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 {
          autoUpdatedZone 
            ? 'bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]' 
            : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)]'
        }">
          {#if autoUpdatedZone}
            <Check size={24} class="stroke-[2.5]" />
          {:else}
            <MapPin size={24} class="stroke-[2.5]" />
          {/if}
        </div>
        <div class="flex-1 min-w-0 pt-0.5">
          <h4 class="font-bold text-[var(--md-sys-color-on-surface)] text-lg leading-tight">
            {autoUpdatedZone ? t("locationUpdated" as any) : t("locationNewDetected" as any)}
          </h4>
          <p class="text-[var(--md-sys-color-on-surface-variant)] text-sm mt-1">
            {#if autoUpdatedZone}
              {t("locationAutoUpdatedDesc" as any, { zoneName: getZoneName(autoUpdatedZone), locationName: autoUpdatedLocationName || "GPS Semasa" })}
            {:else}
              {t("locationPromptDesc" as any, { locationName: promptLocationName || "lokasi baharu", zoneName: getZoneName(promptZone!) })}
            {/if}
          </p>
        </div>
      </div>
      
      {#if promptZone}
        <div class="flex items-center justify-end gap-2 mt-2">
          <div>
            <!-- @ts-ignore -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-outlined-button onclick={onDismiss}>
              {t("ignore" as any)}
            </md-outlined-button>
          </div>
          <div>
            <!-- @ts-ignore -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <md-filled-button onclick={onAccept}>
              {t("changeZone" as any)}
            </md-filled-button>
          </div>
        </div>
      {/if}

      {#if autoUpdatedZone}
         <div class="flex justify-end">
             <button 
               onclick={onDismiss}
               class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]"
             >
               <X size={18} />
             </button>
         </div>
      {/if}
    </div>
  </div>
{/if}
