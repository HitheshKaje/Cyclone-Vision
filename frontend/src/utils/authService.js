import { getApiBaseUrl } from './apiConfig';

const API_TIMEOUT_MS = 8000;

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
export const registerUser = async (payload) => {
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

    localStorage.setItem('cyclosafe_user_token', data.token);
    localStorage.setItem('cyclosafe_current_citizen_user', JSON.stringify(data.user));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cyclosafe_user_registered', { detail: data.user }));
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
