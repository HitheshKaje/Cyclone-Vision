import { getApiBaseUrl } from './apiConfig';

/**
 * Fetches real-time aggregated stats directly from MongoDB cyclosafe.analyses.
 * Powers the 4 Stat Cards on the HomePage.
 */
export const fetchAnalysisStats = async () => {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/analysis/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[Analysis API] fetchAnalysisStats error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Fetches all historical satellite analysis records directly from MongoDB.
 */
export const fetchAnalysisHistory = async (limit = 200) => {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/analysis/history?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch history: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, records: data.records || [] };
  } catch (err) {
    console.warn('[Analysis API] fetchAnalysisHistory error:', err);
    return { success: false, records: [] };
  }
};

/**
 * Persists a new analysis scan record directly into MongoDB.
 */
export const saveAnalysisRecord = async (record) => {
  try {
    const apiBase = getApiBaseUrl();
    // Clone and sanitize record before sending
    const payload = {
      id: record.id || Date.now().toString(),
      fileName: record.fileName || 'satellite_scan.jpg',
      imagePreview: typeof record.imagePreview === 'string' && record.imagePreview.length < 300000 
        ? record.imagePreview 
        : null,
      detection: record.detection || null,
      intensity: record.intensity || null,
      classification: record.classification || null,
      latitude: record.latitude != null ? parseFloat(record.latitude) : null,
      longitude: record.longitude != null ? parseFloat(record.longitude) : null,
      subbasin: record.subbasin || null,
      hasRadiusLines: Boolean(record.hasRadiusLines),
      coordMethod: record.coordMethod || null,
      coordConfidence: record.coordConfidence != null ? parseFloat(record.coordConfidence) : null,
      timestamp: record.timestamp || new Date().toLocaleString()
    };

    const res = await fetch(`${apiBase}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to save record to MongoDB: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, record: data.record };
  } catch (err) {
    console.warn('[Analysis API] saveAnalysisRecord error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Deletes an analysis scan record directly from MongoDB by ID.
 */
export const deleteAnalysisRecord = async (scanId) => {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/analysis/${scanId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete record: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[Analysis API] deleteAnalysisRecord error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Clears all analysis records directly from MongoDB.
 */
export const clearAllAnalysisRecords = async () => {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/analysis`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to clear records: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[Analysis API] clearAllAnalysisRecords error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Re-seeds MongoDB with baseline verified satellite observations.
 */
export const resetSeedAnalyses = async () => {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/analysis/reset-seed`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to reset seed: HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[Analysis API] resetSeedAnalyses error:', err);
    return { success: false, error: err.message };
  }
};
