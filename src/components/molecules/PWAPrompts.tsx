/**
 * PWA Prompts component for installation and update notifications.
 *
 * Shows non-intrusive prompts for:
 * - Installing the app (Add to Home Screen)
 * - Updating to a new version
 *
 * @example
 * ```tsx
 * <PWAPrompts />
 * ```
 */

import { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { usePWA } from '../../hooks/usePWA';

/**
 * PWAPrompts component - shows installation and update prompts.
 */
export const PWAPrompts = () => {
  const {
    canInstall,
    promptInstall,
    hasUpdate,
    applyUpdate,
    dismissUpdate,
    dismissInstall,
  } = usePWA();

  // Track if user has dismissed prompts in this session
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Check localStorage for persistent dismissal (install only)
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setInstallDismissed(true);
      }
    }
  }, []);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (!installed) {
      // User declined, don't show again for a while
      handleDismissInstall();
    }
  };

  const handleDismissInstall = () => {
    setInstallDismissed(true);
    dismissInstall();
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleDismissUpdate = () => {
    setUpdateDismissed(true);
    dismissUpdate();
  };

  const showInstall = canInstall && !installDismissed;
  const showUpdate = hasUpdate && !updateDismissed;

  if (!showInstall && !showUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex flex-col gap-2 sm:left-auto sm:right-6 sm:max-w-sm">
      {/* Update Available Banner */}
      {showUpdate && (
        <div
          className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl shadow-lg animate-slide-up"
          role="alert"
        >
          <div className="flex-shrink-0">
            <Icon name="info" size="md" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Update Available</p>
            <p className="text-xs text-blue-100">
              A new version is ready to use.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissUpdate}
              className="text-white border-white/50 hover:bg-white/10"
            >
              Later
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={applyUpdate}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Update
            </Button>
          </div>
        </div>
      )}

      {/* Install App Banner */}
      {showInstall && (
        <div
          className="flex items-center gap-3 p-4 bg-gray-800 dark:bg-gray-700 text-white rounded-xl shadow-lg animate-slide-up"
          role="alert"
        >
          <div className="flex-shrink-0">
            <Icon name="download" size="md" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Install MyVocab</p>
            <p className="text-xs text-gray-300">
              Add to home screen for quick access.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissInstall}
              className="text-white border-white/50 hover:bg-white/10"
            >
              Not now
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstall}
            >
              Install
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
