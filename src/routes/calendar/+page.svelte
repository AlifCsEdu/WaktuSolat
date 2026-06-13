<script lang="ts">
  import FullCalendar from '../../components/FullCalendar.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  let selectedZone = $state('');
  let isOpen = $state(true);

  onMount(() => {
    selectedZone = StorageManager.getZone() || 'WLY01';
  });

  const handleClose = async () => {
    isOpen = false;
    await tick();
    goto('/');
  };
</script>

{#if selectedZone}
  <FullCalendar
    isOpen={isOpen}
    selectedZone={selectedZone}
    initialMonthData={[]}
    onClose={handleClose}
  />
{/if}
