export interface RippleOptions {
  color?: string;
  opacity?: number;
  duration?: number;
  disabled?: boolean;
  centered?: boolean;
}

/**
 * Lightweight, high-performance Svelte 5 action for Material 3 tactile ripple effects.
 * Honors prefers-reduced-motion and cleans up DOM elements cleanly upon interaction completion.
 */
export function ripple(node: HTMLElement, options: RippleOptions = {}) {
  let opts: RippleOptions = { ...options };

  const isReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createRipple(e: PointerEvent) {
    if (opts.disabled || isReducedMotion()) return;
    // Only primary click
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    
    if (style.position === 'static') {
      node.style.position = 'relative';
    }
    if (style.overflow !== 'hidden') {
      node.style.overflow = 'hidden';
    }

    const circle = document.createElement('span');
    circle.className = 'm3-ripple-wave';
    circle.setAttribute('aria-hidden', 'true');

    const width = rect.width;
    const height = rect.height;
    const diameter = Math.max(width, height) * 2;
    const radius = diameter / 2;

    let x: number;
    let y: number;

    if (opts.centered) {
      x = width / 2 - radius;
      y = height / 2 - radius;
    } else {
      x = e.clientX - rect.left - radius;
      y = e.clientY - rect.top - radius;
    }

    const duration = opts.duration ?? 450;
    const opacity = opts.opacity ?? 0.14;
    const color = opts.color ?? 'currentColor';

    Object.assign(circle.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${diameter}px`,
      height: `${diameter}px`,
      borderRadius: '50%',
      backgroundColor: color,
      pointerEvents: 'none',
      opacity: `${opacity}`,
      transform: 'scale(0)',
      willChange: 'transform, opacity',
      transition: `transform ${duration}ms cubic-bezier(0.2, 0, 0, 1), opacity ${duration}ms linear`,
      zIndex: '0'
    });

    node.appendChild(circle);

    // Force layout reflow before triggering animation
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    circle.offsetHeight;
    circle.style.transform = 'scale(1)';

    let released = false;

    function releaseRipple() {
      if (released) return;
      released = true;

      circle.style.transition = `opacity 250ms cubic-bezier(0.2, 0, 0, 1), transform ${duration}ms cubic-bezier(0.2, 0, 0, 1)`;
      circle.style.opacity = '0';

      setTimeout(() => {
        if (circle.parentNode === node) {
          node.removeChild(circle);
        }
      }, 300);

      window.removeEventListener('pointerup', releaseRipple);
      window.removeEventListener('pointercancel', releaseRipple);
      node.removeEventListener('pointerleave', releaseRipple);
    }

    window.addEventListener('pointerup', releaseRipple, { passive: true });
    window.addEventListener('pointercancel', releaseRipple, { passive: true });
    node.addEventListener('pointerleave', releaseRipple, { passive: true });
  }

  node.addEventListener('pointerdown', createRipple, { passive: true });

  return {
    update(newOptions: RippleOptions = {}) {
      opts = { ...newOptions };
    },
    destroy() {
      node.removeEventListener('pointerdown', createRipple);
    }
  };
}
