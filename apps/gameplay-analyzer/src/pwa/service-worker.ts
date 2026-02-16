/**
 * Service Worker for GameplayAnalyzer PWA
 * 
 * Handles:
 * - Offline caching
 * - Background sync for spin data
 * - Push notifications for anomaly alerts
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'gameplay-analyzer-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (handle separately)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL) as Promise<Response>;
        }
        throw new Error('Network error');
      });
    })
  );
});

// Background sync for gameplay data
// Note: Background Sync API types not in standard TS libs
self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'gameplay-sync') {
    event.waitUntil(syncGameplayData());
  }
}) as EventListener);

// SyncEvent interface (not in all TS libs)
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

async function syncGameplayData(): Promise<void> {
  console.log('[SW] Syncing gameplay data');

  try {
    // Open IndexedDB
    const db = await openDatabase();
    const unsynced = await getUnsyncedSpins(db);

    if (unsynced.length === 0) {
      console.log('[SW] No data to sync');
      return;
    }

    // Compress spins for transmission
    const compressed = unsynced
      .map((s: any) => `${s.wager}|${s.payout}|${s.timestamp}`)
      .join(';');

    // Get session info from IndexedDB
    const sessionInfo = await getSessionInfo(db);

    const response = await fetch('/api/gameplay/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionInfo.sessionId,
        userId: sessionInfo.userId,
        casinoId: sessionInfo.casinoId,
        gameId: sessionInfo.gameId,
        spins: compressed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();

    // Mark spins as synced
    await markSpinsSynced(db, unsynced.map((s: any) => s.id));

    // Notify clients
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        report: result.report,
        summary: result.summary,
      });
    }

    // Show notification if anomaly detected
    if (result.summary && result.summary.af > 0) {
      await showAnomalyNotification(result.summary);
    }

    console.log('[SW] Sync complete');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Re-throw to retry sync
  }
}

// Push notification for anomaly alerts
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  if (data.type === 'ANOMALY_ALERT') {
    event.waitUntil(
      showAnomalyNotification(data.summary)
    );
  }
});

async function showAnomalyNotification(summary: any): Promise<void> {
  const title = 'Gameplay Anomaly Detected';
  let body = '';

  // Parse anomaly flags
  if (summary.af & 1) body += '⚠️ RTP Pump detected. ';
  if (summary.af & 2) body += '🎯 Win Clustering detected. ';
  if (summary.af & 4) body += '📉 RTP Drift detected. ';

  body += `Current RTP: ${summary.rtp}%`;

  // Note: actions requires NotificationOptions from service worker context
  const options: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'anomaly-alert',
    requireInteraction: summary.sv === 2, // Require interaction for critical
    data: { summary },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  await self.registration.showNotification(title, options);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Focus existing window or open new
        for (const client of clients) {
          if (client.url.includes('/gameplay') && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow('/gameplay');
      })
    );
  }
});

// IndexedDB helpers
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GameplayAnalyzer', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getUnsyncedSpins(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['spins'], 'readonly');
    const store = transaction.objectStore('spins');
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getSessionInfo(db: IDBDatabase): Promise<any> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['session'], 'readonly');
    const store = transaction.objectStore('session');
    const request = store.get('current');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || {});
  });
}

function markSpinsSynced(db: IDBDatabase, ids: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['spins'], 'readwrite');
    const store = transaction.objectStore('spins');
    
    let completed = 0;
    for (const id of ids) {
      const request = store.get(id);
      request.onsuccess = () => {
        const spin = request.result;
        if (spin) {
          spin.synced = true;
          store.put(spin);
        }
        completed++;
        if (completed === ids.length) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    }
    
    if (ids.length === 0) resolve();
  });
}

export {};
