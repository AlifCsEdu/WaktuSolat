<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ripple } from '../../actions/ripple';
  import { cn } from '../../utils';

  interface Props {
    selected?: boolean;
    label?: string;
    disabled?: boolean;
    shape?: 'pill' | 'rounded';
    class?: string;
    rippleEffect?: boolean;
    onclick?: (e: MouseEvent) => void;
    leadingIcon?: Snippet;
    trailingIcon?: Snippet;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    selected = $bindable(false),
    label = '',
    disabled = false,
    shape = 'pill',
    class: className = '',
    rippleEffect = true,
    onclick,
    leadingIcon,
    trailingIcon,
    children,
    ...restProps
  }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    selected = !selected;
    if (onclick) {
      onclick(e);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      selected = !selected;
      if (onclick) {
        onclick(e as unknown as MouseEvent);
      }
    }
  }
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={selected}
  aria-disabled={disabled}
  {disabled}
  class={cn(
    'inline-flex items-center justify-center select-none font-sans text-sm font-medium h-9 px-3.5 gap-2 transition-all duration-200 active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer border',
    shape === 'pill' ? 'rounded-full' : 'rounded-xl',
    selected
      ? 'bg-secondary-container text-on-secondary-container border-transparent font-semibold shadow-xs'
      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-outline-variant/60',
    disabled && 'opacity-38 cursor-not-allowed pointer-events-none border-transparent',
    className
  )}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  use:ripple={{ disabled: disabled || !rippleEffect }}
  {...restProps}
>
  {#if leadingIcon}
    <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
      {@render leadingIcon()}
    </span>
  {:else if selected}
    <svg class="h-4 w-4 shrink-0 text-current transition-transform duration-200 scale-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  {/if}

  {#if children}
    <span class="truncate">
      {@render children()}
    </span>
  {:else if label}
    <span class="truncate">{label}</span>
  {/if}

  {#if trailingIcon}
    <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
      {@render trailingIcon()}
    </span>
  {/if}
</button>
