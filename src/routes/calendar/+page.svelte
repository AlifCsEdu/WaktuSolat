<script lang="ts">
  import FullCalendar from '../../components/FullCalendar.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { locationState } from '../../state/location.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let selectedZone = $state('');
  let initialDateParam = $derived($page.url.searchParams.get('date'));

  onMount(() => {
    selectedZone = locationState.selectedZone || StorageManager.getZone() || 'WLY01';
  });

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  };
</script>

{#if selectedZone}
  <FullCalendar
    selectedZone={selectedZone}
    initialDate={initialDateParam}
    onBack={handleBack}
    onClose={handleBack}
  />
{/if}
