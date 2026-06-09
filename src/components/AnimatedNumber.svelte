<script lang="ts">
  import { cn } from "../lib/utils";
  import AnimatedDigit from "./AnimatedDigit.svelte";

  let {
    value,
    class: className = "",
    padZero = true,
  }: {
    value: number;
    class?: string;
    padZero?: boolean;
  } = $props();

  let str = $derived(padZero ? String(value).padStart(2, "0") : String(value));
  let chars = $derived(str.split(""));
</script>

<div class={cn("flex items-baseline", className)}>
  {#each chars as char, i (i + "-" + chars.length)}
    <AnimatedDigit value={char} />
  {/each}
</div>
