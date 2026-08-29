<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ripple } from '../../actions/ripple';
  import { cn } from '../../utils';

  interface Props {
    variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'pill' | 'rounded' | 'square';
    disabled?: boolean;
    loading?: boolean;
    href?: string;
    target?: string;
    rel?: string;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    ariaLabel?: string;
    title?: string;
    rippleEffect?: boolean;
    onclick?: (e: MouseEvent) => void;
    leadingIcon?: Snippet;
    trailingIcon?: Snippet;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    variant = 'filled',
    size = 'md',
    shape = 'pill',
    disabled = false,
    loading = false,
    href,
    target,
    rel,
    type = 'button',
    class: className = '',
    ariaLabel,
    title,
    rippleEffect = true,
    onclick,
    leadingIcon,
    trailingIcon,
    children,
    ...restProps
  }: Props = $props();

  const variantClasses = {
    filled: 'bg-primary text-on-primary hover:brightness-105 active:brightness-95 shadow-sm hover:shadow focus-visible:ring-primary',
    tonal: 'bg-secondary-container text-on-secondary-container hover:brightness-95 dark:hover:brightness-110 active:brightness-90 focus-visible:ring-secondary',
    outlined: 'border border-outline bg-transparent text-primary hover:bg-primary/8 active:bg-primary/12 focus-visible:ring-primary',
    text: 'bg-transparent text-primary hover:bg-primary/8 active:bg-primary/12 focus-visible:ring-primary',
    elevated: 'bg-surface-container-low text-primary shadow-md hover:shadow-lg hover:bg-surface-container active:shadow-sm focus-visible:ring-primary'
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-5 text-sm gap-2 font-medium',
    lg: 'h-12 px-6 text-base gap-2.5 font-medium',
    xl: 'h-14 px-8 text-lg gap-3 font-semibold'
  };

  const shapeClasses = {
    pill: 'rounded-full',
    rounded: 'rounded-2xl',
    square: 'rounded-lg'
  };

  function handleClick(e: MouseEvent) {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    if (onclick) {
      onclick(e);
    }
  }
</script>

{#if href && !disabled}
  <a
    {href}
    {target}
    {rel}
    {title}
    aria-label={ariaLabel || title}
    aria-disabled={disabled || loading}
    class={cn(
      'inline-flex items-center justify-center select-none font-sans transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      variantClasses[variant],
      sizeClasses[size],
      shapeClasses[shape],
      (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none shadow-none',
      className
    )}
    onclick={handleClick}
    use:ripple={{ disabled: disabled || loading || !rippleEffect }}
    {...restProps}
  >
    {#if loading}
      <svg class="animate-spin -ml-0.5 mr-1.5 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {:else if leadingIcon}
      <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
        {@render leadingIcon()}
      </span>
    {/if}

    {#if children}
      <span class="truncate">
        {@render children()}
      </span>
    {/if}

    {#if trailingIcon && !loading}
      <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
        {@render trailingIcon()}
      </span>
    {/if}
  </a>
{:else}
  <button
    {type}
    {disabled}
    {title}
    aria-label={ariaLabel || title}
    aria-busy={loading}
    class={cn(
      'inline-flex items-center justify-center select-none font-sans transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer',
      variantClasses[variant],
      sizeClasses[size],
      shapeClasses[shape],
      (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none shadow-none',
      className
    )}
    onclick={handleClick}
    use:ripple={{ disabled: disabled || loading || !rippleEffect }}
    {...restProps}
  >
    {#if loading}
      <svg class="animate-spin -ml-0.5 mr-1.5 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {:else if leadingIcon}
      <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
        {@render leadingIcon()}
      </span>
    {/if}

    {#if children}
      <span class="truncate">
        {@render children()}
      </span>
    {/if}

    {#if trailingIcon && !loading}
      <span class="inline-flex shrink-0 items-center justify-center pointer-events-none" aria-hidden="true">
        {@render trailingIcon()}
      </span>
    {/if}
  </button>
{/if}
