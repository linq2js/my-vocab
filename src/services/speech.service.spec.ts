import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechService } from './speech.service';

describe('SpeechService', () => {
  let speechService: SpeechService;
  let mockSpeechSynthesis: {
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    getVoices: ReturnType<typeof vi.fn>;
    speaking: boolean;
  };
  let mockUtterance: {
    text: string;
    lang: string;
    voice: SpeechSynthesisVoice | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
  };

  const mockVoices: Partial<SpeechSynthesisVoice>[] = [
    { lang: 'en-US', name: 'English US', localService: true, default: true, voiceURI: 'en-US' },
    { lang: 'en-GB', name: 'English UK', localService: true, default: false, voiceURI: 'en-GB' },
    { lang: 'es-ES', name: 'Spanish', localService: true, default: false, voiceURI: 'es-ES' },
    { lang: 'fr-FR', name: 'French', localService: true, default: false, voiceURI: 'fr-FR' },
    { lang: 'de-DE', name: 'German', localService: true, default: false, voiceURI: 'de-DE' },
  ];

  beforeEach(() => {
    mockUtterance = {
      text: '',
      lang: '',
      voice: null,
      onend: null,
      onerror: null,
    };

    // Mock SpeechSynthesisUtterance as a class
    class MockSpeechSynthesisUtterance {
      text: string;
      lang: string;
      voice: SpeechSynthesisVoice | null;
      onend: (() => void) | null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;

      constructor(text: string) {
        this.text = text;
        this.lang = '';
        this.voice = null;
        this.onend = null;
        this.onerror = null;
        // Store reference for test assertions
        mockUtterance.text = text;
        Object.assign(mockUtterance, this);
        // Make mockUtterance point to this instance
        Object.defineProperty(mockUtterance, 'voice', {
          get: () => this.voice,
          set: (v) => { this.voice = v; },
          configurable: true,
        });
        Object.defineProperty(mockUtterance, 'onend', {
          get: () => this.onend,
          set: (v) => { this.onend = v; },
          configurable: true,
        });
        Object.defineProperty(mockUtterance, 'onerror', {
          get: () => this.onerror,
          set: (v) => { this.onerror = v; },
          configurable: true,
        });
      }
    }

    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue(mockVoices),
      speaking: false,
    };

    vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);

    speechService = new SpeechService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isSupported', () => {
    it('should return true when speechSynthesis is available', () => {
      expect(speechService.isSupported()).toBe(true);
    });

    it('should return false when speechSynthesis is not available', () => {
      vi.stubGlobal('speechSynthesis', undefined);
      const service = new SpeechService();
      expect(service.isSupported()).toBe(false);
    });
  });

  describe('speak', () => {
    it('should create utterance with correct text', () => {
      speechService.speak('hello', 'en');

      expect(mockUtterance.text).toBe('hello');
    });

    it('should set voice matching language code', () => {
      speechService.speak('hola', 'es');

      expect(mockUtterance.voice).toEqual(
        expect.objectContaining({ lang: 'es-ES' })
      );
    });

    it('should call speechSynthesis.speak with utterance', () => {
      speechService.speak('hello', 'en');

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should cancel any ongoing speech before speaking', () => {
      speechService.speak('hello', 'en');

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should handle language codes not in voice list', () => {
      speechService.speak('text', 'zh');

      // Should still call speak even without a matching voice
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(mockUtterance.voice).toBeNull();
    });

    it('should do nothing if not supported', () => {
      vi.stubGlobal('speechSynthesis', undefined);
      const service = new SpeechService();

      service.speak('hello', 'en');

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should return a promise that resolves when speech ends', async () => {
      const speakPromise = speechService.speak('hello', 'en');

      // Simulate speech ending
      mockUtterance.onend?.();

      await expect(speakPromise).resolves.toBeUndefined();
    });

    it('should return a promise that rejects on error', async () => {
      const speakPromise = speechService.speak('hello', 'en');

      // Simulate error
      const errorEvent = { error: 'synthesis-failed' } as SpeechSynthesisErrorEvent;
      mockUtterance.onerror?.(errorEvent);

      await expect(speakPromise).rejects.toEqual(errorEvent);
    });
  });

  describe('stop', () => {
    it('should call speechSynthesis.cancel', () => {
      speechService.stop();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should do nothing if not supported', () => {
      vi.stubGlobal('speechSynthesis', undefined);
      const service = new SpeechService();

      service.stop();

      // Should not throw
      expect(mockSpeechSynthesis.cancel).not.toHaveBeenCalled();
    });
  });

  describe('isSpeaking', () => {
    it('should return true when speechSynthesis is speaking', () => {
      mockSpeechSynthesis.speaking = true;

      expect(speechService.isSpeaking()).toBe(true);
    });

    it('should return false when speechSynthesis is not speaking', () => {
      mockSpeechSynthesis.speaking = false;

      expect(speechService.isSpeaking()).toBe(false);
    });

    it('should return false if not supported', () => {
      vi.stubGlobal('speechSynthesis', undefined);
      const service = new SpeechService();

      expect(service.isSpeaking()).toBe(false);
    });
  });

  describe('findVoiceForLanguage', () => {
    it('should find voice matching exact language code prefix', () => {
      speechService.speak('bonjour', 'fr');

      expect(mockUtterance.voice).toEqual(
        expect.objectContaining({ lang: 'fr-FR' })
      );
    });

    it('should match en to en-US or en-GB', () => {
      speechService.speak('hello', 'en');

      expect(mockUtterance.voice?.lang).toMatch(/^en-/);
    });
  });
});
