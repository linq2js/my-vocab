import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupDevtools } from 'atomirx/devtools';
import App from './App.tsx';
import './index.css';

// Initialize atomirx devtools in development mode (must be before any atoms are created)
if (import.meta.env.DEV) {
  setupDevtools();
}

/**
 * Register service worker for PWA functionality
 * Only registers in production to avoid caching issues during development
 */
function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[App] ServiceWorker registered:', registration.scope);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user if needed
                  console.log('[App] New content available, refresh to update');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[App] ServiceWorker registration failed:', error);
        });
    });
  }
}

// Register service worker in production only
if (import.meta.env.PROD) {
  registerServiceWorker();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
