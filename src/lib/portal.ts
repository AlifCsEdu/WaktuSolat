/**
 * A Svelte action to teleport an element to a different target in the DOM.
 * Useful for modals, tooltips, and dropdowns to escape parent stacking contexts.
 */
export function portal(node: HTMLElement, target: string | HTMLElement = 'body') {
  let targetEl: HTMLElement | null = null;

  function update(newTarget: string | HTMLElement) {
    if (typeof window === 'undefined') return;

    if (typeof newTarget === 'string') {
      targetEl = document.querySelector(newTarget);
    } else {
      targetEl = newTarget;
    }

    if (targetEl) {
      targetEl.appendChild(node);
    } else {
      console.warn(`Portal target "${newTarget}" not found`);
    }
  }

  // Only run portal mounting on client side
  if (typeof window !== 'undefined') {
    // Wait for a microtask to ensure DOM is ready
    Promise.resolve().then(() => update(target));
  }

  return {
    update,
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}
