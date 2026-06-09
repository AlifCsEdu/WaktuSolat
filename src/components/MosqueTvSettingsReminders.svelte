<script lang="ts">
  import { Megaphone, ChevronDown, Plus, Trash2, GripVertical, Image as ImageIcon, Type, Palette, Settings, Upload, ImagePlus, Volume2, Play, Layout, Clock } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { cn } from "../lib/utils";
  import { appSettings } from "../state/settings.svelte.ts";
  import { playSynthesizedChime } from "./TvModeReminderCard.svelte";

  let { open = $bindable(false) } = $props();
  const settings = $derived(appSettings.settings);
  const updateSettings = (updates: any) => appSettings.updateSettings(updates);
  const t = (key: any, params?: any) => appSettings.t(key, params);

  let activeTabs = $state<Record<string, string>>({});
  let collapsedReminders = $state<Record<string, boolean>>({});

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
                        <div class="space-y-3">
                          {#each (reminder.texts || []) as textBlock, tIdx}
                            <div class="flex items-start gap-2 relative group">
                              <textarea
                                value={typeof textBlock === 'string' ? textBlock : textBlock.content}
                                oninput={(e: any) => {
                                  const newTexts = [...(reminder.texts || [])];
                                  if (typeof newTexts[tIdx] === 'string') {
                                    newTexts[tIdx] = e.currentTarget.value as any;
                                  } else {
                                    newTexts[tIdx] = { ...newTexts[tIdx], content: e.currentTarget.value };
                                  }
                                  handleUpdateReminder(reminder.id, { texts: newTexts });
                                }}
                                class="w-full min-h-[80px] p-3 pt-3.5 pr-10 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] text-sm rounded-xl border border-[var(--md-sys-color-outline)]/10 focus:border-[var(--md-sys-color-primary)] outline-none resize-y transition-all"
                                placeholder="Enter text for this slide..."
                              ></textarea>
                              
                              <button
                                type="button"
                                onclick={() => {
                                  const newTexts = [...(reminder.texts || [])];
                                  newTexts.splice(tIdx, 1);
                                  handleUpdateReminder(reminder.id, { texts: newTexts });
                                }}
                                class="absolute right-2 top-2 p-1.5 text-[var(--md-sys-color-on-surface-variant)] opacity-0 group-hover:opacity-100 bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          {/each}
                          
                          <button
                            type="button"
                            onclick={() => {
                              const newTexts = [...(reminder.texts || []), { id: Date.now().toString(), content: "", type: "body" }];
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
                           <p class="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                              Images will be shown interchangeably with texts or full screen depending on layout.
                           </p>
                           <textarea
                            value={(reminder.images || []).join('\n')}
                            oninput={(e) => handleUpdateReminder(reminder.id, { images: e.currentTarget.value.split('\n').filter(Boolean) })}
                            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
                            class="w-full h-32 p-3 text-xs font-mono bg-[var(--md-sys-color-surface-container)] rounded-xl border border-[var(--md-sys-color-outline)]/20 focus:border-[var(--md-sys-color-primary)] outline-none resize-none custom-scrollbar"
                          ></textarea>
                        </div>
                      {/if}

                      {#if (activeTabs[reminder.id] || 'content') === 'style'}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div class="space-y-2">
                             <label class="text-xs font-bold block">
                               Background Mode
                               <select
                                 value={(reminder as any).bgMode || 'default'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { bgMode: e.currentTarget.value as any })}
                                 class="w-full p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1"
                               >
                                 <option value="default">Default</option>
                                 <option value="solid">Solid Color</option>
                               </select>
                             </label>
                           </div>
                           
                           {#if (reminder as any).bgMode === 'solid'}
                             <div class="space-y-2">
                               <label class="text-xs font-bold block">
                                 Color
                                 <input
                                   type="color"
                                   value={reminder.bgColor || '#000000'}
                                   onchange={(e: any) => handleUpdateReminder(reminder.id, { bgColor: e.currentTarget.value })}
                                   class="w-full h-8 rounded cursor-pointer mt-1"
                                 />
                               </label>
                             </div>
                           {/if}
                        </div>
                      {/if}

                      {#if (activeTabs[reminder.id] || 'content') === 'scheduling'}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div class="space-y-2">
                             <!-- svelte-ignore a11y_label_has_associated_control -->
                             <label class="text-xs font-bold block">
                               Duration (s)
                               <md-slider
                                 min="5"
                                 max="60"
                                 step="5"
                                 value={reminder.duration ?? settings.tvModeReminderInterval ?? 15}
                                 labeled
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { duration: parseInt(e.target.value) })}
                                 class="mt-1"
                               ></md-slider>
                             </label>
                           </div>
                           
                           <div class="space-y-2">
                             <label class="text-xs font-bold block">
                               Chime
                               <select
                                 value={reminder.chime || 'none'}
                                 onchange={(e: any) => handleUpdateReminder(reminder.id, { chime: e.currentTarget.value as any })}
                                 class="w-full p-2 text-xs rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 mt-1"
                               >
                                 <option value="none">None</option>
                                 <option value="bell">Bell</option>
                                 <option value="chime">Chime</option>
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
