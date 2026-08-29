<script lang="ts">
  import { cn } from '../../utils';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    unit?: string;
    disabled?: boolean;
    showValue?: boolean;
    class?: string;
    oninput?: (value: number) => void;
    onchange?: (value: number) => void;
    [key: string]: any;
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    label = '',
    unit = '',
    disabled = false,
    showValue = true,
    class: className = '',
    oninput,
    onchange,
    ...restProps
  }: Props = $props();

  let trackElement: HTMLElement | null = $state(null);
  let isDragging = $state(false);

  // Derived percentage for slider layout
  let percentage = $derived(
    Math.min(100, Math.max(0, ((value - min) / (max - min || 1)) * 100))
  );

  function clamp(val: number) {
    return Math.min(max, Math.max(min, val));
  }

  function roundToStep(val: number) {
    const steps = Math.round((val - min) / step);
    return clamp(min + steps * step);
  }

  function updateFromPointer(clientX: number) {
    if (!trackElement || disabled) return;
    const rect = trackElement.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    const rawVal = min + pos * (max - min);
    const newVal = roundToStep(rawVal);

    if (newVal !== value) {
      value = newVal;
      if (oninput) oninput(newVal);
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (disabled) return;
    isDragging = true;
    updateFromPointer(e.clientX);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    updateFromPointer(e.clientX);
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    if (onchange) onchange(value);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    let delta = 0;
    const largeStep = Math.max(step * 5, (max - min) / 10);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -step;
        break;
      case 'PageUp':
        delta = largeStep;
        break;
      case 'PageDown':
        delta = -largeStep;
        break;
      case 'Home':
        value = min;
        if (oninput) oninput(min);
        if (onchange) onchange(min);
        e.preventDefault();
        return;
      case 'End':
        value = max;
        if (oninput) oninput(max);
        if (onchange) onchange(max);
        e.preventDefault();
        return;
      default:
        return;
    }

    e.preventDefault();
    const newVal = clamp(roundToStep(value + delta));
    if (newVal !== value) {
      value = newVal;
      if (oninput) oninput(newVal);
      if (onchange) onchange(newVal);
    }
  }
</script>

<div class={cn('w-full flex flex-col gap-1.5 select-none font-sans', className)} {...restProps}>
  {#if label || (showValue && unit)}
    <div class="flex items-center justify-between text-xs font-medium text-on-surface-variant px-0.5">
      {#if label}
        <span>{label}</span>
      {/if}
      {#if showValue}
        <span class="font-mono font-semibold text-on-surface">{value}{unit}</span>
      {/if}
    </div>
  {/if}

  <div
    bind:this={trackElement}
    role="slider"
    tabindex={disabled ? -1 : 0}
    aria-label={label || 'Slider'}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-disabled={disabled}
    class={cn(
      'relative flex items-center h-10 w-full cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full',
      disabled && 'opacity-38 cursor-not-allowed pointer-events-none'
    )}
    onpointerdown={handlePointerDown}
    onkeydown={handleKeyDown}
  >
    <!-- Inactive Track -->
    <div class="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
      <!-- Active Track -->
      <div
        class="h-full bg-primary rounded-full transition-all duration-75"
        style="width: {percentage}%;"
      ></div>
    </div>

    <!-- Thumb -->
    <div
      class={cn(
        'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-primary border-[3px] border-surface shadow-md transition-transform duration-100 flex items-center justify-center pointer-events-none',
        isDragging ? 'scale-110 shadow-lg' : 'hover:scale-105'
      )}
      style="left: {percentage}%;"
    >
      <div class="h-1.5 w-1.5 rounded-full bg-on-primary"></div>
    </div>
  </div>
</div>
