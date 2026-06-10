import { test as base, expect } from '@playwright/test';

type OfflineFixture = {
  makeOffline: () => Promise<void>;
  makeOnline: () => Promise<void>;
  readIndexedDB: (storeName: string, key: string) => Promise<any>;
  writeIndexedDB: (storeName: string, key: string, val: any) => Promise<void>;
  clearIndexedDB: () => Promise<void>;
};

export const test = base.extend<OfflineFixture>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (typeof window !== 'undefined') {
        const mockNotification = function(title: string, options: any) {
          return { close: () => {} };
        };
        mockNotification.requestPermission = async () => 'granted';
        Object.defineProperty(mockNotification, 'permission', {
          get: () => 'granted',
          configurable: true
        });

        if (!window.Notification) {
          (window as any).Notification = mockNotification;
        } else {
          Object.defineProperty(window.Notification, 'permission', {
            get: () => 'granted',
            configurable: true
          });
          window.Notification.requestPermission = async () => 'granted';
        }

        if (!window.location.host || window.location.href === 'about:blank') {
          const mockStorage: Record<string, string> = {};
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: (key: string) => mockStorage[key] || null,
              setItem: (key: string, val: string) => { mockStorage[key] = val; },
              removeItem: (key: string) => { delete mockStorage[key]; },
              clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
              key: (index: number) => Object.keys(mockStorage)[index] || null,
              get length() { return Object.keys(mockStorage).length; }
            },
            configurable: true
          });
        }

        Object.defineProperty(navigator, 'onLine', {
          get: () => {
            try {
              return sessionStorage.getItem('__playwright_offline__') !== 'true';
            } catch (e) {
              return true;
            }
          },
          configurable: true
        });
      }
    });
    await use(page);
  },
  makeOffline: async ({ context, page }, use) => {
    await use(async () => {
      await context.setOffline(true);
      await page.evaluate(() => {
        try {
          sessionStorage.setItem('__playwright_offline__', 'true');
          window.dispatchEvent(new Event('offline'));
        } catch (e) {}
      });
      await page.route('**/api/solat/**', async (route) => {
        await route.abort('failed');
      });
    });
  },
  makeOnline: async ({ context, page }, use) => {
    await use(async () => {
      await context.setOffline(false);
      await page.evaluate(() => {
        try {
          sessionStorage.removeItem('__playwright_offline__');
          window.dispatchEvent(new Event('online'));
        } catch (e) {}
      });
      await page.unroute('**/api/solat/**').catch(() => {});
    });
  },
  readIndexedDB: async ({ page }, use) => {
    await use(async (storeName: string, key: string) => {
      if (page.url() === 'about:blank') {
        await page.goto('/');
        await page.waitForLoadState('load');
        try {
          await page.evaluate(async () => {
            if (!navigator.serviceWorker) return;
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
              await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
              });
            }
          });
        } catch (e) {}
        await page.waitForLoadState('load');
      }
      return await page.evaluate(async ({ store, k }) => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('waktu-solat-db', 2);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('assets')) {
              db.createObjectStore('assets');
            }
            if (!db.objectStoreNames.contains('prayer-times')) {
              db.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            try {
              const tx = db.transaction(store, 'readonly');
              const s = tx.objectStore(store);
              const r = s.get(k);
              r.onsuccess = () => resolve(r.result === undefined ? null : r.result);
              r.onerror = () => reject(r.error);
            } catch (e) {
              reject(e);
            }
          };
        });
      }, { store: storeName, k: key });
    });
  },
  writeIndexedDB: async ({ page }, use) => {
    await use(async (storeName: string, key: string, val: any) => {
      if (page.url() === 'about:blank') {
        await page.goto('/');
        await page.waitForLoadState('load');
        try {
          await page.evaluate(async () => {
            if (!navigator.serviceWorker) return;
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
              await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
              });
            }
          });
        } catch (e) {}
        await page.waitForLoadState('load');
      }
      await page.evaluate(async ({ store, k, v }) => {
        return new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('waktu-solat-db', 2);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('assets')) {
              db.createObjectStore('assets');
            }
            if (!db.objectStoreNames.contains('prayer-times')) {
              db.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            try {
              const tx = db.transaction(store, 'readwrite');
              const s = tx.objectStore(store);
              const r = s.put(v, k);
              r.onsuccess = () => resolve();
              r.onerror = () => reject(r.error);
            } catch (e) {
              reject(e);
            }
          };
        });
      }, { store: storeName, k: key, v: val });
    });
  },
  clearIndexedDB: async ({ page }, use) => {
    await use(async () => {
      if (page.url() === 'about:blank') {
        await page.goto('/');
        await page.waitForLoadState('load');
        try {
          await page.evaluate(async () => {
            if (!navigator.serviceWorker) return;
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
              await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
              });
            }
          });
        } catch (e) {}
        await page.waitForLoadState('load');
      }
      await page.evaluate(async () => {
        return new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('waktu-solat-db', 2);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('assets')) {
              db.createObjectStore('assets');
            }
            if (!db.objectStoreNames.contains('prayer-times')) {
              db.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            try {
              const tx = db.transaction(db.objectStoreNames, 'readwrite');
              for (const store of db.objectStoreNames) {
                tx.objectStore(store).clear();
              }
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            } catch (e) {
              reject(e);
            }
          };
        });
      });
    });
  }
});

export { expect };
