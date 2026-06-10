<script lang="ts">
  import FullCalendar from '../../components/FullCalendar.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let selectedZone = $state('');

  onMount(() => {
    selectedZone = StorageManager.getZone() || 'WLY01';
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 bg-[var(--md-sys-color-scrim)]/30 backdrop-blur-md">
  {#if selectedZone}
    <FullCalendar
      isOpen={true}
      selectedZone={selectedZone}
      initialMonthData={[]}
      onClose={() => goto('/')}
    />
  {/if}
</div>
