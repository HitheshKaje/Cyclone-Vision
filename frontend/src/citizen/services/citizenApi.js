import { getApiBaseUrl } from '../../utils/apiConfig';

const API_TIMEOUT_MS = 6000;

/**
 * Helper to execute fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Fetch live cyclone data from backend
 */
export const fetchLiveCyclones = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/cyclones/live`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Fetch verified historical cyclones from backend
 */
export const fetchHistoricalCyclones = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/cyclones/history`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Fetch official coastal marine warnings & advisories / lighthouse status
 */
export const fetchOfficialAdvisories = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/alerts`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Publish detected cyclone analysis to Citizen & Lighthouse portals
 */
export const publishCitizenBroadcast = async (payload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Toggle coastal lighthouse acoustic siren and flashing beacon ON/OFF
 */
export const toggleLighthouseSiren = async (sirenActive) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/broadcast/siren`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siren_active: sirenActive })
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Clear coastal alert and restore normal status
 */
export const clearCitizenBroadcast = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/broadcast/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

