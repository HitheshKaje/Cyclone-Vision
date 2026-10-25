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

/**
 * Fetch all registered fishermen and citizens from backend
 */
export const fetchRegisteredUsers = async (userType = null) => {
  const baseUrl = getApiBaseUrl();
  try {
    const url = userType 
      ? `${baseUrl}/api/citizen/users?user_type=${userType}`
      : `${baseUrl}/api/citizen/users`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    if (data.users && Array.isArray(data.users)) {
      try {
        localStorage.setItem('cyclosafe_registered_users', JSON.stringify(data.users));
      } catch (_) {}
    }
    return { success: true, data: data.users || [] };
  } catch (err) {
    // Fallback to localStorage if backend is offline
    try {
      const stored = localStorage.getItem('cyclosafe_registered_users');
      if (stored) {
        let users = JSON.parse(stored);
        if (userType) users = users.filter(u => u.user_type === userType);
        return { success: true, data: users };
      }
    } catch (_) {}
    return { success: false, error: err.message, data: [] };
  }
};

/**
 * Register or login a user (Fisherman or Citizen)
 */
export const registerCitizenUser = async (payload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    
    // Sync into localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('cyclosafe_registered_users') || '[]');
      const filtered = stored.filter(u => u.phone !== data.user.phone);
      localStorage.setItem('cyclosafe_registered_users', JSON.stringify([data.user, ...filtered]));
      localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(data.user));
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cyclosafe_user_registered', { detail: data.user }));
    }

    return { success: true, data: data.user };
  } catch (err) {
    // Offline local registration fallback
    const localUser = {
      id: `USR-${payload.user_type === 'fisherman' ? 'F' : 'C'}-${Date.now().toString().slice(-4)}`,
      ...payload,
      status: payload.user_type === 'fisherman' ? 'IN_HARBOR' : 'ACTIVE',
      registered_at: new Date().toISOString()
    };
    try {
      const stored = JSON.parse(localStorage.getItem('cyclosafe_registered_users') || '[]');
      localStorage.setItem('cyclosafe_registered_users', JSON.stringify([localUser, ...stored]));
      localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(localUser));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cyclosafe_user_registered', { detail: localUser }));
      }
    } catch (_) {}
    return { success: true, data: localUser, isOffline: true };
  }
};

/**
 * Delete a user by ID
 */
export const deleteRegisteredUser = async (userId) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/users/${userId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    try {
      const stored = JSON.parse(localStorage.getItem('cyclosafe_registered_users') || '[]');
      localStorage.setItem('cyclosafe_registered_users', JSON.stringify(stored.filter(u => u.id !== userId)));
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cyclosafe_user_deleted', { detail: userId }));
    }
    return { success: true };
  } catch (err) {
    try {
      const stored = JSON.parse(localStorage.getItem('cyclosafe_registered_users') || '[]');
      localStorage.setItem('cyclosafe_registered_users', JSON.stringify(stored.filter(u => u.id !== userId)));
    } catch (_) {}
    return { success: true };
  }
};

/**
 * Update a user status (e.g. AT_SEA <-> IN_HARBOR)
 */
export const updateUserStatus = async (userId, statusPayload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/citizen/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Clear all registered users from backend and localStorage
 */
export const clearAllRegisteredUsers = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    await fetchWithTimeout(`${baseUrl}/api/citizen/users/clear`, { method: 'POST' });
  } catch (_) {}
  try {
    localStorage.removeItem('cyclosafe_registered_users');
    localStorage.removeItem('cyclosafe_current_citizen_user');
  } catch (_) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cyclosafe_users_cleared'));
  }
  return { success: true };
};

