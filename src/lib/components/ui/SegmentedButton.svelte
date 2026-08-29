<script lang="ts">
  import { ripple } from '../../actions/ripple';
  import { cn } from '../../utils';

  interface Option {
    id: string;
    label: string;
    icon?: any;
    disabled?: boolean;
  }

  interface Props {
    options: Option[];
    value?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    onchange?: (id: string) => void;
    [key: string]: any;
  }

  let {
    options = [],
    value = $bindable(''),
    disabled = false,
    size = 'md',
    class: className = '',
    onchange,
    ...restProps
  }: Props = $props();

  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5 gap-1.5',
    md: 'h-10 text-sm px-4 gap-2 font-medium',
    lg: 'h-12 text-base px-5 gap-2.5 font-medium'
  };

  function selectOption(id: string) {
    if (disabled || value === id) return;
    value = id;
    if (onchange) {
      onchange(id);
    }
  }

  function handleKeyDown(e: KeyboardEvent, currentIndex: number) {
    if (disabled || options.length === 0) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length;
      while (options[nextIndex]?.disabled && nextIndex !== currentIndex) {
        nextIndex = (nextIndex + 1) % options.length;
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
      while (options[nextIndex]?.disabled && nextIndex !== currentIndex) {
        nextIndex = (nextIndex - 1 + options.length) % options.length;
      }
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const opt = options[nextIndex];
    if (opt && !opt.disabled) {
      selectOption(opt.id);
    }
  }
</script>

<div
  role="radiogroup"
  aria-disabled={disabled}
  class={cn(
    'inline-flex items-center p-1 bg-surface-container-high/70 backdrop-blur-md rounded-full border border-outline-variant/30 select-none relative font-sans',
    disabled && 'opacity-40 pointer-events-none cursor-not-allowed',
    className
  )}
  {...restProps}
>
  {#each options as opt, index (opt.id)}
    {@const isSelected = value === opt.id}
    {@const isDisabled = disabled || opt.disabled}

    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      class={cn(
        'relative z-10 inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        sizeClasses[size],
        isSelected
          ? 'bg-primary text-on-primary font-semibold shadow-xs'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5',
        isDisabled && 'opacity-38 cursor-not-allowed pointer-events-none'
      )}
      onclick={() => selectOption(opt.id)}
      onkeydown={(e) => handleKeyDown(e, index)}
      use:ripple={{ disabled: isDisabled || isSelected }}
    >
      {#if opt.icon}
        <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
          {#if typeof opt.icon === 'function'}
            <opt.icon class="h-4 w-4" />
          {:else}
            {@render opt.icon()}
          {/if}
        </span>
      {/if}
      <span class="truncate">{opt.label}</span>
    </button>
  {/each}
</div>
