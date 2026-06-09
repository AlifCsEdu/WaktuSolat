<script lang="ts">
  import { onMount } from "svelte";
  import { Maximize, Minimize } from "lucide-svelte";
  import "@material/web/iconbutton/filled-tonal-icon-button.js";

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
  class="inline-flex shrink-0 w-12 h-12 lg:w-[56px] lg:h-[56px] hover:scale-105 active:scale-95 transition-transform"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <md-filled-tonal-icon-button
    onclick={toggleFullscreen}
    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    style="--md-filled-tonal-icon-button-container-shape: 24px; width: 100%; height: 100%;"
  >
    {#if isFullscreen}
      <Minimize size={24} class="stroke-[2.5]" />
    {:else}
      <Maximize size={24} class="stroke-[2.5]" />
    {/if}
  </md-filled-tonal-icon-button>
</div>
