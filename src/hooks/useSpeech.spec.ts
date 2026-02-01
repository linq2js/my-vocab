/**
 * Tests for useSpeech hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeech } from './useSpeech';

// Mock the speech service
vi.mock('../services/speech.service', () => ({
  speechService: {
    isSupported: vi.fn().mockReturnValue(true),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isSpeaking: vi.fn().mockReturnValue(false),
  },
}));

import { speechService } from '../services/speech.service';

describe('useSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(speechService.isSupported).mockReturnValue(true);
    vi.mocked(speechService.isSpeaking).mockReturnValue(false);
    vi.mocked(speechService.speak).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when speech synthesis is supported', () => {
      const { result } = renderHook(() => useSpeech());
      
      expect(result.current.isSupported).toBe(true);
    });

    it('should return false when speech synthesis is not supported', () => {
      vi.mocked(speechService.isSupported).mockReturnValue(false);
      
      const { result } = renderHook(() => useSpeech());
      
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('speak', () => {
    it('should call speechService.speak with text and language', async () => {
      const { result } = renderHook(() => useSpeech());
      
      await act(async () => {
        await result.current.speak('hello', 'en');
      });
      
      expect(speechService.speak).toHaveBeenCalledWith('hello', 'en');
    });

    it('should set isSpeaking to true while speaking', async () => {
      let resolveSpeak: () => void;
      vi.mocked(speechService.speak).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSpeak = resolve;
        });
      });

      const { result } = renderHook(() => useSpeech());
      
      expect(result.current.isSpeaking).toBe(false);
      
      let speakPromise: Promise<void>;
      act(() => {
        speakPromise = result.current.speak('hello', 'en');
      });
      
      expect(result.current.isSpeaking).toBe(true);
      
      await act(async () => {
        resolveSpeak!();
        await speakPromise;
      });
      
      expect(result.current.isSpeaking).toBe(false);
    });

    it('should set isSpeaking to false on error', async () => {
      vi.mocked(speechService.speak).mockRejectedValue(new Error('Speech error'));
      
      const { result } = renderHook(() => useSpeech());
      
      await act(async () => {
        try {
          await result.current.speak('hello', 'en');
        } catch {
          // Expected error
        }
      });
      
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('stop', () => {
    it('should call speechService.stop', () => {
      const { result } = renderHook(() => useSpeech());
      
      act(() => {
        result.current.stop();
      });
      
      expect(speechService.stop).toHaveBeenCalled();
    });

    it('should set isSpeaking to false', async () => {
      vi.mocked(speechService.speak).mockImplementation(() => {
        return new Promise(() => {
          // Promise never resolves - we test stop() behavior
        });
      });

      const { result } = renderHook(() => useSpeech());
      
      act(() => {
        result.current.speak('hello', 'en');
      });
      
      expect(result.current.isSpeaking).toBe(true);
      
      act(() => {
        result.current.stop();
      });
      
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should stop speech on unmount', () => {
      const { unmount } = renderHook(() => useSpeech());
      
      unmount();
      
      expect(speechService.stop).toHaveBeenCalled();
    });
  });
});
