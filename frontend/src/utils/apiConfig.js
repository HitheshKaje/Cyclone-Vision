export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('API_BASE_URL');
    if (stored) {
      // If stored points to obsolete port 8000, 8005, or anything other than 8001, purge it
      if (stored.includes(':8000') || stored.includes(':8005') || !stored.includes(':8001')) {
        localStorage.removeItem('API_BASE_URL');
      } else {
        return stored.replace('localhost', '127.0.0.1');
      }
    }

    if (import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE;
    }

    // Automatically match hostname; normalize 'localhost' to '127.0.0.1' to avoid Windows IPv6 2s DNS delay
    const rawHost = window.location.hostname || '127.0.0.1';
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    return `http://${host}:8001`;
  }

  return 'http://127.0.0.1:8001';
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('API_BASE_URL', url);
};

