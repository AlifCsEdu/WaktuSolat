<script lang="ts">
  import { onMount } from "svelte";
  import App from "../../+page.svelte";
  import { locationState } from "../../../state/location.svelte";
  import { StorageManager } from "../../../lib/StorageManager";
  import { m3Fly as fly } from "../../../lib/transitions";

  let { data } = $props();
  let hydrated = $state(false);
  let showBanner = $state(false);

  onMount(() => {
    if (data?.zone) {
      locationState.selectedZone = data.zone;
    }
    hydrated = true;
    showBanner = data?.zone !== StorageManager.getZone();
  });

  function handleSetDefault() {
    locationState.saveAsDefault();
    showBanner = false;
  }
</script>

<svelte:head>
  <title>Waktu Solat {data.zoneLabel}, {data.stateName} ({data.zone})</title>
  <meta name="description" content="Waktu solat hari ini untuk {data.zoneLabel}, {data.stateName}. Jadual waktu solat Subuh, Syuruk, Zohor, Asar, Maghrib, dan Isyak." />
  <meta property="og:title" content="Waktu Solat {data.zoneLabel}, {data.stateName} ({data.zone})" />
  <meta property="og:description" content="Waktu solat hari ini untuk {data.zoneLabel}, {data.stateName}. Jadual waktu solat Subuh, Syuruk, Zohor, Asar, Maghrib, dan Isyak." />
  <meta property="og:image" content="/api/og/{data.zone}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Waktu Solat {data.zoneLabel}, {data.stateName} ({data.zone})" />
  <meta name="twitter:description" content="Waktu solat hari ini untuk {data.zoneLabel}, {data.stateName}. Jadual waktu solat Subuh, Syuruk, Zohor, Asar, Maghrib, dan Isyak." />
  <meta name="twitter:image" content="/api/og/{data.zone}" />
</svelte:head>

{#if !hydrated}
  <div class="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
    <div class="w-full max-w-md bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-700/50">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-black tracking-tight text-emerald-400">{data.zoneLabel}</h1>
        <p class="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-1">{data.stateName} ({data.zone})</p>
        <div class="mt-2 text-xs text-slate-500">
          <span>{data.dayName}</span> • <span>{data.gregorianDate}</span> • <span>{data.hijriDate}</span>
        </div>
      </div>
      
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Subuh</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.fajr ? data.todayPrayers.fajr.slice(0, 5) : '--:--'}</span>
        </div>
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Syuruk</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.syuruk ? data.todayPrayers.syuruk.slice(0, 5) : '--:--'}</span>
        </div>
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Zohor</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.dhuhr ? data.todayPrayers.dhuhr.slice(0, 5) : '--:--'}</span>
        </div>
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Asar</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.asr ? data.todayPrayers.asr.slice(0, 5) : '--:--'}</span>
        </div>
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Maghrib</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.maghrib ? data.todayPrayers.maghrib.slice(0, 5) : '--:--'}</span>
        </div>
        <div class="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl">
          <span class="font-bold text-slate-300">Isyak</span>
          <span class="font-mono text-lg font-black text-slate-100">{data.todayPrayers.isha ? data.todayPrayers.isha.slice(0, 5) : '--:--'}</span>
        </div>
      </div>
    </div>
  </div>
{:else}
  <App />
  {#if showBanner}
    <div
      transition:fly={{ y: 50, duration: 400 }}
      class="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md z-[100] flex flex-col gap-3 p-5 rounded-3xl shadow-xl backdrop-blur-xl border border-[var(--md-sys-color-outline)]/20 shadow-black/30 bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-highest)_80%,transparent)] animate-fade-in"
    >
      <div class="flex flex-col gap-1">
        <span class="font-bold text-sm text-[var(--md-sys-color-on-surface)]">
          Tukar Zon Utama?
        </span>
        <p class="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-normal">
          Anda sedang melihat waktu solat untuk {data.zoneLabel}. Setkan zon ini sebagai zon utama anda?
        </p>
      </div>
      <div class="flex justify-end gap-2 mt-1">
        <button
          onclick={() => showBanner = false}
          class="px-4 py-2 text-xs font-bold rounded-full text-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-variant)]/50 transition-all active:scale-95"
        >
          Abaikan
        </button>
        <button
          onclick={handleSetDefault}
          class="px-4 py-2 text-xs font-bold rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:opacity-95 transition-all active:scale-95"
        >
          Set Zon Utama
        </button>
      </div>
    </div>
  {/if}
{/if}

