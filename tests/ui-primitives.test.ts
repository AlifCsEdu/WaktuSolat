import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as transitions from '../src/lib/transitions';
import { ripple } from '../src/lib/actions/ripple';
import * as ui from '../src/lib/components/ui';

// Mock getComputedStyle for Node environment
if (typeof global.getComputedStyle === 'undefined') {
  (global as any).getComputedStyle = () => ({
    opacity: '1',
    transform: 'none',
    display: 'block',
    position: 'static',
    overflow: 'visible',
    getPropertyValue: () => ''
  });
}

if (typeof global.window === 'undefined') {
  (global as any).window = {
    getComputedStyle: (global as any).getComputedStyle,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
} else {
  if (!global.window.getComputedStyle) {
    (global.window as any).getComputedStyle = (global as any).getComputedStyle;
  }
}

describe('UI Primitives and Foundation Exports', () => {
  it('should export all 9 UI primitive components and ripple action from index.ts', () => {
    expect(ui.Button).toBeDefined();
    expect(ui.IconButton).toBeDefined();
    expect(ui.FilterChip).toBeDefined();
    expect(ui.Switch).toBeDefined();
    expect(ui.Slider).toBeDefined();
    expect(ui.SegmentedButton).toBeDefined();
    expect(ui.TextField).toBeDefined();
    expect(ui.Dialog).toBeDefined();
    expect(ui.Tabs).toBeDefined();
    expect(ui.ripple).toBeDefined();
  });
});

describe('M3 Transitions Foundation', () => {
  let dummyElement: HTMLElement;

  beforeEach(() => {
    dummyElement = {
      style: {},
      ownerDocument: {
        defaultView: {
          matchMedia: () => ({ matches: false }),
          getComputedStyle: () => ({ opacity: '1', transform: 'none', display: 'block' })
        }
      }
    } as unknown as HTMLElement;
  });

  it('should export all M3 transition functions and aliases', () => {
    expect(typeof transitions.m3Fly).toBe('function');
    expect(typeof transitions.m3Fade).toBe('function');
    expect(typeof transitions.m3Slide).toBe('function');
    expect(typeof transitions.m3Scale).toBe('function');
    expect(typeof transitions.fly).toBe('function');
    expect(typeof transitions.fade).toBe('function');
    expect(typeof transitions.slide).toBe('function');
    expect(typeof transitions.scale).toBe('function');
    expect(typeof transitions.send).toBe('function');
    expect(typeof transitions.receive).toBe('function');
  });

  it('m3Fly should not return zero duration when native view transitions are supported', () => {
    const t = transitions.m3Fly(dummyElement, { duration: 350 });
    expect(t).toBeDefined();
    expect(t.duration).toBe(350);
  });

  it('m3Fade should not return zero duration when native view transitions are supported', () => {
    const t = transitions.m3Fade(dummyElement, { duration: 300 });
    expect(t).toBeDefined();
    expect(t.duration).toBe(300);
  });

  it('m3Slide should not return zero duration when native view transitions are supported', () => {
    const t = transitions.m3Slide(dummyElement, { duration: 400 });
    expect(t).toBeDefined();
    expect(t.duration).toBe(400);
  });

  it('m3Scale / scale should return valid scale transition parameters', () => {
    const t = transitions.m3Scale(dummyElement, { duration: 250, start: 0.9 });
    expect(t).toBeDefined();
    expect(t.duration).toBe(250);

    const alias = transitions.scale(dummyElement, { duration: 250, start: 0.9 });
    expect(alias.duration).toBe(250);
  });
});

describe('Ripple Action', () => {
  it('should attach pointerdown event listeners and support update/destroy', () => {
    const listeners: Record<string, EventListener> = {};
    const element = {
      style: { position: 'static', overflow: 'visible' },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        delete listeners[event];
      }),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    } as unknown as HTMLElement;

    const action = ripple(element, { color: '#ffffff', opacity: 0.2 });
    expect(element.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true });

    // Test update
    action.update({ color: '#000000' });

    // Test destroy
    action.destroy();
    expect(element.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });
});
