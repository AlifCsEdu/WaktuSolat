<script lang="ts">
  import { onMount } from "svelte";
  import { Maximize, Minimize } from "lucide-svelte";
  import { IconButton } from "$lib/components/ui";

  let isFullscreen = $state(false);

  onMount(() => {
    const onFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
</script>

<div
  class="inline-flex shrink-0 transition-transform hover:scale-105 active:scale-95"
>
  <IconButton
    variant="tonal"
    shape="rounded"
    size="md"
    onclick={toggleFullscreen}
    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    ariaLabel={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
  >
    {#if isFullscreen}
      <Minimize class="w-6 h-6 stroke-[2.5]" />
    {:else}
      <Maximize class="w-6 h-6 stroke-[2.5]" />
    {/if}
  </IconButton>
</div>

