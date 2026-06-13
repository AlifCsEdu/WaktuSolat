<script lang="ts">
  import SettingsModal from '../../components/SettingsModal.svelte';
  import { notificationsState } from '../../state/notifications.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { onMount, getContext, tick } from 'svelte';

  let selectedZone = $state('');
  let isOpen = $state(true);

  const layoutActions = getContext<{ 
    triggerPrePrompt: (action: () => void) => void; 
    requestPermission: () => Promise<void>; 
  }>('layoutActions');

  onMount(() => {
    selectedZone = StorageManager.getZone() || 'WLY01';
  });

  const handleClose = async () => {
    isOpen = false;
    await tick();
    goto('/');
  };
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 bg-[var(--md-sys-color-scrim)]/30 backdrop-blur-md">
  {#if selectedZone}
    <SettingsModal
      isOpen={isOpen}
      preferences={notificationsState.preferences}
      onUpdatePreference={(k, u) => notificationsState.updatePreference(k, u)}
      onResetPreferences={() => notificationsState.resetPreferences()}
      permission={notificationsState.permission}
      onRequestPermission={() => layoutActions.requestPermission()}
      onTestSound={(s, m) => notificationsState.playSound(s, m)}
      selectedZone={selectedZone}
      onClose={handleClose}
    />
  {/if}
</div>
