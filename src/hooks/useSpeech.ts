import { useState, useCallback, useEffect } from 'react';
import { speechService } from '../services/speech.service';

/**
 * Return type for the useSpeech hook
 */
export interface UseSpeechResult {
  /** Speak the given text in the specified language */
  speak: (text: string, languageCode: string) => Promise<void>;
  /** Stop any ongoing speech */
  stop: () => void;
  /** Whether speech is currently active */
  isSpeaking: boolean;
  /** Whether the Web Speech API is supported */
  isSupported: boolean;
}

/**
 * React hook for text-to-speech functionality.
 * 
 * Wraps the speech service and provides reactive state management
 * for speaking status. Automatically stops speech on unmount.
 *
 * @example
 * ```tsx
 * const { speak, stop, isSpeaking, isSupported } = useSpeech();
 * 
 * if (isSupported) {
 *   return (
 *     <button onClick={() => speak('Hello', 'en')} disabled={isSpeaking}>
 *       {isSpeaking ? 'Speaking...' : 'Speak'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useSpeech = (): UseSpeechResult => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSupported = speechService.isSupported();

  /**
   * Speak the given text in the specified language.
   * Sets isSpeaking to true while speech is active.
   */
  const speak = useCallback(async (text: string, languageCode: string): Promise<void> => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    setIsSpeaking(true);
    try {
      await speechService.speak(text, languageCode);
    } catch (error) {
      // Log error but don't throw - speech errors shouldn't break the UI
      console.error('Speech synthesis error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isSupported]);

  /**
   * Stop any ongoing speech.
   * Resets isSpeaking to false.
   */
  const stop = useCallback(() => {
    speechService.stop();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
};
