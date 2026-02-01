/**
 * Tests for useNetworkStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus, isNetworkError, getNetworkErrorMessage } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  const originalNavigator = globalThis.navigator;
  
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it('should return online status initially', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('should update when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.lastChanged).toBeInstanceOf(Date);
  });

  it('should update when coming back online', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    // Go offline first
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOffline).toBe(true);
    
    // Come back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('should detect TypeError with "failed to fetch"', () => {
    const error = new TypeError('Failed to fetch');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect TypeError with "network"', () => {
    const error = new TypeError('network error');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect Error with "offline"', () => {
    const error = new Error('You are offline');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect Error with "connection"', () => {
    const error = new Error('Connection refused');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect Error with "timeout"', () => {
    const error = new Error('Request timeout');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for non-network errors', () => {
    const error = new Error('Some other error');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('getNetworkErrorMessage', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should return offline message when navigator.onLine is false', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false });
    
    const message = getNetworkErrorMessage(new Error('any error'));
    expect(message).toBe('You are offline. Please check your internet connection.');
  });

  it('should return connection error for network errors', () => {
    const error = new TypeError('Failed to fetch');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Unable to connect. Please check your internet connection and try again.');
  });

  it('should return API key error for API key issues', () => {
    const error = new Error('Invalid API key provided');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Invalid API key. Please check your settings.');
  });

  it('should return rate limit error for 429 errors', () => {
    const error = new Error('Rate limit exceeded (429)');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('should return auth error for 401 errors', () => {
    const error = new Error('Unauthorized (401)');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Authentication failed. Please check your API key.');
  });

  it('should return server error for 500 errors', () => {
    const error = new Error('Internal server error (500)');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Service temporarily unavailable. Please try again later.');
  });

  it('should return the error message for other errors', () => {
    const error = new Error('Custom error message');
    const message = getNetworkErrorMessage(error);
    expect(message).toBe('Custom error message');
  });

  it('should return fallback message for non-Error types', () => {
    const message = getNetworkErrorMessage('string error', 'Default message');
    expect(message).toBe('Default message');
  });
});
