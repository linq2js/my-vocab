/**
 * Network Status Hook
 * 
 * Provides real-time network connectivity status for the application.
 * Used to show offline indicators and disable network-dependent features.
 * 
 * @example
 * ```tsx
 * const { isOnline, isOffline } = useNetworkStatus();
 * 
 * if (isOffline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Convenience inverse of isOnline */
  isOffline: boolean;
  /** Timestamp of last status change */
  lastChanged: Date | null;
}

/**
 * Hook that tracks network connectivity status.
 * 
 * Uses the Navigator.onLine API and listens for online/offline events.
 * Note: This detects network availability, not necessarily internet access.
 * 
 * @returns Network status object
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Default to online if navigator is not available (SSR)
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });
  
  const [lastChanged, setLastChanged] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastChanged(new Date());
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setLastChanged(new Date());
  }, []);

  useEffect(() => {
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChanged,
  };
}

/**
 * Utility to check if an error is likely due to network issues.
 * 
 * @param error - The error to check
 * @returns True if the error appears to be network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Fetch API throws TypeError for network failures
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('load failed') ||
      message.includes('networkerror')
    );
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('internet') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }
  
  return false;
}

/**
 * Returns a user-friendly error message for network errors.
 * 
 * @param error - The error that occurred
 * @param fallbackMessage - Message to use if not a network error
 * @returns User-friendly error message
 */
export function getNetworkErrorMessage(
  error: unknown,
  fallbackMessage = 'An error occurred'
): string {
  if (!navigator.onLine) {
    return 'You are offline. Please check your internet connection.';
  }
  
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  
  if (error instanceof Error) {
    // Check for specific API errors
    const message = error.message.toLowerCase();
    
    if (message.includes('api key')) {
      return 'Invalid API key. Please check your settings.';
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication failed. Please check your API key.';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'Service not available. Please try again later.';
    }
    
    if (message.includes('server') || message.includes('500') || message.includes('503')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    return error.message;
  }
  
  return fallbackMessage;
}
