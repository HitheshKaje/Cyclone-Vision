export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('API_BASE_URL');
    if (stored) {
      // Auto-correct obsolete port 8000 to active backend port 8001
      if (stored.includes(':8000')) {
        const fixed = stored.replace(':8000', ':8001');
        localStorage.setItem('API_BASE_URL', fixed);
        return fixed;
      }
      return stored;
    }

    if (import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE;
    }

    // Automatically match hostname (localhost vs 127.0.0.1) so browser doesn't block cross-origin
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:8001`;
  }

  return 'http://127.0.0.1:8001';
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('API_BASE_URL', url);
};
