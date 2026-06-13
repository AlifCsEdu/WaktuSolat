<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '../lib/utils';

  let { isMorphing = false, class: className = '' } = $props<{
    isMorphing?: boolean;
    class?: string;
  }>();

  let active = $state(false);

  onMount(() => {
    const timer = setTimeout(() => {
      active = true;
    }, 450);
    return () => clearTimeout(timer);
  });

  let shouldMorph = $derived(isMorphing && active);
</script>

<div class={cn("gooey-bg-container", shouldMorph && "is-morphing", className)}>
  <div class="gooey-blob blob-1 w-32 h-32 bg-[var(--md-sys-color-primary)]/20 -top-8 -left-8"></div>
  <div class="gooey-blob blob-2 w-28 h-28 bg-[var(--md-sys-color-secondary)]/25 -right-6 -bottom-6"></div>
</div>
