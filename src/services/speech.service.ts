/**
 * Service for text-to-speech functionality using the Web Speech API.
 *
 * Provides methods to speak text, stop speech, and check speech status.
 * Automatically selects appropriate voices based on language code.
 *
 * @example
 * ```typescript
 * const speechService = new SpeechService();
 *
 * if (speechService.isSupported()) {
 *   await speechService.speak('Hello world', 'en');
 * }
 * ```
 */
export class SpeechService {
  constructor() {
    // Pre-load voices when the service is created
    if (this.isSupported()) {
      this.loadVoices();
      // Listen for voices to be loaded (required by some browsers)
      speechSynthesis.addEventListener?.('voiceschanged', () => {
        this.loadVoices();
      });
    }
  }

  /**
   * Check if the Web Speech API is supported in the current browser.
   * @returns true if speechSynthesis is available
   */
  isSupported(): boolean {
    return typeof speechSynthesis !== 'undefined';
  }

  /**
   * Load voices - triggers voice loading in browsers that need it.
   */
  private loadVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices();
  }

  /**
   * Find the best available voice for a given language code.
   * @param langCode - ISO 639-1 language code (e.g., 'en', 'es', 'fr')
   * @returns The matching voice or null if not found
   */
  private findVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;

    const voices = this.loadVoices();
    // Find a voice that starts with the language code (e.g., 'en' matches 'en-US', 'en-GB')
    return voices.find((voice) => voice.lang.startsWith(langCode)) ?? null;
  }

  /**
   * Speak the given text using text-to-speech.
   * Cancels any ongoing speech before starting.
   *
   * @param text - The text to speak
   * @param languageCode - ISO 639-1 language code for voice selection
   * @returns Promise that resolves when speech ends, rejects on error
   */
  speak(text: string, languageCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Always set the language on the utterance (works even without a specific voice)
      utterance.lang = languageCode;

      // Try to find a specific voice for better quality
      const voice = this.findVoiceForLanguage(languageCode);
      if (voice) {
        utterance.voice = voice;
      }

      // Set up event handlers
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        // Some browsers fire error for 'interrupted' when cancel is called
        // which is not a real error
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(event);
        }
      };

      // Start speaking
      speechSynthesis.speak(utterance);

      // Workaround for Chrome bug where long texts get stuck
      // https://bugs.chromium.org/p/chromium/issues/detail?id=679437
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }
    });
  }

  /**
   * Stop any ongoing speech.
   */
  stop(): void {
    if (!this.isSupported()) return;
    speechSynthesis.cancel();
  }

  /**
   * Check if speech synthesis is currently active.
   * @returns true if currently speaking
   */
  isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return speechSynthesis.speaking;
  }
}

/**
 * Singleton instance of the speech service.
 */
export const speechService = new SpeechService();
