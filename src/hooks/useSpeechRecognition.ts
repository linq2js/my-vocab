import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Browser SpeechRecognition type (Web Speech API).
 * Not all browsers expose this on the global; we use a minimal interface.
 */
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
}

// Minimal types for Web Speech API (not in all TS libs)
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; length: number; [i: number]: { transcript: string } }>;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export interface UseSpeechRecognitionResult {
  /** Whether the browser supports speech recognition */
  isSupported: boolean;
  /** Whether the recognizer is currently listening */
  isListening: boolean;
  /** Start listening for speech (uses lang from options) */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Last final transcript from the recognizer */
  finalTranscript: string;
  /** Current interim transcript while speaking */
  interimTranscript: string;
  /** Combined display transcript (final + interim) */
  transcript: string;
  /** Clear the current transcript (does not stop listening) */
  clearTranscript: () => void;
  /** Last error message if recognition failed */
  error: string | null;
}

export interface UseSpeechRecognitionOptions {
  /** Language code for recognition (e.g. 'en-US', 'es-ES') */
  lang?: string;
  /** Whether to return continuous results (default true for conversation) */
  continuous?: boolean;
  /** Whether to return interim results (default true) */
  interimResults?: boolean;
  /** Callback when a final result is available */
  onResult?: (transcript: string) => void;
}

/**
 * React hook for speech-to-text using the Web Speech API (SpeechRecognition).
 * Supports continuous listening and interim results.
 *
 * @example
 * ```tsx
 * const { isSupported, isListening, start, stop, transcript, onResult } = useSpeechRecognition({
 *   lang: 'en-US',
 *   onResult: (text) => console.log('Final:', text),
 * });
 * ```
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onResult,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const accumulatedFinalRef = useRef('');
  onResultRef.current = onResult;

  const isSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition != null || window.webkitSpeechRecognition != null);

  const transcript = [finalTranscript, interimTranscript].filter(Boolean).join(' ');

  const clearTranscript = useCallback(() => {
    accumulatedFinalRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Speech recognition not available');
      return;
    }

    stop(); // ensure previous instance is cleaned up

    const rec = new Recognition() as ISpeechRecognition;
    recognitionRef.current = rec;
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    rec.lang = lang;
    setError(null);

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let finalText = '';

      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const first = result?.[0];
        const text = (first && 'transcript' in first ? first.transcript : '') ?? '';
        if (result?.isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }

      if (finalText) {
        const next = (accumulatedFinalRef.current ? `${accumulatedFinalRef.current} ` : '') + finalText.trim();
        accumulatedFinalRef.current = next;
        setFinalTranscript(next);
        setInterimTranscript('');
        // Fire onResult when we have final text so we don't miss it (onend often runs with empty when user stops before browser finalizes)
        onResultRef.current?.(next);
        accumulatedFinalRef.current = '';
        setFinalTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const message = (event as unknown as { message?: string }).message ?? 'Recognition error';
      setError(message);
      if (event.error === 'aborted' || event.error === 'no-speech') {
        // Don't treat no-speech as fatal
        if (event.error === 'no-speech') setError(null);
      }
    };

    rec.onend = () => {
      const accumulated = accumulatedFinalRef.current.trim();
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
        setIsListening(false);
        setInterimTranscript('');
        // Fire onResult once per utterance (when listening ends), not per fragment
        if (accumulated) {
          onResultRef.current?.(accumulated);
          accumulatedFinalRef.current = '';
          setFinalTranscript('');
        } else {
          // Browser may deliver final result after onend; give it a short window so we don't miss the last phrase
          setTimeout(() => {
            const late = accumulatedFinalRef.current.trim();
            if (late) {
              onResultRef.current?.(late);
              accumulatedFinalRef.current = '';
              setFinalTranscript('');
            }
          }, 400);
        }
      }
    };

    try {
      rec.start();
      setIsListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start recognition');
      recognitionRef.current = null;
    }
  }, [isSupported, continuous, interimResults, lang, stop]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    start,
    stop,
    finalTranscript,
    interimTranscript,
    transcript,
    clearTranscript,
    error,
  };
}
