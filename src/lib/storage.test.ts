import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "./storage";

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

describe("Centralized Storage Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should set and get items safely", () => {
    const success = storage.setItem("test-key", "hello");
    expect(success).toBe(true);
    expect(storage.getItem("test-key")).toBe("hello");
  });

  it("should get default empty zone", () => {
    expect(storage.getZone()).toBe("");
  });

  it("should set and retrieve selected zone", () => {
    storage.setZone("KDH01");
    expect(storage.getZone()).toBe("KDH01");
  });

  it("should maintain recent zones with duplicate filtering and cap of 5", () => {
    storage.saveRecentZone("SGR01");
    storage.saveRecentZone("JHR02");
    storage.saveRecentZone("SGR01"); // duplicate
    storage.saveRecentZone("PRK02");
    storage.saveRecentZone("PLS01");
    storage.saveRecentZone("WLY01");
    storage.saveRecentZone("TRG01"); // exceeds 5 limit

    const recent = storage.getRecentZones();
    expect(recent).toHaveLength(5);
    expect(recent[0]).toBe("TRG01"); // most recent first
    expect(recent).toContain("SGR01");
    expect(recent).not.toContain("JHR02"); // pushed out (oldest unique)
  });
});
