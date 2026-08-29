<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { m3Scale } from '../../transitions';
  import { cn } from '../../utils';

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    class?: string;
    onClose?: () => void;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    [key: string]: any;
  }

  let {
    open = $bindable(false),
    title = '',
    description = '',
    maxWidth = 'md',
    closeOnClickOutside = true,
    closeOnEscape = true,
    class: className = '',
    onClose,
    header,
    footer,
    children,
    ...restProps
  }: Props = $props();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)]'
  };

  function closeDialog() {
    open = false;
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      closeDialog();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (open && closeOnEscape && e.key === 'Escape') {
      e.stopPropagation();
      closeDialog();
    }
  }

  $effect(() => {
    if (open && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-all font-sans"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
      class={cn(
        'relative w-full bg-surface-container-high text-on-surface rounded-3xl md:rounded-[32px] shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]',
        maxWidthClasses[maxWidth],
        className
      )}
      transition:m3Scale={{ start: 0.92, duration: 300 }}
      {...restProps}
    >
      {#if header}
        <div class="px-6 pt-6 pb-2 shrink-0">
          {@render header()}
        </div>
      {:else if title}
        <div class="px-6 pt-6 pb-2 shrink-0 flex items-center justify-between">
          <div>
            <h2 id="dialog-title" class="text-xl font-bold tracking-tight text-on-surface">
              {title}
            </h2>
            {#if description}
              <p id="dialog-description" class="text-sm text-on-surface-variant mt-1">
                {description}
              </p>
            {/if}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            class="p-2 -mr-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-on-surface/8 transition-colors cursor-pointer"
            onclick={closeDialog}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      {/if}

      {#if children}
        <div class="px-6 py-4 overflow-y-auto overscroll-contain flex-1">
          {@render children()}
        </div>
      {/if}

      {#if footer}
        <div class="px-6 py-4 bg-surface-container/50 border-t border-outline-variant/20 shrink-0 flex items-center justify-end gap-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
