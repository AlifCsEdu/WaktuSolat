class OverlayManager {
  #activeOverlays = $state<Record<string, boolean>>({
    'solat-mode': false,
    'azan-alert': false,
    'update-toast': false,
    'location-toast': false
  });

  register(key: string, isActive: boolean) {
    if (key in this.#activeOverlays) {
      this.#activeOverlays[key] = isActive;
    }
  }

  get activeOverlays() {
    return this.#activeOverlays;
  }

  get currentOverlay(): string | null {
    const priorities = [
      { key: 'solat-mode', priority: 100 },
      { key: 'azan-alert', priority: 80 },
      { key: 'update-toast', priority: 50 },
      { key: 'location-toast', priority: 30 }
    ];
    for (const item of priorities) {
      if (this.#activeOverlays[item.key]) {
        return item.key;
      }
    }
    return null;
  }

  shouldRender(key: string): boolean {
    return this.currentOverlay === key;
  }
}

export const overlayManager = new OverlayManager();
