import { describe, it, expect } from 'vitest';
import { appSettings } from '../src/state/settings.svelte';
import { mosqueState } from '../src/state/mosque.svelte';

describe('Milestone M4: Settings State and Mosque TV State', () => {
  it('should support updating general and alert settings', () => {
    appSettings.updateSettings({
      language: 'en',
      azanAlertStyle: 'dramatic',
      azanAlertDuration: 30,
      solatModeEnabled: true,
      solatModeShowClock: true,
      solatModeShowQibla: true,
      iqamahCountdownSound: 'chime',
      soundVolume: 80,
    });

    expect(appSettings.settings.language).toBe('en');
    expect(appSettings.settings.azanAlertStyle).toBe('dramatic');
    expect(appSettings.settings.azanAlertDuration).toBe(30);
    expect(appSettings.settings.solatModeEnabled).toBe(true);
    expect(appSettings.settings.solatModeShowClock).toBe(true);
    expect(appSettings.settings.solatModeShowQibla).toBe(true);
    expect(appSettings.settings.iqamahCountdownSound).toBe('chime');
    expect(appSettings.settings.soundVolume).toBe(80);
  });

  it('should support updating mosque TV display settings in appSettings', () => {
    appSettings.updateSettings({
      tvModeEnabled: true,
      mosqueName: 'Masjid Negara',
      tvModeLayout: 'split',
      mosqueLogoUrl: 'https://example.com/logo.png',
      mosqueLogoEnabled: true,
      mosqueLogoSize: 120,
      tvModeClockScale: 1.1,
      tvModeScheduleScale: 1.0,
      tvModeShowWeather: true,
      tvModeShowCountdown: true,
      tvModeShowDateBar: true,
      tvModeTickerSpeed: 'medium',
    });

    expect(appSettings.settings.tvModeEnabled).toBe(true);
    expect(appSettings.settings.mosqueName).toBe('Masjid Negara');
    expect(appSettings.settings.tvModeLayout).toBe('split');
    expect(appSettings.settings.mosqueLogoUrl).toBe('https://example.com/logo.png');
    expect(appSettings.settings.mosqueLogoEnabled).toBe(true);
    expect(appSettings.settings.mosqueLogoSize).toBe(120);
    expect(appSettings.settings.tvModeClockScale).toBe(1.1);
    expect(appSettings.settings.tvModeShowWeather).toBe(true);
  });

  it('should manage mosque state modifiers and computed state', () => {
    expect(mosqueState).toBeDefined();
    expect(mosqueState.computedState).toBeDefined();
    expect(typeof mosqueState.handleIqamahTogglePause).toBe('function');
    expect(typeof mosqueState.handleIqamahAddMinute).toBe('function');
    expect(typeof mosqueState.handleIqamahSubMinute).toBe('function');
  });
});
