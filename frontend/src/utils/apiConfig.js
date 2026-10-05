export const getApiBaseUrl = () => {
  return localStorage.getItem('API_BASE_URL') || import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('API_BASE_URL', url);
};
