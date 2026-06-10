<script lang="ts">
  import { Megaphone, ChevronDown, Plus, Trash2, GripVertical, Image as ImageIcon, Type, Palette, Settings, Upload, ImagePlus, Volume2, Play, Layout, Clock, AlertCircle } from "lucide-svelte";
  import { m3Fade as fade, m3Fly as fly, m3Slide as slide } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { playSynthesizedChime } from "./TvModeReminderCard.svelte";
  import { saveAsset, getAssetBlob, deleteAsset } from "../lib/db";
  import { onDestroy } from "svelte";
  import type { TvModeReminderImage } from "../types";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);

  let activeTabs = $state<Record<string, string>>({});
  let collapsedReminders = $state<Record<string, boolean>>({});

  let reminderLocalThumbnails = $state<Record<string, string>>({});
  let dragActiveReminder = $state<string | null>(null);
  let reminderUploadErrors = $state<Record<string, string>>({});

  $effect(() => {
    let active = true;
    const list = settings.tvModeRemindersList || [];
    const keysToLoad: string[] = [];
    for (const r of list) {
      const imgs = r.images || [];
      for (const img of imgs) {
        if (img.isUploaded && img.assetKey) {
          keysToLoad.push(img.assetKey);
        }
      }
    }

    const loadThumbs = async () => {
      const thumbs: Record<string, string> = {};
      for (const key of keysToLoad) {
        if (reminderLocalThumbnails[key]) {
          thumbs[key] = reminderLocalThumbnails[key];
          continue;
        }
        try {
          const blob = await getAssetBlob(key);
          if (blob) {
            thumbs[key] = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.error(`Failed to load reminder thumbnail for ${key}:`, e);
        }
      }
      if (active) {
        Object.keys(reminderLocalThumbnails).forEach(key => {
          if (!thumbs[key]) {
            try { URL.revokeObjectURL(reminderLocalThumbnails[key]); } catch (e) {}
          }
        });
        reminderLocalThumbnails = thumbs;
      } else {
        Object.values(thumbs).forEach(u => {
          try { URL.revokeObjectURL(u); } catch (e) {}
        });
      }
    };

    loadThumbs();

    return () => {
      active = false;
    };
  });

  onDestroy(() => {
    Object.values(reminderLocalThumbnails).forEach(u => {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });
  });

  function handleReminderDrag(e: DragEvent, rId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      dragActiveReminder = rId;
    } else if (e.type === "dragleave") {
      dragActiveReminder = null;
    }
  }

  async function handleReminderDrop(e: DragEvent, rId: string) {
    e.preventDefault();
    e.stopPropagation();
    dragActiveReminder = null;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await uploadReminderFiles(e.dataTransfer.files, rId);
    }
  }

  async function handleReminderFileSelect(e: Event, rId: string) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      await uploadReminderFiles(input.files, rId);
    }
  }

  async function uploadReminderFiles(files: FileList, rId: string) {
    reminderUploadErrors[rId] = "";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSizeBytes = 5 * 1024 * 1024;

    const list = getReminders();
    const reminder = list.find(r => r.id === rId);
    if (!reminder) return;

    const newImages = [...(reminder.images || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        reminderUploadErrors[rId] = settings.language === "ms"
          ? "Format fail tidak disokong. Sila gunakan JPG, PNG, WEBP atau GIF."
          : "Unsupported file format. Please use JPG, PNG, WEBP or GIF.";
        continue;
      }

      if (file.size > maxSizeBytes) {
        reminderUploadErrors[rId] = settings.language === "ms"
          ? "Saiz fail melebihi had 5MB."
          : "File size exceeds 5MB limit.";
        continue;
      }

      try {
        const id = Date.now() + "-" + Math.random().toString(36).substring(2, 7);
        const key = `reminder-image-${id}`;
        await saveAsset(key, file);

        const newImage: TvModeReminderImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          url: "",
          isUploaded: true,
          assetKey: key,
          position: "background",
          width: 100,
          align: "center",
          shape: "original",
          blendMode: "none",
          padding: 0
        };

        newImages.push(newImage);
      } catch (err) {
        console.error("Failed to upload reminder image:", err);
        reminderUploadErrors[rId] = settings.language === "ms"
          ? "Gagal menyimpan fail ke storan tempatan."
          : "Failed to save file to local storage.";
      }
    }

    handleUpdateReminder(rId, { images: newImages });
  }

  async function handleDeleteReminderImage(rId: string, imgId: string) {
    const list = getReminders();
    const reminder = list.find(r => r.id === rId);
    if (!reminder || !reminder.images) return;

    const imageToDelete = reminder.images.find(img => img.id === imgId);
    if (imageToDelete?.isUploaded && imageToDelete.assetKey) {
      try {
        await deleteAsset(imageToDelete.assetKey);
      } catch (e) {
        console.error(`Failed to delete asset ${imageToDelete.assetKey}:`, e);
      }
    }

    const updatedImages = reminder.images.filter(img => img.id !== imgId);
    handleUpdateReminder(rId, { images: updatedImages });
  }

  function getReminders() {
    return settings.tvModeRemindersList || [];
  }

  function handleAddReminder() {
    const list = getReminders();
    const newId = `reminder-${Date.now()}`;
    const newList = [...list, {
      id: newId,
      enabled: true,
      texts: [{ id: Date.now().toString(), content: "New Reminder", type: "title" as const }],
      duration: settings.tvModeReminderInterval ?? 15,
      bgMode: "default" as any
    }];
    updateSettings({ tvModeRemindersList: newList });
    collapsedReminders[newId] = false;
    activeTabs[newId] = 'content';
  }

  function handleDeleteReminder(id: string) {
    const list = getReminders();
    updateSettings({ tvModeRemindersList: list.filter(r => r.id !== id) });
  }

  function handleUpdateReminder(id: string, updates: any) {
    const list = getReminders();
    const newList = list.map(r => r.id === id ? { ...r, ...updates } : r);
    updateSettings({ tvModeRemindersList: newList });
  }

  function toggleReminder(id: string) {
    collapsedReminders[id] = !collapsedReminders[id];
  }

  function setActiveTab(id: string, tab: string) {
    activeTabs[id] = tab;
  }
</script>

<div class="border border-[var(--md-sys-color-outline)]/10 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface)] shadow-sm">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="w-full flex items-center justify-between p-4 bg-[var(--md-sys-color-surface-container-low)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors text-left focus:outline-none"
  >
    <div class="flex items-center gap-3">
      <Megaphone size={18} class="text-[var(--md-sys-color-primary)]" />
      <span class="font-bold text-[var(--md-sys-color-on-surface)] text-sm">
        {t("sectionReminders")}
      </span>
    </div>
    <ChevronDown
      size={18}
      class={cn(
        "text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300",
        open ? "rotate-180" : ""
      )}
    />
  </button>
  
  {#if open}
    <div transition:slide={{ duration: 300 }} class="overflow-hidden">
      <div class="p-4 space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--md-sys-color-surface-container-lowest)] rounded-2xl border border-[var(--md-sys-color-outline)]/10">
          <div>
            <h4 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{t("remindersListLabel")}</h4>
            <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed mt-1 max-w-sm">
              {t("remindersListDesc")}
            </p>
          </div>
          <button
            type="button"
            onclick={handleAddReminder}
            class="px-4 py-2.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold shadow-sm hover:opacity-90 hover:shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus size={14} class="stroke-[3]" />
            {t("addReminderBtn")}
          </button>
        </div>

        {#if getReminders().length === 0}
          <div class="flex flex-col items-center justify-center p-8 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline)]/10 rounded-2xl text-center space-y-4">
            <div class="w-12 h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
              <Megaphone size={20} class="stroke-[2.5]" />
            </div>
            <div>
              <h5 class="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{t("noRemindersTitle")}</h5>
              <p class="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1 max-w-[240px]">
                {t("noRemindersDesc")}
              </p>
            </div>
          </div>
        {:else}
          <div class="space-y-3">
            {#each getReminders() as reminder (reminder.id)}
              <div class="flex flex-col rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/10 shadow-sm overflow-hidden transition-all duration-300">
                <div class="flex items-center gap-3 p-3 bg-[var(--md-sys-color-surface-container-lowest)] hover:bg-[var(--md-sys-color-surface-container-low)] transition-colors">
                  <div class="cursor-move text-[var(--md-sys-color-on-surface-variant)] opacity-50 hover:opacity-100 p-1">
                    <GripVertical size={16} />
                  </div>
                  
                  <md-switch
                    selected={!!reminder.enabled}
                    onchange={(e: any) => handleUpdateReminder(reminder.id, { enabled: e.target.selected })}
                    icons
                  ></md-switch>
                  
                  <button
                    type="button"
                    onclick={() => toggleReminder(reminder.id)}
                    class="flex-1 flex flex-col items-start text-left ml-2 focus:outline-none"
                  >
                    <span class={cn("text-xs font-bold truncate max-w-[200px] sm:max-w-xs transition-colors", reminder.enabled ? "text-[var(--md-sys-color-on-surface)]" : "text-[var(--md-sys-color-on-surface-variant)]")}>
                      {(reminder.texts && reminder.texts.length > 0 && typeof reminder.texts[0] === 'object' && reminder.texts[0].content) ? reminder.texts[0].content.substring(0, 40) : (reminder.texts && reminder.texts.length > 0 && typeof reminder.texts[0] === 'string') ? (reminder.texts[0] as string).substring(0, 40) : "Empty Reminder"}
                    </span>
                    <div class="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--md-sys-color-on-surface-variant)] font-bold uppercase tracking-widest">
                      {#if reminder.images && reminder.images.length > 0}
                        <span class="flex items-center gap-0.5"><ImageIcon size={10} /> {reminder.images.length}</span>
                      {/if}
                      <span>{reminder.duration ?? settings.tvModeReminderInterval ?? 15}S</span>
                    </div>
                  </button>
                  
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      onclick={() => toggleReminder(reminder.id)}
                      class="p-2 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-full transition-colors cursor-pointer"
                    >
                      <ChevronDown size={16} class={cn("transition-transform duration-300", !collapsedReminders[reminder.id] ? "rotate-180" : "")} />
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDeleteReminder(reminder.id)}
                      class="p-2 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {#if !collapsedReminders[reminder.id]}
                  <div transition:slide={{ duration: 300 }} class="border-t border-[var(--md-sys-color-outline)]/5 bg-[var(--md-sys-color-surface-container-lowest)]">
                    <div class="flex p-2 gap-1 bg-[var(--md-sys-color-surface-container-low)] overflow-x-auto custom-scrollbar border-b border-[var(--md-sys-color-outline)]/5">
                      {#each ['content', 'media', 'style', 'scheduling'] as tab}
                        <button
                          type="button"
                          onclick={() => setActiveTab(reminder.id, tab)}
                          class={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                            (activeTabs[reminder.id] || 'content') === tab
                              ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm"
                              : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]"
                          )}
                        >
                          {#if tab === 'content'}<Type size={14} />{/if}
                          {#if tab === 'media'}<ImageIcon size={14} />{/if}
                          {#if tab === 'style'}<Palette size={14} />{/if}
                          {#if tab === 'scheduling'}<Settings size={14} />{/if}
                          <span class="capitalize">{tab}</span>
                        </button>
                      {/each}
                    </div>

                    <div class="p-4 space-y-4">
                      {#if (activeTabs[reminder.id] || 'content') === 'content'}
                        <div class="space-y-4">
                          {#each (reminder.texts || []) as textBlock, tIdx}
                            {@const content = typeof textBlock === 'string' ? textBlock : textBlock.content}
                            {@const type = typeof textBlock === 'string' ? 'body' : (textBlock.type || 'body')}
                            {@const size = typeof textBlock === 'string' ? 'md' : (textBlock.size || 'md')}
                            {@const font = typeof textBlock === 'string' ? 'sans' : (textBlock.font || 'sans')}
                            {@const weight = typeof textBlock === 'string' ? 'normal' : (textBlock.weight || 'normal')}
                            {@const align = typeof textBlock === 'string' ? 'center' : (textBlock.align || 'center')}
                            {@const color = typeof textBlock === 'string' ? '' : (textBlock.color || '')}
                            {@const glow = typeof textBlock === 'string' ? false : !!textBlock.glow}
                            {@const marquee = typeof textBlock === 'string' ? false : !!textBlock.marquee}

                            <div class="p-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline)]/10 rounded-xl space-y-3 relative group">
                              <div class="flex items-start gap-2 pr-8">
                                <textarea
                                  value={content}
                                  oninput={(e: any) => {
                                    const newTexts = [...(reminder.texts || [])];
                                    if (typeof newTexts[tIdx] === 'string') {
                                      newTexts[tIdx] = {
                                        id: Date.now().toString(),
                                        content: e.currentTarget.value,
                                        type: 'body'
                                      };
                                    } else {
                                      newTexts[tIdx] = { ...newTexts[tIdx] as any, content: e.currentTarget.value };
                                    }
                                    handleUpdateReminder(reminder.id, { texts: newTexts });
                                  }}
                                  class="w-full min-h-[70px] p-2 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] text-xs rounded-lg border border-[var(--md-sys-color-outline)]/15 focus:border-[var(--md-sys-color-primary)] outline-none resize-y transition-all"
                                  placeholder="Enter text..."
                                ></textarea>
                                
                                <button
                                  type="button"
                                  onclick={() => {
                                    const newTexts = [...(reminder.texts || [])];
                                    newTexts.splice(tIdx, 1);
                                    handleUpdateReminder(reminder.id, { texts: newTexts });
                                  }}
                                  class="absolute right-2 top-2 p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] rounded-lg transition-all cursor-pointer"
                                  title="Delete text block"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <!-- Expandable Typography Drawer -->
                              <details class="group border border-[var(--md-sys-color-outline)]/10 rounded-lg bg-[var(--md-sys-color-surface-container)] overflow-hidden">
                                <summary class="p-2 text-[10px] font-bold text-[var(--md-sys-color-primary)] hover:underline flex items-center justify-between cursor-pointer select-none">
                                  <span>TYPOGRAPHY & STYLING</span>
                                  <span class="text-[9px] text-[var(--md-sys-color-on-surface-variant)]/60 font-mono capitalize">
                                    {type} • {size} • {font}
                                  </span>
                                </summary>
                                <div class="p-3 border-t border-[var(--md-sys-color-outline)]/10 grid grid-cols-2 gap-3 text-xs bg-[var(--md-sys-color-surface-container-low)]">
                                  <!-- Block Type -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Block Type</span>
                                    <select
                                      value={type}
                                      onchange={(e: any) => {
                                        const newTexts = [...(reminder.texts || [])];
                                        const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                        newTexts[tIdx] = { ...norm, type: e.currentTarget.value };
                                        handleUpdateReminder(reminder.id, { texts: newTexts });
                                      }}
                                      class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)]"
                                    >
                                      <option value="title">Title</option>
                                      <option value="subtitle">Subtitle</option>
                                      <option value="body">Body Text</option>
                                      <option value="caption">Caption</option>
                                    </select>
                                  </label>

                                  <!-- Font Size -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Size</span>
                                    <select
                                      value={size}
                                      onchange={(e: any) => {
                                        const newTexts = [...(reminder.texts || [])];
                                        const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                        newTexts[tIdx] = { ...norm, size: e.currentTarget.value };
                                        handleUpdateReminder(reminder.id, { texts: newTexts });
                                      }}
                                      class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)]"
                                    >
                                      <option value="sm">Small</option>
                                      <option value="md">Medium</option>
                                      <option value="lg">Large</option>
                                      <option value="xl">Extra Large</option>
                                      <option value="2xl">2X Large</option>
                                      <option value="3xl">3X Large</option>
                                    </select>
                                  </label>

                                  <!-- Font Family -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Font</span>
                                    <select
                                      value={font}
                                      onchange={(e: any) => {
                                        const newTexts = [...(reminder.texts || [])];
                                        const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                        newTexts[tIdx] = { ...norm, font: e.currentTarget.value };
                                        handleUpdateReminder(reminder.id, { texts: newTexts });
                                      }}
                                      class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)]"
                                    >
                                      <option value="sans">Sans-serif</option>
                                      <option value="serif">Serif (Formal)</option>
                                      <option value="mono">Monospace</option>
                                    </select>
                                  </label>

                                  <!-- Font Weight -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Weight</span>
                                    <select
                                      value={weight}
                                      onchange={(e: any) => {
                                        const newTexts = [...(reminder.texts || [])];
                                        const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                        newTexts[tIdx] = { ...norm, weight: e.currentTarget.value };
                                        handleUpdateReminder(reminder.id, { texts: newTexts });
                                      }}
                                      class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)]"
                                    >
                                      <option value="normal">Normal</option>
                                      <option value="medium">Medium</option>
                                      <option value="bold">Bold</option>
                                      <option value="black">Black (Thick)</option>
                                    </select>
                                  </label>

                                  <!-- Alignment -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Align</span>
                                    <select
                                      value={align}
                                      onchange={(e: any) => {
                                        const newTexts = [...(reminder.texts || [])];
                                        const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                        newTexts[tIdx] = { ...norm, align: e.currentTarget.value };
                                        handleUpdateReminder(reminder.id, { texts: newTexts });
                                      }}
                                      class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)]"
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </label>

                                  <!-- Text Color -->
                                  <label class="block">
                                    <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Custom Color</span>
                                    <div class="flex items-center gap-1.5">
                                      <input
                                        type="color"
                                        value={color || '#ffffff'}
                                        onchange={(e: any) => {
                                          const newTexts = [...(reminder.texts || [])];
                                          const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                          newTexts[tIdx] = { ...norm, color: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { texts: newTexts });
                                        }}
                                        class="w-8 h-8 rounded border border-[var(--md-sys-color-outline)]/20 cursor-pointer p-0"
                                      />
                                      <input
                                        type="text"
                                        value={color}
                                        placeholder="Theme default"
                                        onchange={(e: any) => {
                                          const newTexts = [...(reminder.texts || [])];
                                          const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                          newTexts[tIdx] = { ...norm, color: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { texts: newTexts });
                                        }}
                                        class="flex-1 min-w-0 p-1.5 text-xs rounded bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface)] font-mono"
                                      />
                                    </div>
                                  </label>

                                  <!-- Toggles -->
                                  <div class="col-span-2 flex items-center justify-between gap-4 mt-1 border-t border-[var(--md-sys-color-outline)]/5 pt-2">
                                    <label class="flex items-center gap-2 cursor-pointer font-bold select-none text-[10px] uppercase tracking-wider text-[var(--md-sys-color-on-surface)]">
                                      <input
                                        type="checkbox"
                                        checked={glow}
                                        onchange={(e: any) => {
                                          const newTexts = [...(reminder.texts || [])];
                                          const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                          newTexts[tIdx] = { ...norm, glow: e.currentTarget.checked };
                                          handleUpdateReminder(reminder.id, { texts: newTexts });
                                        }}
                                        class="rounded border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary)] focus:ring-[var(--md-sys-color-primary)] w-4 h-4 cursor-pointer"
                                      />
                                      <span>Text Glow</span>
                                    </label>

                                    <label class="flex items-center gap-2 cursor-pointer font-bold select-none text-[10px] uppercase tracking-wider text-[var(--md-sys-color-on-surface)]">
                                      <input
                                        type="checkbox"
                                        checked={marquee}
                                        onchange={(e: any) => {
                                          const newTexts = [...(reminder.texts || [])];
                                          const norm = typeof newTexts[tIdx] === 'string' ? { id: Date.now().toString(), content: newTexts[tIdx] as string } : newTexts[tIdx] as any;
                                          newTexts[tIdx] = { ...norm, marquee: e.currentTarget.checked };
                                          handleUpdateReminder(reminder.id, { texts: newTexts });
                                        }}
                                        class="rounded border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary)] focus:ring-[var(--md-sys-color-primary)] w-4 h-4 cursor-pointer"
                                      />
                                      <span>Marquee Scroll</span>
                                    </label>
                                  </div>
                                </div>
                              </details>
                            </div>
                          {/each}
                          
                          <button
                            type="button"
                            onclick={() => {
                              const newTexts = [...(reminder.texts || []), { id: Date.now().toString(), content: "", type: "body", size: "md", font: "sans", align: "center", weight: "normal" }];
                              handleUpdateReminder(reminder.id, { texts: newTexts });
                            }}
                            class="w-full py-2.5 border-2 border-dashed border-[var(--md-sys-color-outline)]/20 hover:border-[var(--md-sys-color-primary)]/50 rounded-xl text-xs font-bold text-[var(--md-sys-color-primary)] flex items-center justify-center gap-2 transition-all hover:bg-[var(--md-sys-color-primary)]/5 cursor-pointer"
                          >
                            <Plus size={14} /> Add Text Slide
                          </button>
                        </div>
                      {/if}

                      {#if (activeTabs[reminder.id] || 'content') === 'media'}
                        <div class="space-y-4">
                          <!-- Upload Dropzone -->
                          <div
                            role="button"
                            tabindex={0}
                            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { (e.currentTarget.querySelector("input") as HTMLInputElement)?.click(); } }}
                            class={cn(
                              "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-center relative focus:outline-none focus:border-[var(--md-sys-color-primary)]",
                              dragActiveReminder === reminder.id ? "border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/10" : "border-[var(--md-sys-color-outline)]/20"
                            )}
                            ondragenter={(e) => handleReminderDrag(e, reminder.id)}
                            ondragover={(e) => handleReminderDrag(e, reminder.id)}
                            ondragleave={(e) => handleReminderDrag(e, reminder.id)}
                            ondrop={(e) => handleReminderDrop(e, reminder.id)}
                            onclick={(e) => {
                              const input = e.currentTarget.querySelector("input");
                              if (input) input.click();
                            }}
                          >
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              class="hidden"
                              onchange={(e) => handleReminderFileSelect(e, reminder.id)}
                            />
                            <Upload size={18} class="text-[var(--md-sys-color-primary)]" />
                            <span class="text-[11px] font-bold text-[var(--md-sys-color-on-surface)]">
                              {settings.language === "ms" ? "Seret fail imej di sini, atau klik untuk memilih" : "Drag image file here, or click to browse"}
                            </span>
                          </div>

                          {#if reminderUploadErrors[reminder.id]}
                            <div class="p-2 bg-[var(--md-sys-color-error-container)]/20 text-[var(--md-sys-color-error)] text-[10px] rounded-lg flex items-center gap-1.5 font-bold">
                              <AlertCircle size={12} />
                              <span>{reminderUploadErrors[reminder.id]}</span>
                            </div>
                          {/if}

                          <!-- List of Images -->
                          {#if reminder.images && reminder.images.length > 0}
                            {@const imageList = reminder.images}
                            <div class="space-y-3">
                              {#each imageList as img, imgIdx}
                                {@const isUploaded = img.isUploaded}
                                {@const thumbSrc = isUploaded ? reminderLocalThumbnails[img.assetKey || ""] : img.url}
                                <div class="p-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/15 rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center relative">
                                  <div class="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-white border border-[var(--md-sys-color-outline)]/10 flex items-center justify-center relative shadow-sm">
                                    {#if thumbSrc}
                                      <img src={thumbSrc} alt="Preview" class="w-full h-full object-contain" />
                                    {:else}
                                      <ImageIcon size={20} class="text-[var(--md-sys-color-on-surface-variant)]/40" />
                                    {/if}
                                  </div>

                                  <div class="flex-grow grid grid-cols-2 gap-2 w-full text-xs">
                                    <!-- Position slot -->
                                    <label class="block">
                                      <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Position</span>
                                      <select
                                        value={img.position}
                                        onchange={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], position: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10"
                                      >
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                        <option value="top">Top</option>
                                        <option value="bottom">Bottom</option>
                                        <option value="background">Background</option>
                                      </select>
                                    </label>

                                    <!-- Alignment -->
                                    <label class="block">
                                      <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Align</span>
                                      <select
                                        value={img.align || 'center'}
                                        onchange={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], align: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10"
                                      >
                                        <option value="start">Start</option>
                                        <option value="center">Center</option>
                                        <option value="end">End</option>
                                      </select>
                                    </label>

                                    <!-- Shape -->
                                    <label class="block">
                                      <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Shape</span>
                                      <select
                                        value={img.shape || 'rounded'}
                                        onchange={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], shape: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10"
                                      >
                                        <option value="original">Original</option>
                                        <option value="rounded">Rounded</option>
                                        <option value="circle">Circle</option>
                                        <option value="square">Square</option>
                                      </select>
                                    </label>

                                    <!-- Blend Mode -->
                                    <label class="block">
                                      <span class="text-[9px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider block mb-0.5">Blend</span>
                                      <select
                                        value={img.blendMode || 'none'}
                                        onchange={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], blendMode: e.currentTarget.value };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full p-1.5 text-xs rounded-lg bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline)]/10"
                                      >
                                        <option value="none">Normal</option>
                                        <option value="multiply">Multiply (Remove White)</option>
                                        <option value="screen">Screen (Remove Dark)</option>
                                        <option value="overlay">Overlay</option>
                                      </select>
                                    </label>
                                  </div>

                                  <!-- Sliders panel -->
                                  <div class="w-full sm:w-44 flex flex-col gap-2 shrink-0">
                                    <!-- Width / scale slider -->
                                    <div class="flex flex-col gap-0.5">
                                      <div class="flex justify-between text-[8px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                                        <span>Width/Opacity</span>
                                        <span>{img.width || 100}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={img.width || 100}
                                        oninput={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], width: parseInt(e.target.value) };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
                                      />
                                    </div>

                                    <!-- Padding slider -->
                                    <div class="flex flex-col gap-0.5">
                                      <div class="flex justify-between text-[8px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                                        <span>Padding</span>
                                        <span>{img.padding || 0}px</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        step="2"
                                        value={img.padding || 0}
                                        oninput={(e: any) => {
                                          const updated = [...imageList];
                                          updated[imgIdx] = { ...updated[imgIdx], padding: parseInt(e.target.value) };
                                          handleUpdateReminder(reminder.id, { images: updated });
                                        }}
                                        class="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
                                      />
                                    </div>
                                  </div>

                                  <!-- Delete Image Button -->
                                  <button
                                    type="button"
                                    onclick={() => handleDeleteReminderImage(reminder.id, img.id)}
                                    class="absolute -top-2 -right-2 p-1.5 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-full hover:scale-105 active:scale-95 transition-all shadow cursor-pointer"
                                    title="Delete Image"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              {/each}
                            </div>
                          {/if}

                          <!-- Remote URL Adder -->
                          <div class="flex gap-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3">
                            <input
                              type="url"
                              placeholder={settings.language === "ms" ? "Tambah URL imej luaran..." : "Add external image URL..."}
                              class="flex-1 p-2 text-xs bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-xl border border-[var(--md-sys-color-outline)]/20 focus:border-[var(--md-sys-color-primary)] outline-none"
                              onkeydown={(e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const input = e.currentTarget as HTMLInputElement;
                                  const val = input.value.trim();
                                  if (val && val.startsWith("http")) {
                                    const newImg: TvModeReminderImage = {
                                      id: `img-${Date.now()}`,
                                      url: val,
                                      position: "left",
                                      width: 40,
                                      align: "center",
                                      shape: "rounded",
                                      blendMode: "none",
                                      padding: 0
                                    };
                                    handleUpdateReminder(reminder.id, { images: [...(reminder.images || []), newImg] });
                                    input.value = "";
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onclick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const val = input.value.trim();
                                if (val && val.startsWith("http")) {
                                  const newImg: TvModeReminderImage = {
                                    id: `img-${Date.now()}`,
                                    url: val,
                                    position: "left",
                                    width: 40,
                                    align: "center",
                                    shape: "rounded",
                                    blendMode: "none",
                                    padding: 0
                                  };
                                  handleUpdateReminder(reminder.id, { images: [...(reminder.images || []), newImg] });
                                  input.value = "";
                                }
                              }}
                              class="px-3 py-1.5 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              {settings.language === "ms" ? "Tambah" : "Add"}
                            </button>
                          </div>
                        </div>
                      {/if}

                      {#if (activeTabs[reminder.id] || 'content') === 'style'}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Background Mode
                               <select
                                 value={(reminder as any).bgMode || 'default'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { bgMode: e.currentTarget.value as any })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="default">Default Preset</option>
                                 <option value="solid">Solid Color</option>
                               </select>
                             </label>
                           </div>
                           
                           {#if (reminder as any).bgMode === 'solid'}
                             <div class="space-y-2">
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Background Color
                                 <div class="flex items-center gap-2 mt-1">
                                   <input
                                     type="color"
                                     value={reminder.bgColor || '#000000'}
                                     onchange={(e: any) => handleUpdateReminder(reminder.id, { bgColor: e.currentTarget.value })}
                                     class="w-10 h-9 rounded-xl border border-[var(--md-sys-color-outline)]/20 cursor-pointer overflow-hidden p-0"
                                   />
                                   <input
                                     type="text"
                                     value={reminder.bgColor || '#000000'}
                                     onchange={(e: any) => handleUpdateReminder(reminder.id, { bgColor: e.currentTarget.value })}
                                     class="flex-1 p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                                   />
                                 </div>
                               </label>
                             </div>
                           {/if}

                           <!-- Background Pattern -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Background Pattern
                               <select
                                 value={reminder.bgPattern || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { bgPattern: e.currentTarget.value })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None</option>
                                 <option value="islamic">Islamic Motif</option>
                                 <option value="dots">Dots Pattern</option>
                                 <option value="geometric">Geometric Grid</option>
                               </select>
                             </label>
                           </div>

                           <!-- Background Effect -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Ambient Visual Effect
                               <select
                                 value={reminder.bgEffect || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { bgEffect: e.currentTarget.value })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None</option>
                                 <option value="floating-particles">Floating Particles</option>
                                 <option value="ambient-pulses">Ambient Glow Pulses</option>
                               </select>
                             </label>
                           </div>

                           <!-- Border Highlight Style -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Border Highlight
                               <select
                                 value={reminder.borderHighlight || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { borderHighlight: e.currentTarget.value })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None</option>
                                 <option value="left">Left Edge</option>
                                 <option value="top">Top Edge</option>
                                 <option value="right">Right Edge</option>
                                 <option value="bottom">Bottom Edge</option>
                                 <option value="all">Full Border</option>
                               </select>
                             </label>
                           </div>

                           <!-- Custom Border Color -->
                           {#if reminder.borderHighlight && reminder.borderHighlight !== 'none'}
                             <div class="space-y-2">
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Border Color
                                 <div class="flex items-center gap-2 mt-1">
                                   <input
                                     type="color"
                                     value={reminder.borderColor || '#006c54'}
                                     onchange={(e: any) => handleUpdateReminder(reminder.id, { borderColor: e.currentTarget.value })}
                                     class="w-10 h-9 rounded-xl border border-[var(--md-sys-color-outline)]/20 cursor-pointer overflow-hidden p-0"
                                   />
                                   <input
                                     type="text"
                                     value={reminder.borderColor || '#006c54'}
                                     onchange={(e: any) => handleUpdateReminder(reminder.id, { borderColor: e.currentTarget.value })}
                                     class="flex-1 p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                                   />
                                 </div>
                               </label>
                             </div>
                           {/if}

                           <!-- Glow Color -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Shadow Glow Color
                               <div class="flex items-center gap-2 mt-1">
                                 <input
                                   type="color"
                                   value={reminder.bgGlowColor || '#000000'}
                                   onchange={(e: any) => handleUpdateReminder(reminder.id, { bgGlowColor: e.currentTarget.value })}
                                   class="w-10 h-9 rounded-xl border border-[var(--md-sys-color-outline)]/20 cursor-pointer overflow-hidden p-0"
                                 />
                                 <input
                                   type="text"
                                   value={reminder.bgGlowColor || '#000000'}
                                   onchange={(e: any) => handleUpdateReminder(reminder.id, { bgGlowColor: e.currentTarget.value })}
                                   class="flex-1 p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                                 />
                               </div>
                             </label>
                           </div>

                           <!-- Background Pattern Opacity -->
                           {#if reminder.bgPattern && reminder.bgPattern !== 'none'}
                             <div class="space-y-2">
                               <!-- svelte-ignore a11y_label_has_associated_control -->
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Pattern Opacity
                                 <md-slider
                                   min="0.01"
                                   max="0.4"
                                   step="0.01"
                                   value={reminder.bgPatternOpacity ?? 0.07}
                                   labeled
                                   onchange={(e: any) => handleUpdateReminder(reminder.id, { bgPatternOpacity: parseFloat(e.target.value) })}
                                   class="mt-1"
                                 ></md-slider>
                               </label>
                             </div>
                           {/if}
                        </div>
                      {/if}

                      {#if (activeTabs[reminder.id] || 'content') === 'scheduling'}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <!-- Duration -->
                           <div class="space-y-2">
                             <!-- svelte-ignore a11y_label_has_associated_control -->
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Display Duration (s)
                               <md-slider
                                 min="5"
                                 max="120"
                                 step="5"
                                 value={reminder.duration ?? settings.tvModeReminderInterval ?? 15}
                                 labeled
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { duration: parseInt(e.target.value) })}
                                 class="mt-1"
                               ></md-slider>
                             </label>
                           </div>
                           
                           <!-- Chime Type -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Notification Chime
                               <select
                                 value={reminder.chime || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { chime: e.currentTarget.value as any })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None</option>
                                 <option value="bell">Bell</option>
                                 <option value="chime">Chime</option>
                                 <option value="gong">Ambient Gong</option>
                                 <option value="notification">Notification Beep</option>
                               </select>
                             </label>
                           </div>

                           <!-- Chime Volume -->
                           {#if reminder.chime && reminder.chime !== 'none'}
                             <div class="space-y-2 col-span-1 sm:col-span-2">
                               <!-- svelte-ignore a11y_label_has_associated_control -->
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Chime Volume
                                 <div class="flex items-center gap-3">
                                   <md-slider
                                     min="10"
                                     max="100"
                                     step="10"
                                     value={reminder.chimeVolume ?? 80}
                                     labeled
                                     onchange={(e: any) => handleUpdateReminder(reminder.id, { chimeVolume: parseInt(e.target.value) })}
                                     class="flex-1 mt-1"
                                   ></md-slider>
                                   <span class="font-mono text-xs font-bold w-8 text-right text-[var(--md-sys-color-primary)]">
                                     {reminder.chimeVolume ?? 80}%
                                   </span>
                                 </div>
                               </label>
                             </div>
                           {/if}

                           <div class="col-span-1 sm:col-span-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3 my-1">
                             <span class="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)]">Countdown Timer</span>
                           </div>

                           <!-- Countdown Mode / Preset -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Countdown Target
                               <select
                                 value={reminder.countdownTarget === "next-prayer" ? "next-prayer" : reminder.countdownTarget === "next-friday" ? "next-friday" : reminder.countdownTarget ? "custom" : "none"}
                                 onchange={(e: any) => {
                                   const val = e.currentTarget.value;
                                   if (val === "none") {
                                     handleUpdateReminder(reminder.id, { countdownTarget: undefined });
                                   } else if (val === "next-prayer") {
                                     handleUpdateReminder(reminder.id, { countdownTarget: "next-prayer" });
                                   } else if (val === "next-friday") {
                                     handleUpdateReminder(reminder.id, { countdownTarget: "next-friday" });
                                   } else {
                                     const nowLocal = new Date();
                                     nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
                                     handleUpdateReminder(reminder.id, { countdownTarget: nowLocal.toISOString().slice(0, 16) });
                                   }
                                 }}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None</option>
                                 <option value="next-prayer">Next Prayer Time (Dynamic)</option>
                                 <option value="next-friday">Next Friday/Jumu'ah (Dynamic)</option>
                                 <option value="custom">Custom Date & Time Picker</option>
                               </select>
                             </label>
                           </div>

                           <!-- Custom DateTime Input -->
                           {#if reminder.countdownTarget && reminder.countdownTarget !== 'next-prayer' && reminder.countdownTarget !== 'next-friday'}
                             <div class="space-y-2">
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Custom Date & Time
                                 <input
                                   type="datetime-local"
                                   value={reminder.countdownTarget}
                                   onchange={(e: any) => handleUpdateReminder(reminder.id, { countdownTarget: e.currentTarget.value })}
                                   class="w-full p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                                 />
                               </label>
                             </div>
                           {/if}

                           <!-- Countdown Label -->
                           {#if reminder.countdownTarget}
                             <div class="space-y-2 col-span-1 sm:col-span-2">
                               <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                                 Countdown Header Label
                                 <input
                                   type="text"
                                   value={reminder.countdownLabel || ''}
                                   placeholder={settings.language === "ms" ? "Peringatan Waktu Solat / Menghitung Masa" : "Countdown Target Label"}
                                   oninput={(e: any) => handleUpdateReminder(reminder.id, { countdownLabel: e.currentTarget.value })}
                                   class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                                 />
                               </label>
                             </div>
                           {/if}

                           <!-- Restrictions Header -->
                           <div class="col-span-1 sm:col-span-2 border-t border-[var(--md-sys-color-outline)]/5 pt-3 my-1">
                             <span class="text-[10px] font-black uppercase tracking-widest text-[var(--md-sys-color-primary)]">Scheduling Restrictions</span>
                           </div>

                           <!-- Days of week -->
                           <div class="space-y-2 col-span-1 sm:col-span-2">
                             <span class="text-xs font-bold block text-[var(--md-sys-color-on-surface)] mb-1">Active Days of Week</span>
                             <div class="flex flex-wrap gap-1">
                               {#each [
                                 { val: 0, label: 'S' }, { val: 1, label: 'M' }, { val: 2, label: 'T' },
                                 { val: 3, label: 'W' }, { val: 4, label: 'T' }, { val: 5, label: 'F' }, { val: 6, label: 'S' }
                               ] as day}
                                 {@const isSelected = !reminder.daysOfWeek || reminder.daysOfWeek.length === 0 || reminder.daysOfWeek.includes(day.val)}
                                 <button
                                   type="button"
                                   onclick={() => {
                                     let current = reminder.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                                     if (current.includes(day.val)) {
                                       current = current.filter(d => d !== day.val);
                                     } else {
                                       current = [...current, day.val];
                                     }
                                     if (current.length === 0 || current.length === 7) {
                                       handleUpdateReminder(reminder.id, { daysOfWeek: undefined });
                                     } else {
                                       handleUpdateReminder(reminder.id, { daysOfWeek: current });
                                     }
                                   }}
                                   class={cn(
                                     "w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                                     isSelected
                                       ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm"
                                       : "bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline)]/15 hover:bg-[var(--md-sys-color-surface-container-high)]"
                                   )}
                                 >
                                   {day.label}
                                 </button>
                               {/each}
                             </div>
                           </div>

                           <!-- Hour Range -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Hourly Window (Start Hour)
                               <select
                                 value={reminder.startHour ?? 0}
                                 onchange={(e: any) => {
                                   const val = parseInt(e.currentTarget.value);
                                   handleUpdateReminder(reminder.id, { 
                                     startHour: val, 
                                     endHour: reminder.endHour !== undefined ? reminder.endHour : 23 
                                   });
                                 }}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                               >
                                 {#each Array.from({ length: 24 }) as _, h}
                                   <option value={h}>{String(h).padStart(2, '0')}:00</option>
                                 {/each}
                               </select>
                             </label>
                           </div>

                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Hourly Window (End Hour)
                               <select
                                 value={reminder.endHour ?? 23}
                                 onchange={(e: any) => {
                                   const val = parseInt(e.currentTarget.value);
                                   handleUpdateReminder(reminder.id, { 
                                     endHour: val, 
                                     startHour: reminder.startHour !== undefined ? reminder.startHour : 0 
                                   });
                                 }}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)] font-mono"
                               >
                                 {#each Array.from({ length: 24 }) as _, h}
                                   <option value={h}>{String(h).padStart(2, '0')}:59</option>
                                 {/each}
                               </select>
                             </label>
                           </div>

                           <!-- Prayer Range -->
                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Prayer Range (Start Prayer)
                               <select
                                 value={reminder.startPrayer || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { startPrayer: e.currentTarget.value })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None (All Day)</option>
                                 <option value="imsak">Imsak</option>
                                 <option value="fajr">Subuh / Fajr</option>
                                 <option value="syuruk">Syuruk / Sunrise</option>
                                 <option value="dhuhr">Zohor / Dhuhr</option>
                                 <option value="asr">Asar / Asr</option>
                                 <option value="maghrib">Maghrib</option>
                                 <option value="isha">Isyak / Isha</option>
                               </select>
                             </label>
                           </div>

                           <div class="space-y-2">
                             <label class="text-xs font-bold block text-[var(--md-sys-color-on-surface)]">
                               Prayer Range (End Prayer)
                               <select
                                 value={reminder.endPrayer || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { endPrayer: e.currentTarget.value })}
                                 class="w-full p-2.5 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1 outline-none text-[var(--md-sys-color-on-surface)]"
                               >
                                 <option value="none">None (All Day)</option>
                                 <option value="imsak">Imsak</option>
                                 <option value="fajr">Subuh / Fajr</option>
                                 <option value="syuruk">Syuruk / Sunrise</option>
                                 <option value="dhuhr">Zohor / Dhuhr</option>
                                 <option value="asr">Asar / Asr</option>
                                 <option value="maghrib">Maghrib</option>
                                 <option value="isha">Isyak / Isha</option>
                               </select>
                             </label>
                           </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
