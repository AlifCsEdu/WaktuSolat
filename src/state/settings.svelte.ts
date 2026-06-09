import { StorageManager } from "../lib/StorageManager";
import { GeneralSettings } from "../types";
import { translations, LangKey } from "../translations";

class AppSettings {
  settings = $state<GeneralSettings>(StorageManager.getSettings());

  updateSettings(updates: Partial<GeneralSettings>) {
    this.settings = { ...this.settings, ...updates };
    StorageManager.setSettings(this.settings);
  }

  t(key: LangKey, params?: Record<string, string | number>): string {
    let str = (translations as any)[this.settings.language as any]?.[key as any] || key;
    if (params && typeof str === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return str as string;
  }
}

export const appSettings = new AppSettings();
