import { describe, it, expect, beforeEach } from "vitest";
import { StorageManager } from "../src/lib/StorageManager";

// Mock global localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("StorageManager Centralized Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should set and get items safely", () => {
    const success = StorageManager.setItem("test-key", "hello");
    expect(success).toBe(true);
    expect(StorageManager.getItem("test-key")).toBe("hello");
  });

  it("should get default empty zone", () => {
    expect(StorageManager.getZone()).toBe("");
  });

  it("should set and retrieve selected zone", () => {
    StorageManager.setZone("KDH01");
    expect(StorageManager.getZone()).toBe("KDH01");
  });

  it("should maintain recent zones with duplicate filtering and cap of 5", () => {
    StorageManager.saveRecentZone("SGR01");
    StorageManager.saveRecentZone("JHR02");
    StorageManager.saveRecentZone("SGR01"); // duplicate
    StorageManager.saveRecentZone("PRK02");
    StorageManager.saveRecentZone("PLS01");
    StorageManager.saveRecentZone("WLY01");
    StorageManager.saveRecentZone("TRG01"); // exceeds 5 limit

    const recent = StorageManager.getRecentZones();
    expect(recent).toHaveLength(5);
    expect(recent[0]).toBe("TRG01"); // most recent first
    expect(recent).toContain("SGR01");
    expect(recent).not.toContain("JHR02"); // pushed out
  });

  it("should manage onboarding completion status", () => {
    expect(StorageManager.getHasCompletedOnboarding()).toBe(false);
    StorageManager.setHasCompletedOnboarding(true);
    expect(StorageManager.getHasCompletedOnboarding()).toBe(true);
  });

  it("should manage visual style and theme shapes", () => {
    expect(StorageManager.getVisualStyle()).toBeNull();
    StorageManager.setVisualStyle("glass");
    expect(StorageManager.getVisualStyle()).toBe("glass");

    expect(StorageManager.getThemeShape()).toBeNull();
    StorageManager.setThemeShape("pill");
    expect(StorageManager.getThemeShape()).toBe("pill");
  });
});
