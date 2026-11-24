import { getApiBaseUrl } from './apiConfig';

/**
 * Fetch current AI & Model settings from backend / MongoDB
 */
export const fetchAiSettings = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/ai-models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to load AI settings (HTTP ${res.status})`);
    }
    const data = await res.json();
    return { success: true, settings: data.settings };
  } catch (err) {
    console.warn('[AI Settings API] fetchAiSettings error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Persist updated AI & Model settings to MongoDB
 */
export const updateAiSettings = async (payload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/ai-models`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Failed to save AI settings.' };
    }
    if (data.settings && typeof window !== 'undefined') {
      try { localStorage.setItem('cyclosafe_ai_settings', JSON.stringify(data.settings)); } catch (_) {}
      window.dispatchEvent(new CustomEvent('cyclosafe_ai_settings_updated', { detail: data.settings }));
    }
    return { success: true, message: data.message, settings: data.settings };
  } catch (err) {
    console.warn('[AI Settings API] updateAiSettings error:', err);
    return { success: false, error: err.message || 'Network error updating settings.' };
  }
};

/**
 * Fetch Map settings from MongoDB
 */
export const fetchMapSettings = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/map`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.settings && typeof window !== 'undefined') {
      try { localStorage.setItem('cyclosafe_map_settings', JSON.stringify(data.settings)); } catch (_) {}
    }
    return { success: true, settings: data.settings };
  } catch (err) {
    console.warn('[Settings API] fetchMapSettings error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Persist updated Map settings to MongoDB
 */
export const updateMapSettings = async (payload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/map`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Failed to save map settings.' };
    }
    if (data.settings && typeof window !== 'undefined') {
      try { localStorage.setItem('cyclosafe_map_settings', JSON.stringify(data.settings)); } catch (_) {}
      window.dispatchEvent(new CustomEvent('cyclosafe_map_settings_updated', { detail: data.settings }));
    }
    return { success: true, message: data.message, settings: data.settings };
  } catch (err) {
    console.warn('[Settings API] updateMapSettings error:', err);
    return { success: false, error: err.message || 'Network error updating map settings.' };
  }
};

/**
 * Fetch Notification settings from MongoDB
 */
export const fetchNotificationSettings = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/notifications`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.settings && typeof window !== 'undefined') {
      try { localStorage.setItem('cyclosafe_notification_settings', JSON.stringify(data.settings)); } catch (_) {}
    }
    return { success: true, settings: data.settings };
  } catch (err) {
    console.warn('[Settings API] fetchNotificationSettings error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Persist updated Notification settings to MongoDB
 */
export const updateNotificationSettings = async (payload) => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Failed to save notification settings.' };
    }
    if (data.settings && typeof window !== 'undefined') {
      try { localStorage.setItem('cyclosafe_notification_settings', JSON.stringify(data.settings)); } catch (_) {}
      window.dispatchEvent(new CustomEvent('cyclosafe_notification_settings_updated', { detail: data.settings }));
    }
    return { success: true, message: data.message, settings: data.settings };
  } catch (err) {
    console.warn('[Settings API] updateNotificationSettings error:', err);
    return { success: false, error: err.message || 'Network error updating notification settings.' };
  }
};

/**
 * Test Google Gemini Vision API connectivity and measure roundtrip latency
 */
export const testGeminiKey = async ({ apiKey, model } = {}) => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/ai-models/test-gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, model })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.detail || 'Test request failed.' };
    }
    return data;
  } catch (err) {
    console.warn('[AI Settings API] testGeminiKey error:', err);
    return { success: false, message: err.message || 'Connection test failed.' };
  }
};

/**
 * Reset AI & Model settings to optimal factory defaults
 */
export const resetAiSettings = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings/ai-models/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Failed to reset settings.' };
    }
    return { success: true, message: data.message, settings: data.settings };
  } catch (err) {
    console.warn('[AI Settings API] resetAiSettings error:', err);
    return { success: false, error: err.message };
  }
};
