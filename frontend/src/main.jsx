import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './citizen/i18n/config';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

