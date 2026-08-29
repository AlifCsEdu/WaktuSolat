<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ripple } from '../../actions/ripple';
  import { cn } from '../../utils';

  interface Props {
    variant?: 'standard' | 'tonal' | 'filled' | 'outlined';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'rounded';
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
    title?: string;
    href?: string;
    target?: string;
    rel?: string;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    rippleEffect?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    variant = 'standard',
    size = 'md',
    shape = 'circle',
    disabled = false,
    loading = false,
    ariaLabel,
    title,
    href,
    target,
    rel,
    type = 'button',
    class: className = '',
    rippleEffect = true,
    onclick,
    children,
    ...restProps
  }: Props = $props();

  const variantClasses = {
    standard: 'bg-transparent text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface focus-visible:ring-primary',
    tonal: 'bg-secondary-container text-on-secondary-container hover:brightness-95 dark:hover:brightness-110 active:brightness-90 focus-visible:ring-secondary',
    filled: 'bg-primary text-on-primary hover:brightness-105 active:brightness-95 shadow-xs focus-visible:ring-primary',
    outlined: 'border border-outline bg-transparent text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface focus-visible:ring-primary'
  };

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5 text-base',
    md: 'w-10 h-10 p-2 text-lg',
    lg: 'w-12 h-12 p-2.5 text-xl',
    xl: 'w-14 h-14 p-3 text-2xl'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl'
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
    aria-label={ariaLabel || title || 'Button'}
    aria-disabled={disabled || loading}
    class={cn(
      'inline-flex items-center justify-center select-none shrink-0 transition-all duration-200 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      variantClasses[variant],
      sizeClasses[size],
      shapeClasses[shape],
      (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none shadow-none',
      className
    )}
    onclick={handleClick}
    use:ripple={{ disabled: disabled || loading || !rippleEffect, centered: true }}
    {...restProps}
  >
    {#if loading}
      <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {:else if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button
    {type}
    {disabled}
    {title}
    aria-label={ariaLabel || title || 'Button'}
    aria-busy={loading}
    class={cn(
      'inline-flex items-center justify-center select-none shrink-0 transition-all duration-200 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer',
      variantClasses[variant],
      sizeClasses[size],
      shapeClasses[shape],
      (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none shadow-none',
      className
    )}
    onclick={handleClick}
    use:ripple={{ disabled: disabled || loading || !rippleEffect, centered: true }}
    {...restProps}
  >
    {#if loading}
      <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {:else if children}
      {@render children()}
    {/if}
  </button>
{/if}
