import { getApiBaseUrl } from './apiConfig';

const API_TIMEOUT_MS = 6000;

const fetchWithTimeout = async (url, options = {}) => {
  const candidates = [url];

  if (url.includes(':8005')) {
    candidates.push(url.replace(':8005', ':8001'));
  }
  if (url.includes(':8000')) {
    candidates.push(url.replace(':8000', ':8001'));
  }
  if (!candidates.some(c => c.includes(':8001'))) {
    try {
      const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8001');
      candidates.push(`http://127.0.0.1:8001${parsed.pathname}${parsed.search}`);
    } catch (_) {}
  }
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(url, window.location.origin);
      const originUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      if (!candidates.includes(originUrl)) {
        candidates.push(originUrl);
      }
    } catch (_) {}
  }

  let lastError = null;
  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(candidate, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      // Auto-heal localStorage
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('API_BASE_URL', 'http://127.0.0.1:8001'); } catch (_) {}
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
    }
  }

  throw lastError || new Error('Network error connecting to backend.');
};

/**
 * Perform login for Admin or User with either Mobile or Email
 */
export const loginUser = async ({ loginType, identifier, password, roleTarget = 'user' }) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_type: loginType,
        identifier: identifier.trim(),
        password: password,
        role_target: roleTarget
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Login failed. Please check your credentials.'
      };
    }

    if (roleTarget === 'admin') {
      localStorage.setItem('cyclosafe_admin_token', data.token);
      localStorage.setItem('cyclosafe_admin_user', JSON.stringify(data.user));
    } else {
      localStorage.setItem('cyclosafe_user_token', data.token);
      localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(data.user));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cyclosafe_user_registered', { detail: data.user }));
      }
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
      message: data.message
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out. Please check backend server.' : (err.message || 'Network error.')
    };
  }
};

/**
 * Register a new Citizen or Fisherman user into MongoDB
 */
export const registerUser = async (payload, { autoLogin = false } = {}) => {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Registration failed. Please check form details.'
      };
    }

    if (autoLogin) {
      localStorage.setItem('cyclosafe_user_token', data.token);
      localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(data.user));
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cyclosafe_user_registered', { detail: data.user }));
      }
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
      message: data.message
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Connection timed out. Please check backend server.' : (err.message || 'Network error.')
    };
  }
};

/**
 * Check if Admin is currently authenticated
 */
export const getAdminAuth = () => {
  try {
    const userStr = localStorage.getItem('cyclosafe_admin_user');
    const token = localStorage.getItem('cyclosafe_admin_token');
    if (userStr && token) {
      return JSON.parse(userStr);
    }
  } catch (_) {}
  return null;
};

/**
 * Logout Admin
 */
export const logoutAdmin = () => {
  localStorage.removeItem('cyclosafe_admin_user');
  localStorage.removeItem('cyclosafe_admin_token');
};

/**
 * Check if Citizen / User is currently authenticated
 */
export const getUserAuth = () => {
  try {
    const userStr = localStorage.getItem('cyclosafe_current_citizen_user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch (_) {}
  return null;
};

/**
 * Logout Citizen / User
 */
export const logoutUser = () => {
  localStorage.removeItem('cyclosafe_current_citizen_user');
  localStorage.removeItem('cyclosafe_user_token');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cyclosafe_user_logged_out'));
  }
};
