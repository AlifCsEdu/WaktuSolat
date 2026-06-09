<script lang="ts">
  import { cn } from "../lib/utils";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  let {
    value,
    class: className = "",
  }: {
    value: string | number;
    class?: string;
  } = $props();
</script>

<div class={cn("relative inline-grid items-center justify-center overflow-hidden", className)}>
  <span class="invisible col-start-1 row-start-1">{value}</span>
  {#key String(value)}
    <span
      in:fly={{ y: '100%', duration: 300, easing: cubicOut }}
      out:fly={{ y: '-100%', duration: 300, easing: cubicOut }}
      class="inline-block leading-none col-start-1 row-start-1"
    >
      {value}
    </span>
  {/key}
</div>
