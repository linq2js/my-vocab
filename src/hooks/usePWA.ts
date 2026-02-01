/**
 * PWA Hook for managing installation and update prompts.
 *
 * Handles:
 * - Add to Home Screen (A2HS) installation prompt
 * - Service worker update detection and activation
 *
 * @example
 * ```tsx
 * const { canInstall, promptInstall, hasUpdate, applyUpdate } = usePWA();
 *
 * {canInstall && <button onClick={promptInstall}>Install App</button>}
 * {hasUpdate && <button onClick={applyUpdate}>Update Available</button>}
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Extended BeforeInstallPromptEvent interface
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA state and actions
 */
export interface UsePWAResult {
  /** Whether the app can be installed (install prompt is available) */
  canInstall: boolean;
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>;
  /** Whether a new version is available */
  hasUpdate: boolean;
  /** Apply the update (reload with new service worker) */
  applyUpdate: () => void;
  /** Dismiss the update notification */
  dismissUpdate: () => void;
  /** Dismiss the install prompt */
  dismissInstall: () => void;
  /** Whether the app is already installed */
  isInstalled: boolean;
}

// Global state to persist across hook instances
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let waitingServiceWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

/**
 * Notify all hook instances of state change
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Initialize PWA event listeners (called once on app load)
 */
export function initPWA(): void {
  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] Install prompt available');
    notifyListeners();
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredInstallPrompt = null;
    notifyListeners();
  });

  // Register service worker and listen for updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Check for updates periodically (every hour)
      setInterval(() => {
        registration.update().catch(console.error);
      }, 60 * 60 * 1000);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker has taken control, reload to use new version
      console.log('[PWA] New service worker activated, reloading...');
      window.location.reload();
    });
  }
}

/**
 * Set the waiting service worker (called from main.tsx)
 */
export function setWaitingServiceWorker(sw: ServiceWorker | null): void {
  waitingServiceWorker = sw;
  notifyListeners();
}

/**
 * Hook for PWA installation and update functionality.
 *
 * @returns PWA state and action functions
 */
export function usePWA(): UsePWAResult {
  const [, forceUpdate] = useState({});

  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Check if already installed (standalone mode)
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  const canInstall = !isInstalled && deferredInstallPrompt !== null;
  const hasUpdate = waitingServiceWorker !== null;

  /**
   * Trigger the install prompt
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredInstallPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[PWA] Install prompt outcome:', outcome);

      if (outcome === 'accepted') {
        deferredInstallPrompt = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }, []);

  /**
   * Apply the pending update
   */
  const applyUpdate = useCallback((): void => {
    if (!waitingServiceWorker) {
      console.log('[PWA] No waiting service worker');
      return;
    }

    console.log('[PWA] Applying update...');
    waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    // The controllerchange event will trigger reload
  }, []);

  /**
   * Dismiss the update notification
   */
  const dismissUpdate = useCallback((): void => {
    waitingServiceWorker = null;
    notifyListeners();
  }, []);

  /**
   * Dismiss the install prompt
   */
  const dismissInstall = useCallback((): void => {
    deferredInstallPrompt = null;
    notifyListeners();
  }, []);

  return {
    canInstall,
    promptInstall,
    hasUpdate,
    applyUpdate,
    dismissUpdate,
    dismissInstall,
    isInstalled,
  };
}
