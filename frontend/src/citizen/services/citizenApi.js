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
 * Fetch official coastal marine warnings & advisories
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
 * Admin action: Broadcast analysis results to the Citizen dashboard
 */
export const broadcastCitizenAlert = async (alertPayload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(alertPayload)
    });
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
 * Admin action: Clear the active coastal alert & stop siren
 */
export const clearCitizenAlert = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/clear`, {
      method: 'POST'
    });
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
 * Toggle coastal lighthouse siren ON or OFF
 */
export const toggleLighthouseSiren = async (active) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/lighthouse/siren`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active })
    });
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
 * Fetch current status of the lighthouse siren
 */
export const fetchLighthouseStatus = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/lighthouse/status`);
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

