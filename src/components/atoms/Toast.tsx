/**
 * Toast component for displaying temporary notifications.
 */

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export interface ToastProps {
  /** Message to display */
  message: string;
  /** Duration in milliseconds before auto-dismiss (default: 4000) */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Whether the toast is visible */
  isVisible: boolean;
}

/**
 * Toast notification component.
 * Automatically dismisses after the specified duration.
 */
export const Toast = ({ 
  message, 
  duration = 4000, 
  onDismiss,
  isVisible 
}: ToastProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Small delay to trigger animation
      requestAnimationFrame(() => setShow(true));
      
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onDismiss?.(), 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setShow(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <div
      onClick={handleDismiss}
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        max-w-sm w-[90%] px-4 py-3
        bg-gray-800 dark:bg-gray-700 text-white
        rounded-lg shadow-lg cursor-pointer
        flex items-start gap-3
        transition-all duration-300
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      role="alert"
    >
      <Icon name="info" size="md" className="text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <Icon name="close" size="sm" className="flex-shrink-0 opacity-60" />
    </div>
  );
};
