/**
 * Offline Indicator Component
 * 
 * Shows a banner when the user is offline, indicating that 
 * the app is running in offline mode with limited functionality.
 * 
 * @example
 * ```tsx
 * // In your layout component
 * <OfflineIndicator />
 * ```
 */

import { useNetworkStatus } from '../../hooks';
import { Icon } from '../atoms/Icon';

/**
 * Props for the OfflineIndicator component
 */
export interface OfflineIndicatorProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * OfflineIndicator displays a banner when the app is offline.
 * 
 * Features:
 * - Automatically detects online/offline status
 * - Shows warning banner when offline
 * - Slides in/out smoothly
 * - Accessible with proper ARIA attributes
 */
export const OfflineIndicator = ({ className = '' }: OfflineIndicatorProps) => {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-0 left-0 right-0 z-50
        bg-amber-500 dark:bg-amber-600
        text-amber-900 dark:text-amber-100
        px-4 py-2
        flex items-center justify-center gap-2
        text-sm font-medium
        shadow-md
        animate-slide-down
        ${className}
      `}
    >
      <Icon name="warning" size="sm" className="shrink-0" />
      <span>
        You're offline. Some features may be unavailable.
      </span>
    </div>
  );
};
