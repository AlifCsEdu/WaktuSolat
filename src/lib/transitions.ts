import { cubicOut, cubicIn, quintOut, quintIn, expoOut, expoIn, backOut, backIn } from "svelte/easing";
import { fade as svelteFade, fly as svelteFly, slide as svelteSlide, scale as svelteScale } from "svelte/transition";
// Material 3 / Apple approximations using Svelte's built-in easings
export const emphasizedEntrance = quintOut; // Smooth, long tail deceleration
export const emphasizedExit = quintIn;      // Sharp acceleration

export const standardEntrance = cubicOut;
export const standardExit = cubicIn;

export const expressiveEntrance = expoOut;
export const expressiveExit = expoIn;

// Configurable defaults for the Antigravity design language
const DEFAULT_ENTER_DURATION = 400;
const DEFAULT_EXIT_DURATION = 250;

/**
 * Antigravity Custom Fly Transition
 * Uses emphasized deceleration for entry (smooth slide in)
 * and sharp acceleration for exit (quick slide out).
 */
export function m3Fly(node: Element, params: any = {}) {
  const isExit = params.isExit || false;
  return svelteFly(node, {
    y: params.y ?? 20,
    x: params.x ?? 0,
    duration: params.duration ?? (isExit ? DEFAULT_EXIT_DURATION : DEFAULT_ENTER_DURATION),
    easing: params.easing ?? (isExit ? emphasizedExit : emphasizedEntrance),
    delay: params.delay ?? 0,
  });
}

/**
 * Antigravity Custom Fade Transition
 */
export function m3Fade(node: Element, params: any = {}) {
  const isExit = params.isExit || false;
  return svelteFade(node, {
    duration: params.duration ?? (isExit ? DEFAULT_EXIT_DURATION : DEFAULT_ENTER_DURATION),
    easing: params.easing ?? (isExit ? emphasizedExit : emphasizedEntrance),
    delay: params.delay ?? 0,
  });
}

/**
 * Antigravity Custom Slide Transition
 */
export function m3Slide(node: Element, params: any = {}) {
  const isExit = params.isExit || false;
  return svelteSlide(node, {
    duration: params.duration ?? (isExit ? DEFAULT_EXIT_DURATION : DEFAULT_ENTER_DURATION),
    easing: params.easing ?? (isExit ? emphasizedExit : emphasizedEntrance),
    delay: params.delay ?? 0,
  });
}

/**
 * Antigravity Custom Scale Transition
 */
export function m3Scale(node: Element, params: any = {}) {
  const isExit = params.isExit || false;
  return svelteScale(node, {
    duration: params.duration ?? (isExit ? DEFAULT_EXIT_DURATION : DEFAULT_ENTER_DURATION),
    easing: params.easing ?? (isExit ? emphasizedExit : emphasizedEntrance),
    delay: params.delay ?? 0,
    start: params.start ?? 0,
    opacity: params.opacity ?? 0,
  });
}
