import { describe, it, expect, beforeEach } from 'vitest';
import { PRAYER_COLORS, applyThemeFromHex } from '../src/lib/theme';
import { DEFAULT_GENERAL_SETTINGS } from '../src/types';

// Mock minimal DOM environment for Node.js Vitest runs
const setStyles: Record<string, string> = {};
const classes = new Set<string>();
const attrs: Record<string, string> = {};

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      classList: {
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
        contains: (cls: string) => classes.has(cls)
      },
      style: {
        setProperty: (k: string, v: string) => { setStyles[k] = v; },
        getPropertyValue: (k: string) => setStyles[k] || ''
      },
      setAttribute: (k: string, v: string) => { attrs[k] = v; },
      getAttribute: (k: string) => attrs[k] || null
    }
  };
}

describe('Feature 1: Atmospheric Prayer Color Spectrum', () => {
  it('should define all 7 Islamic prayer phases in PRAYER_COLORS', () => {
    expect(PRAYER_COLORS).toHaveProperty('imsak');
    expect(PRAYER_COLORS).toHaveProperty('fajr');
    expect(PRAYER_COLORS).toHaveProperty('syuruk');
    expect(PRAYER_COLORS).toHaveProperty('dhuhr');
    expect(PRAYER_COLORS).toHaveProperty('asr');
    expect(PRAYER_COLORS).toHaveProperty('maghrib');
    expect(PRAYER_COLORS).toHaveProperty('isha');
  });

  it('should specify valid hex color codes for all prayer phases', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const [phase, color] of Object.entries(PRAYER_COLORS)) {
      expect(color).toMatch(hexPattern);
    }
  });

  it('should have distinct atmospheric tones matching solar trajectory', () => {
    // Imsak should align with midnight indigo
    expect(PRAYER_COLORS.imsak.toUpperCase()).toBe('#1E1B4B');
    // Subuh twilight violet
    expect(PRAYER_COLORS.fajr.toUpperCase()).toBe('#6750A4');
    // Syuruk warm golden dawn
    expect(PRAYER_COLORS.syuruk.toUpperCase()).toBe('#D97706');
    // Zohor high sky azure
    expect(PRAYER_COLORS.dhuhr.toUpperCase()).toBe('#0284C7');
    // Asar amber warmth
    expect(PRAYER_COLORS.asr.toUpperCase()).toBe('#D97706');
    // Maghrib glowing sunset crimson
    expect(PRAYER_COLORS.maghrib.toUpperCase()).toBe('#BF3626');
    // Isyak deep midnight indigo
    expect(PRAYER_COLORS.isha.toUpperCase()).toBe('#1E1B4B');
  });
});

describe('Feature 2: Material 3 Theme Generation & Default Settings', () => {
  beforeEach(() => {
    for (const key of Object.keys(setStyles)) {
      delete setStyles[key];
    }
    classes.clear();
    for (const key of Object.keys(attrs)) {
      delete attrs[key];
    }
  });

  it('should have defined theme settings in DEFAULT_GENERAL_SETTINGS with dynamic defaults', () => {
    expect(DEFAULT_GENERAL_SETTINGS).toBeDefined();
    expect(DEFAULT_GENERAL_SETTINGS.themeColor).toBeDefined();
    expect(DEFAULT_GENERAL_SETTINGS.colorThemeMode).toBe('prayer');
    expect(DEFAULT_GENERAL_SETTINGS.darkThemeMode).toBe('solar');
    expect(DEFAULT_GENERAL_SETTINGS.themeVariant).toBe('tonal_spot');
  });

  it('should generate complete Material 3 CSS variables via applyThemeFromHex in light mode', () => {
    const scheme = applyThemeFromHex('#0284C7', false, 'tonal_spot', 0.0);
    expect(scheme).toBeDefined();

    // Verify root class has no dark class
    expect(classes.has('dark')).toBe(false);

    // Verify key M3 tonal colors were injected
    expect(setStyles['--md-sys-color-primary']).toBeDefined();
    expect(setStyles['--md-sys-color-on-primary']).toBeDefined();
    expect(setStyles['--md-sys-color-surface']).toBeDefined();
    expect(setStyles['--md-sys-color-surface-container']).toBeDefined();
    expect(setStyles['--md-sys-color-surface-container-high']).toBeDefined();
    expect(setStyles['--md-sys-color-outline-variant']).toBeDefined();
    expect(setStyles['--md-sys-color-error']).toBeDefined();
    expect(setStyles['--md-sys-color-error-container']).toBeDefined();

    // Verify contrast attribute was recorded
    expect(attrs['data-contrast']).toBe('0');
  });

  it('should apply dark class and appropriate dark surface tokens in dark mode', () => {
    const scheme = applyThemeFromHex('#1E1B4B', true, 'expressive', 0.5);
    expect(scheme).toBeDefined();

    // Verify dark class was added
    expect(classes.has('dark')).toBe(true);

    // Verify contrast attribute reflects level
    expect(attrs['data-contrast']).toBe('0.5');

    // Primary should be a valid hex string
    expect(setStyles['--md-sys-color-primary']).toMatch(/^#[0-9a-f]{6}$/i);
    expect(setStyles['--md-sys-color-surface']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should handle shorthand 3-digit hex strings gracefully', () => {
    const scheme = applyThemeFromHex('#f00', false, 'vibrant', 0.0);
    expect(scheme).toBeDefined();
    expect(setStyles['--md-sys-color-primary']).toBeDefined();
  });

  it('should support various M3 theme variants', () => {
    const variants = ['tonal_spot', 'vibrant', 'expressive', 'fidelity', 'neutral', 'monochrome', 'content'] as const;
    for (const variant of variants) {
      const scheme = applyThemeFromHex('#6750A4', false, variant, 0.0);
      expect(scheme).toBeDefined();
      expect(setStyles['--md-sys-color-primary']).toBeDefined();
    }
  });
});
