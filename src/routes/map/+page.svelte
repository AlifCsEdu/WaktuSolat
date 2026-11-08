<script lang="ts">
  import MapModal from '../../components/MapModal.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { locationState } from '../../state/location.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let selectedZone = $state('');
  let userLocation = $state<{ lat: number; lng: number } | null>(null);

  let zoneParam = $derived($page.url.searchParams.get('zone'));

  onMount(() => {
    selectedZone = zoneParam || locationState.selectedZone || StorageManager.getZone() || 'WLY01';
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        },
        (error) => console.warn('Geolocation error in standalone map:', error),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  });

  $effect(() => {
    if (zoneParam && zoneParam !== selectedZone) {
      selectedZone = zoneParam;
    }
  });

  function handleZoneSelect(zone: string) {
    selectedZone = zone;
    StorageManager.setZone(zone);
    locationState.setZone(zone, false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('zone', zone);
      window.history.replaceState({}, '', url.toString());
    }
  }

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }
</script>

{#if selectedZone}
  <MapModal
    isOpen={true}
    selectedZone={selectedZone}
    userLocation={userLocation}
    onZoneSelect={handleZoneSelect}
    onClose={handleClose}
  />
{/if}
