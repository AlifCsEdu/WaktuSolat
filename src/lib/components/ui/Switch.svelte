<script lang="ts">
  import { cn } from '../../utils';

  interface Props {
    checked?: boolean;
    disabled?: boolean;
    icons?: boolean;
    id?: string;
    name?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
    [key: string]: any;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    icons = false,
    id,
    name,
    ariaLabel = 'Switch toggle',
    class: className = '',
    onchange,
    ...restProps
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    if (onchange) {
      onchange(checked);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-disabled={disabled}
  aria-label={ariaLabel}
  {id}
  {name}
  {disabled}
  class={cn(
    'relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    checked
      ? 'bg-primary border-2 border-primary'
      : 'bg-surface-container-highest border-2 border-outline hover:border-on-surface-variant',
    disabled && 'opacity-38 cursor-not-allowed pointer-events-none border-outline/30 bg-surface-container/50',
    className
  )}
  onclick={toggle}
  onkeydown={handleKeyDown}
  {...restProps}
>
  <span
    class={cn(
      'pointer-events-none flex items-center justify-center rounded-full transition-all duration-200 ease-in-out shadow-xs',
      checked
        ? 'h-6 w-6 translate-x-[18px] bg-on-primary text-primary'
        : 'h-4 w-4 translate-x-[2px] bg-outline text-surface-container-highest group-hover:bg-on-surface-variant',
      disabled && (checked ? 'bg-surface-container text-outline' : 'bg-outline/50')
    )}
  >
    {#if icons}
      {#if checked}
        <svg class="h-3.5 w-3.5 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      {:else}
        <svg class="h-2.5 w-2.5 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      {/if}
    {/if}
  </span>
</button>
