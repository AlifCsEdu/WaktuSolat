<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils';

  interface Props {
    value?: string;
    type?: string;
    placeholder?: string;
    label?: string;
    variant?: 'outlined' | 'filled';
    clearable?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    error?: string;
    helperText?: string;
    id?: string;
    name?: string;
    autocomplete?: string;
    class?: string;
    inputClass?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    leadingIcon?: Snippet;
    trailingIcon?: Snippet;
    [key: string]: any;
  }

  let {
    value = $bindable(''),
    type = 'text',
    placeholder = '',
    label = '',
    variant = 'outlined',
    clearable = false,
    disabled = false,
    readonly = false,
    required = false,
    error = '',
    helperText = '',
    id,
    name,
    autocomplete,
    class: className = '',
    inputClass = '',
    oninput,
    onchange,
    onkeydown,
    leadingIcon,
    trailingIcon,
    ...restProps
  }: Props = $props();

  let isFocused = $state(false);
  let inputId = $derived(id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined));

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    if (oninput) oninput(e);
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    if (onchange) onchange(e);
  }

  function handleClear() {
    value = '';
    if (oninput) oninput(new Event('input', { bubbles: true }));
    if (onchange) onchange(new Event('change', { bubbles: true }));
  }
</script>

<div class={cn('flex flex-col gap-1 w-full font-sans', className)}>
  {#if label}
    <label
      for={inputId}
      class={cn(
        'text-xs font-semibold px-1 select-none transition-colors duration-150',
        error
          ? 'text-error'
          : isFocused
            ? 'text-primary'
            : 'text-on-surface-variant'
      )}
    >
      {label}
      {#if required}
        <span class="text-error ml-0.5">*</span>
      {/if}
    </label>
  {/if}

  <div
    class={cn(
      'relative flex items-center w-full transition-all duration-200 overflow-hidden',
      variant === 'outlined'
        ? 'rounded-2xl border bg-surface-container-lowest/60'
        : 'rounded-t-2xl border-b-2 bg-surface-container-high',
      error
        ? 'border-error focus-within:border-error focus-within:ring-2 focus-within:ring-error/20'
        : isFocused
          ? 'border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
          : 'border-outline-variant/60 hover:border-outline',
      disabled && 'opacity-40 pointer-events-none bg-surface-container/30 border-outline-variant/30'
    )}
  >
    {#if leadingIcon}
      <div class="pl-3.5 pr-1 text-on-surface-variant shrink-0 flex items-center justify-center pointer-events-none">
        {@render leadingIcon()}
      </div>
    {/if}

    <input
      id={inputId}
      {name}
      {type}
      {placeholder}
      {disabled}
      {readonly}
      {required}
      {autocomplete}
      value={value}
      aria-invalid={!!error}
      aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
      class={cn(
        'w-full bg-transparent px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none font-sans min-w-0',
        leadingIcon && 'pl-2',
        (trailingIcon || (clearable && value)) && 'pr-2',
        inputClass
      )}
      onfocus={() => (isFocused = true)}
      onblur={() => (isFocused = false)}
      oninput={handleInput}
      onchange={handleChange}
      {onkeydown}
      {...restProps}
    />

    {#if clearable && value && !disabled && !readonly}
      <button
        type="button"
        aria-label="Clear input"
        tabindex="-1"
        class="pr-3 pl-1 text-on-surface-variant/70 hover:text-on-surface focus:outline-none cursor-pointer flex items-center justify-center transition-colors"
        onclick={handleClear}
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </button>
    {/if}

    {#if trailingIcon}
      <div class="pr-3.5 pl-1 text-on-surface-variant shrink-0 flex items-center justify-center pointer-events-none">
        {@render trailingIcon()}
      </div>
    {/if}
  </div>

  {#if error}
    <p id="{inputId}-error" class="text-xs text-error font-medium px-1 flex items-center gap-1">
      <svg class="h-3.5 w-3.5 shrink-0 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{error}</span>
    </p>
  {:else if helperText}
    <p id="{inputId}-helper" class="text-xs text-on-surface-variant px-1">
      {helperText}
    </p>
  {/if}
</div>
