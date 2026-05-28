import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS } from "./types";
import { translations, LangKey } from "./translations";
import { StorageManager } from "./lib/StorageManager";

interface AppContextType {
  settings: GeneralSettings;
  updateSettings: (newSettings: Partial<GeneralSettings>) => void;
  t: (key: LangKey, params?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GeneralSettings>(() => {
    return StorageManager.getSettings();
  });

  useEffect(() => {
    StorageManager.setSettings(settings);
  }, [settings]);

  const updateSettings = (updates: Partial<GeneralSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const t = (key: LangKey, params?: Record<string, string | number>) => {
    let str = translations[settings.language]?.[key] || key;
    if (params && typeof str === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
