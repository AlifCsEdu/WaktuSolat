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

{#if selectedZone}
  <FullCalendar
    isOpen={true}
    selectedZone={selectedZone}
    initialMonthData={[]}
    onClose={() => goto('/')}
  />
{/if}
