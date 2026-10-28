export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('API_BASE_URL');
    if (stored) {
      // Auto-migrate obsolete or zombie ports (8000, 8001) to active high-performance clean port 8005
      if (stored.includes(':8000') || stored.includes(':8001') || stored.includes('localhost')) {
        const fixed = stored
          .replace(':8000', ':8005')
          .replace(':8001', ':8005')
          .replace('localhost', '127.0.0.1');
        localStorage.setItem('API_BASE_URL', fixed);
        return fixed;
      }
      return stored;
    }

    if (import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE;
    }

    // Automatically match hostname; normalize 'localhost' to '127.0.0.1' to avoid Windows IPv6 2s DNS delay
    const rawHost = window.location.hostname || '127.0.0.1';
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    return `http://${host}:8005`;
  }

  return 'http://127.0.0.1:8005';
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('API_BASE_URL', url);
};
