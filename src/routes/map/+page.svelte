<script lang="ts">
  import MapModal from '../../components/MapModal.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let selectedZone = $state('');
  let userLocation = $state<{ lat: number; lng: number } | null>(null);

  onMount(() => {
    selectedZone = StorageManager.getZone() || 'WLY01';
    
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

  function handleZoneSelect(zone: string) {
    StorageManager.saveZone(zone);
    // Let the app know the zone changed (StorageManager handles localStorage write)
    goto('/');
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 bg-[var(--md-sys-color-scrim)]/30 backdrop-blur-md">
  {#if selectedZone}
    <MapModal
      isOpen={true}
      selectedZone={selectedZone}
      userLocation={userLocation}
      onZoneSelect={handleZoneSelect}
      onClose={() => goto('/')}
    />
  {/if}
</div>
