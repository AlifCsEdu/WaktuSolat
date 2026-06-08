<script lang="ts">
  import { onMount } from 'svelte';
  
  let isLoading = $state(true);
  
  onMount(() => {
    // Simulate initial load for now
    setTimeout(() => {
      isLoading = false;
    }, 500);
  });
</script>

<div class="min-h-[100dvh] lg:h-[100dvh] flex flex-col w-full font-sans text-[var(--md-sys-color-on-background)] lg:overflow-hidden relative bg-[var(--md-sys-color-background)]">
  {#if isLoading}
    <main class="flex-1 w-full max-w-[1920px] mx-auto relative z-10 flex flex-col lg:flex-row px-3 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-3 lg:py-4 gap-4 sm:gap-6 lg:gap-8 xl:gap-12 lg:overflow-hidden min-h-0">
      <div class="flex items-center justify-center w-full h-full">
        <div class="animate-pulse flex flex-col items-center">
          <div class="w-20 h-20 bg-[var(--md-sys-color-surface-container-high)] rounded-full mb-4"></div>
          <div class="w-48 h-8 bg-[var(--md-sys-color-surface-container-high)] rounded-xl"></div>
        </div>
      </div>
    </main>
  {:else}
    <main class="flex-1 w-full max-w-[1920px] mx-auto relative z-10 flex flex-col lg:flex-row px-3 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-3 lg:py-4 gap-4 sm:gap-6 lg:gap-8 xl:gap-12 lg:overflow-hidden min-h-0">
      <section class="flex flex-col w-full lg:w-[50%] xl:w-[55%] lg:overflow-visible pb-2 lg:pb-0 min-h-0 relative z-20">
        <header class="relative flex items-center gap-3 z-[60] mb-2 flex-wrap shrink-0">
          <h1 class="text-3xl font-bold tracking-tight">AlurWaktu</h1>
        </header>
        <div class="flex-1 flex flex-col justify-center mt-8">
          <p class="text-[var(--md-sys-color-on-surface-variant)] text-lg">Migrating to Svelte 5...</p>
        </div>
      </section>
    </main>
  {/if}
</div>
