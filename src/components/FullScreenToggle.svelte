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
  class="inline-flex shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
>
  <IconButton
    variant="tonal"
    shape="circle"
    size="md"
    class="w-11 h-11"
    onclick={toggleFullscreen}
    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    ariaLabel={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
  >
    {#if isFullscreen}
      <Minimize class="w-5 h-5 stroke-[2.2]" />
    {:else}
      <Maximize class="w-5 h-5 stroke-[2.2]" />
    {/if}
  </IconButton>
</div>

