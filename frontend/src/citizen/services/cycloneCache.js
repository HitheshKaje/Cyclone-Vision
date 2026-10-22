/**
 * CycloSafe IndexedDB Cache Service
 * Provides offline-first persistence for:
 * 1. Live/Last-known cyclone records
 * 2. Official safety advisories & warnings
 * 3. Historical cyclone records
 * 4. Emergency contacts & shelter directories
 */

const DB_NAME = 'cyclosafe_citizen_db';
const DB_VERSION = 1;
const STORES = {
  CYCLONES: 'cached_cyclones',
  ADVISORIES: 'cached_advisories',
  HISTORY: 'cached_history',
  EMERGENCY: 'cached_emergency'
};

// Configurable Freshness Thresholds (in milliseconds)
export const FRESHNESS_THRESHOLDS = {
  LIVE_WINDOW_MS: 30 * 60 * 1000,       // Under 30 mins: Live
  LAST_KNOWN_MAX_MS: 6 * 60 * 60 * 1000, // 30m to 6h: Last Known
  // Beyond 6 hours: Stale
};

export const DATA_FRESHNESS = {
  LIVE: 'LIVE',
  LAST_KNOWN: 'LAST_KNOWN',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE'
};

/**
 * Open or create the IndexedDB database
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for live / latest cyclones
      if (!db.objectStoreNames.contains(STORES.CYCLONES)) {
        db.createObjectStore(STORES.CYCLONES, { keyPath: 'id' });
      }

      // Store for official advisories & alerts
      if (!db.objectStoreNames.contains(STORES.ADVISORIES)) {
        db.createObjectStore(STORES.ADVISORIES, { keyPath: 'id' });
      }

      // Store for historical cyclone tracks
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
      }

      // Store for emergency contacts & shelter info
      if (!db.objectStoreNames.contains(STORES.EMERGENCY)) {
        db.createObjectStore(STORES.EMERGENCY, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save cyclones to IndexedDB
 */
export const cacheCyclones = async (cyclonesData) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CYCLONES, 'readwrite');
    const store = tx.objectStore(STORES.CYCLONES);

    const cacheTimestamp = new Date().toISOString();

    const recordToStore = {
      id: 'latest_active_feed',
      updated_at: cyclonesData.updated_at || cacheTimestamp,
      source: cyclonesData.source || 'GDACS',
      status: cyclonesData.status || 'connected',
      cyclones: (cyclonesData.cyclones || []).map(c => ({
        id: c.id,
        name: c.name,
        latitude: c.latitude,
        longitude: c.longitude,
        wind_speed: c.wind_speed,
        pressure: c.pressure,
        status: c.status,
        description: c.description,
        last_updated: c.last_updated,
        source: cyclonesData.source || 'GDACS',
        record_type: 'observation',
        cached_at: cacheTimestamp
      })),
      cached_at: cacheTimestamp
    };

    store.put(recordToStore);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(recordToStore);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[cycloneCache] Error writing to IndexedDB:', err);
    return null;
  }
};

/**
 * Retrieve cached cyclones from IndexedDB
 */
export const getCachedCyclones = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CYCLONES, 'readonly');
    const store = tx.objectStore(STORES.CYCLONES);
    const request = store.get('latest_active_feed');

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[cycloneCache] Error reading from IndexedDB:', err);
    return null;
  }
};

/**
 * Cache historical cyclone records
 */
export const cacheHistoricalCyclones = async (historyList) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.HISTORY);

    const record = {
      id: 'historical_catalog',
      records: historyList,
      cached_at: new Date().toISOString()
    };
    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[cycloneCache] Error caching historical cyclones:', err);
    return null;
  }
};

/**
 * Retrieve cached historical cyclone records
 */
export const getCachedHistoricalCyclones = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.HISTORY, 'readonly');
    const store = tx.objectStore(STORES.HISTORY);
    const request = store.get('historical_catalog');

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.records || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[cycloneCache] Error reading history cache:', err);
    return null;
  }
};

/**
 * Calculate Freshness State of a record
 * @param {string|Date} observationOrCacheTime 
 * @param {boolean} isOnlineAndLiveSuccess 
 */
export const evaluateFreshness = (observationOrCacheTime, isOnlineAndLiveSuccess = false) => {
  if (!observationOrCacheTime) {
    return {
      status: DATA_FRESHNESS.UNAVAILABLE,
      label: 'Unavailable',
      ageMinutes: null,
      message: 'No cyclone observation records available.'
    };
  }

  const recordTime = new Date(observationOrCacheTime).getTime();
  if (isNaN(recordTime)) {
    return {
      status: DATA_FRESHNESS.UNAVAILABLE,
      label: 'Unavailable',
      ageMinutes: null,
      message: 'Timestamp invalid.'
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - recordTime);
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (isOnlineAndLiveSuccess && diffMs <= FRESHNESS_THRESHOLDS.LIVE_WINDOW_MS) {
    return {
      status: DATA_FRESHNESS.LIVE,
      label: 'Live',
      ageMinutes: diffMinutes,
      message: `Updated ${diffMinutes === 0 ? 'just now' : `${diffMinutes}m ago`}.`
    };
  }

  if (diffMs <= FRESHNESS_THRESHOLDS.LAST_KNOWN_MAX_MS) {
    return {
      status: DATA_FRESHNESS.LAST_KNOWN,
      label: 'Last Known',
      ageMinutes: diffMinutes,
      message: `Showing last known data from ${diffMinutes}m ago.`
    };
  }

  return {
    status: DATA_FRESHNESS.STALE,
    label: 'Stale',
    ageMinutes: diffMinutes,
    message: `Data is over ${Math.round(diffMinutes / 60)}h old. Conditions may have changed.`
  };
};
