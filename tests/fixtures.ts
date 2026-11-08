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

        let _locationState: any;
        Object.defineProperty(window, 'locationState', {
          configurable: true,
          get: () => _locationState,
          set: (instance) => {
            _locationState = instance;
            if (instance && typeof instance === 'object') {
              const proto = Object.getPrototypeOf(instance);
              const desc = Object.getOwnPropertyDescriptor(proto, 'promptZone') || Object.getOwnPropertyDescriptor(instance, 'promptZone');
              if (desc && desc.set) {
                const originalSet = desc.set;
                const newDesc = {
                  ...desc,
                  set: function(this: any, val: any) {
                    if (val) {
                      this.autoUpdatedZone = null;
                    }
                    return originalSet.call(this, val);
                  }
                };
                try {
                  Object.defineProperty(proto, 'promptZone', newDesc);
                } catch (e) {
                  try {
                    Object.defineProperty(instance, 'promptZone', newDesc);
                  } catch (e2) {}
                }
              }
            }
          }
        });
      }
    });
    await use(page);
    try {
      await page.evaluate(() => {
        if (typeof document !== 'undefined' && 'getAnimations' in document) {
          document.getAnimations().forEach((anim) => anim.cancel());
        }
      }).catch(() => {});
    } catch (e) {}
  },
  makeOffline: async ({ context, page }, use) => {
    await use(async () => {
      if (page.url() === 'about:blank') {
        await page.goto('/');
        await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('load'));
      }
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
    try {
      await context.setOffline(false);
      await page.evaluate(() => {
        try {
          sessionStorage.removeItem('__playwright_offline__');
          window.dispatchEvent(new Event('online'));
        } catch (e) {}
      }).catch(() => {});
      await page.unroute('**/api/solat/**').catch(() => {});
    } catch (e) {}
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
        await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('load'));
      }
      return await page.evaluate(async ({ store, k }) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('[readIndexedDB] Operation timed out after 5000ms'));
          }, 5000);

          let db: IDBDatabase | null = null;
          let settled = false;

          const cleanupAndSettle = (action: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (db) {
              try {
                db.close();
              } catch (e) {}
            }
            action();
          };

          const req = indexedDB.open('waktu-solat-db', 2);
          req.onblocked = () => {
            console.warn('[readIndexedDB] IDB open blocked');
          };
          req.onupgradeneeded = () => {
            const upDb = req.result;
            if (!upDb.objectStoreNames.contains('assets')) {
              upDb.createObjectStore('assets');
            }
            if (!upDb.objectStoreNames.contains('prayer-times')) {
              upDb.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => {
            cleanupAndSettle(() => reject(req.error));
          };
          req.onsuccess = () => {
            db = req.result;
            db.onversionchange = () => {
              if (db) {
                try {
                  db.close();
                } catch (e) {}
              }
            };

            try {
              if (!db.objectStoreNames.contains(store)) {
                cleanupAndSettle(() => resolve(null));
                return;
              }
              const tx = db.transaction(store, 'readonly');
              const s = tx.objectStore(store);
              const r = s.get(k);
              let val: any = null;

              r.onsuccess = () => {
                val = r.result === undefined ? null : r.result;
              };
              r.onerror = () => {
                cleanupAndSettle(() => reject(r.error));
              };
              tx.oncomplete = () => {
                cleanupAndSettle(() => resolve(val));
              };
              tx.onerror = () => {
                cleanupAndSettle(() => reject(tx.error));
              };
              tx.onabort = () => {
                cleanupAndSettle(() => reject(tx.error || new Error('Transaction aborted')));
              };
            } catch (e) {
              cleanupAndSettle(() => reject(e));
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
        await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('load'));
      }
      await page.evaluate(async ({ store, k, v }) => {
        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('[writeIndexedDB] Operation timed out after 5000ms'));
          }, 5000);

          let db: IDBDatabase | null = null;
          let settled = false;

          const cleanupAndSettle = (action: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (db) {
              try {
                db.close();
              } catch (e) {}
            }
            action();
          };

          const req = indexedDB.open('waktu-solat-db', 2);
          req.onblocked = () => {
            console.warn('[writeIndexedDB] IDB open blocked');
          };
          req.onupgradeneeded = () => {
            const upDb = req.result;
            if (!upDb.objectStoreNames.contains('assets')) {
              upDb.createObjectStore('assets');
            }
            if (!upDb.objectStoreNames.contains('prayer-times')) {
              upDb.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => {
            cleanupAndSettle(() => reject(req.error));
          };
          req.onsuccess = () => {
            db = req.result;
            db.onversionchange = () => {
              if (db) {
                try {
                  db.close();
                } catch (e) {}
              }
            };

            try {
              const tx = db.transaction(store, 'readwrite');
              const s = tx.objectStore(store);
              s.put(v, k);

              tx.oncomplete = () => {
                cleanupAndSettle(() => resolve());
              };
              tx.onerror = () => {
                cleanupAndSettle(() => reject(tx.error));
              };
              tx.onabort = () => {
                cleanupAndSettle(() => reject(tx.error || new Error('Transaction aborted')));
              };
            } catch (e) {
              cleanupAndSettle(() => reject(e));
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
        await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('load'));
      }
      await page.evaluate(async () => {
        return new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('[clearIndexedDB] Operation timed out after 5000ms'));
          }, 5000);

          let db: IDBDatabase | null = null;
          let settled = false;

          const cleanupAndSettle = (action: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (db) {
              try {
                db.close();
              } catch (e) {}
            }
            action();
          };

          const req = indexedDB.open('waktu-solat-db', 2);
          req.onblocked = () => {
            console.warn('[clearIndexedDB] IDB open blocked');
          };
          req.onupgradeneeded = () => {
            const upDb = req.result;
            if (!upDb.objectStoreNames.contains('assets')) {
              upDb.createObjectStore('assets');
            }
            if (!upDb.objectStoreNames.contains('prayer-times')) {
              upDb.createObjectStore('prayer-times');
            }
          };
          req.onerror = () => {
            cleanupAndSettle(() => reject(req.error));
          };
          req.onsuccess = () => {
            db = req.result;
            db.onversionchange = () => {
              if (db) {
                try {
                  db.close();
                } catch (e) {}
              }
            };

            if (db.objectStoreNames.length === 0) {
              cleanupAndSettle(() => resolve());
              return;
            }

            try {
              const tx = db.transaction(db.objectStoreNames, 'readwrite');
              for (const store of db.objectStoreNames) {
                tx.objectStore(store).clear();
              }

              tx.oncomplete = () => {
                cleanupAndSettle(() => resolve());
              };
              tx.onerror = () => {
                cleanupAndSettle(() => reject(tx.error));
              };
              tx.onabort = () => {
                cleanupAndSettle(() => reject(tx.error || new Error('Transaction aborted')));
              };
            } catch (e) {
              cleanupAndSettle(() => reject(e));
            }
          };
        });
      });
    });
  }
});

export { expect };
