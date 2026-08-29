<script lang="ts">
  import { ripple } from '../../actions/ripple';
  import { cn } from '../../utils';

  interface Tab {
    id: string;
    label: string;
    icon?: any;
    badge?: string | number;
    disabled?: boolean;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
    variant?: 'primary' | 'secondary' | 'pill';
    class?: string;
    onchange?: (id: string) => void;
    [key: string]: any;
  }

  let {
    tabs = [],
    activeTab = $bindable(''),
    variant = 'primary',
    class: className = '',
    onchange,
    ...restProps
  }: Props = $props();

  function selectTab(id: string) {
    if (activeTab === id) return;
    activeTab = id;
    if (onchange) {
      onchange(id);
    }
  }

  function handleKeyDown(e: KeyboardEvent, currentIndex: number) {
    if (tabs.length === 0) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
      while (tabs[nextIndex]?.disabled && nextIndex !== currentIndex) {
        nextIndex = (nextIndex + 1) % tabs.length;
      }
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      while (tabs[nextIndex]?.disabled && nextIndex !== currentIndex) {
        nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
      }
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const tab = tabs[nextIndex];
    if (tab && !tab.disabled) {
      selectTab(tab.id);
    }
  }
</script>

<div
  role="tablist"
  class={cn(
    'flex items-center select-none font-sans relative',
    variant === 'pill'
      ? 'p-1 bg-surface-container-high/60 rounded-full border border-outline-variant/30 gap-1'
      : 'border-b border-outline-variant/30 gap-2',
    className
  )}
  {...restProps}
>
  {#each tabs as tab, index (tab.id)}
    {@const isActive = activeTab === tab.id}
    {@const isDisabled = tab.disabled}

    <button
      type="button"
      role="tab"
      id="tab-{tab.id}"
      aria-controls="panel-{tab.id}"
      aria-selected={isActive}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      tabindex={isActive ? 0 : -1}
      class={cn(
        'relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        variant === 'pill'
          ? cn(
              'h-9 px-4 rounded-full text-sm gap-2',
              isActive
                ? 'bg-primary text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
            )
          : cn(
              'h-12 px-5 text-sm gap-2 rounded-t-xl',
              isActive
                ? 'text-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
            ),
        isDisabled && 'opacity-38 cursor-not-allowed pointer-events-none'
      )}
      onclick={() => selectTab(tab.id)}
      onkeydown={(e) => handleKeyDown(e, index)}
      use:ripple={{ disabled: isDisabled || (variant === 'pill' && isActive) }}
    >
      {#if tab.icon}
        <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
          {#if typeof tab.icon === 'function'}
            <tab.icon class="h-4 w-4" />
          {:else}
            {@render tab.icon()}
          {/if}
        </span>
      {/if}

      <span class="truncate">{tab.label}</span>

      {#if tab.badge !== undefined}
        <span
          class={cn(
            'inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-full',
            isActive
              ? (variant === 'pill' ? 'bg-on-primary text-primary' : 'bg-primary text-on-primary')
              : 'bg-surface-container-highest text-on-surface-variant'
          )}
        >
          {tab.badge}
        </span>
      {/if}

      {#if variant === 'primary' && isActive}
        <div class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full"></div>
      {:else if variant === 'secondary' && isActive}
        <div class="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-full"></div>
      {/if}
    </button>
  {/each}
</div>
