<script lang="ts">
  import SettingsModal from '../../components/SettingsModal.svelte';
  import { notificationsState } from '../../state/notifications.svelte';
  import { mosqueState } from '../../state/mosque.svelte';
  import { appSettings } from '../../state/settings.svelte';
  import { StorageManager } from '../../lib/StorageManager';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount, getContext } from 'svelte';

  let selectedZone = $state('');
  let initialTab = $derived($page.url.searchParams.get('tab'));
  let initialQuery = $derived($page.url.searchParams.get('q'));

  const layoutActions = getContext<{ 
    triggerPrePrompt: (action: () => void) => void; 
    requestPermission: () => Promise<void>; 
  }>('layoutActions');

  onMount(() => {
    selectedZone = StorageManager.getZone() || 'WLY01';
  });

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  };
</script>

{#if selectedZone}
  <SettingsModal
    isOpen={true}
    initialTab={initialTab}
    initialQuery={initialQuery}
    preferences={notificationsState.preferences}
    onUpdatePreference={(k, u) => notificationsState.updatePreference(k, u)}
    onResetPreferences={() => notificationsState.resetPreferences()}
    permission={notificationsState.permission}
    onRequestPermission={() => layoutActions.requestPermission()}
    onTestSound={(s, m) => notificationsState.playSound(s, m)}
    onPreviewAzanAlert={(style) => {
      mosqueState.mockAzanAlert = {
        prayerName: 'Asar',
        style,
        remainingSeconds: appSettings.settings.azanAlertDuration ?? 20
      };
    }}
    selectedZone={selectedZone}
    onClose={handleClose}
  />
{/if}
