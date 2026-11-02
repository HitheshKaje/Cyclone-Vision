import { getApiBaseUrl } from '../../utils/apiConfig';

const API_TIMEOUT_MS = 6000;

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
 * Fetch Cyclone Information for selected coastal port
 */
export const fetchCycloneIntel = async (portId = 'malpe', lat = null, lng = null) => {
  const baseUrl = getApiBaseUrl();
  let query = `port_id=${encodeURIComponent(portId)}`;
  if (lat != null && lng != null) {
    query += `&lat=${lat}&lng=${lng}`;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/fisherman/cyclone-intel?${query}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    try {
      localStorage.setItem(`cyclosafe_cyclone_intel_${portId}`, JSON.stringify(data));
    } catch (_) {}
    return { success: true, data };
  } catch (err) {
    // Check cached fallback
    try {
      const cached = localStorage.getItem(`cyclosafe_cyclone_intel_${portId}`);
      if (cached) {
        return { success: true, data: JSON.parse(cached), fromCache: true };
      }
    } catch (_) {}
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Fetch Sea Information (8 marine parameters + Douglas Scale)
 */
export const fetchSeaConditions = async (portId = 'malpe', lat = null, lng = null) => {
  const baseUrl = getApiBaseUrl();
  let query = `port_id=${encodeURIComponent(portId)}`;
  if (lat != null && lng != null) {
    query += `&lat=${lat}&lng=${lng}`;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/fisherman/sea-conditions?${query}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    try {
      localStorage.setItem(`cyclosafe_sea_conditions_${portId}`, JSON.stringify(data));
    } catch (_) {}
    return { success: true, data };
  } catch (err) {
    try {
      const cached = localStorage.getItem(`cyclosafe_sea_conditions_${portId}`);
      if (cached) {
        return { success: true, data: JSON.parse(cached), fromCache: true };
      }
    } catch (_) {}
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};

/**
 * Fetch Weather Information & Forecasts
 */
export const fetchWeatherTelemetry = async (portId = 'malpe', lat = null, lng = null) => {
  const baseUrl = getApiBaseUrl();
  let query = `port_id=${encodeURIComponent(portId)}`;
  if (lat != null && lng != null) {
    query += `&lat=${lat}&lng=${lng}`;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/fisherman/weather-telemetry?${query}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    try {
      localStorage.setItem(`cyclosafe_weather_telemetry_${portId}`, JSON.stringify(data));
    } catch (_) {}
    return { success: true, data };
  } catch (err) {
    try {
      const cached = localStorage.getItem(`cyclosafe_weather_telemetry_${portId}`);
      if (cached) {
        return { success: true, data: JSON.parse(cached), fromCache: true };
      }
    } catch (_) {}
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
};
