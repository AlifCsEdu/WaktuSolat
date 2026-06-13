<script lang="ts">
  import MapModal from '../../components/MapModal.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  let selectedZone = $state('');
  let userLocation = $state<{ lat: number; lng: number } | null>(null);
  let isOpen = $state(true);

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

  async function handleZoneSelect(zone: string) {
    StorageManager.saveZone(zone);
    isOpen = false;
    await tick();
    goto('/');
  }

  async function handleClose() {
    isOpen = false;
    await tick();
    goto('/');
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 bg-[var(--md-sys-color-scrim)]/30 backdrop-blur-md">
  {#if selectedZone}
    <MapModal
      isOpen={isOpen}
      selectedZone={selectedZone}
      userLocation={userLocation}
      onZoneSelect={handleZoneSelect}
      onClose={handleClose}
    />
  {/if}
</div>
