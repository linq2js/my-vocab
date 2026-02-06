/**
 * VoiceModal – voice practice mode with correction and next-idea suggestions.
 *
 * Users can speak; the app shows corrected text in the target language and
 * suggests what to say next based on the conversation so far.
 *
 * Large screen: Correction and Suggestion shown side by side as lists; no toggle.
 * Small screen: Toggle between Correction and Suggestion. Both views are lists,
 * auto-scroll to latest, latest message has distinct style.
 */

import React, { useState, useCallback, useEffect, useId, useRef } from 'react';
import { useSelector } from 'atomirx/react';
import { ModalLayout } from '../templates/ModalLayout';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { LANGUAGES } from '../../constants/languages';
import { settingsStore } from '../../stores/settings.store';
import { gptService } from '../../services/gpt.service';
import { useSpeechRecognition, useSpeech } from '../../hooks';
import type { TranslationStyle } from '../../types/translation';

/** One turn in the unified list: user said, correction, suggestion, and optionally bot reply + suggested reply */
interface UnifiedTurn {
  id: string;
  userSaid: string;
  correction: string;
  suggestionLines: string[];
  /** Only when Auto reply is on */
  botReply?: { text: string; isBlurred: boolean };
  suggestedReply?: { text: string; isBlurred: boolean };
}

/** Parse API suggestion text into list of lines (strip empty, trim) */
function parseSuggestionLines(text: string): string[] {
  return text
    .split(/\n/)
    .map((s) => s.replace(/^[\s•\-*\d.)]+/, '').trim())
    .filter(Boolean);
}

/** Map our language codes to SpeechRecognition lang (e.g. en -> en-US) */
function toRecognitionLang(code: string): string {
  const map: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    pt: 'pt-BR',
    ru: 'ru-RU',
    ar: 'ar-SA',
    hi: 'hi-IN',
    th: 'th-TH',
    vi: 'vi-VN',
    nl: 'nl-NL',
    pl: 'pl-PL',
    tr: 'tr-TR',
    uk: 'uk-UA',
  };
  return map[code] ?? code;
}

export interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks translate on a message; opens translate modal with (text, sourceLang) */
  onTranslate?: (text: string, sourceLang: string) => void;
}


export const VoiceModal = ({ isOpen, onClose, onTranslate }: VoiceModalProps): React.ReactElement | null => {
  const selectId = useId();

  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('en');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  /** Options: which sections to show */
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showBotReply, setShowBotReply] = useState(true);
  const [showSuggestedReply, setShowSuggestedReply] = useState(true);
  /** Unified list: each turn has You said, Correction, Suggestion, and optionally Bot + Suggested reply */
  const [unifiedTurns, setUnifiedTurns] = useState<UnifiedTurn[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const conversationRef = useRef<string[]>([]);
  conversationRef.current = unifiedTurns.map((t) => t.userSaid);
  const showSuggestionRef = useRef(showSuggestion);
  showSuggestionRef.current = showSuggestion;
  const showBotReplyRef = useRef(showBotReply);
  showBotReplyRef.current = showBotReply;
  const showSuggestedReplyRef = useRef(showSuggestedReply);
  showSuggestedReplyRef.current = showSuggestedReply;

  const unifiedListRef = useRef<HTMLDivElement>(null);
  /** Whether the user is currently holding the speak button */
  const isHoldingRef = useRef(false);

  const { speak, stop: stopSpeech, isSupported: isSpeechSupported } = useSpeech();

  const settings = useSelector(settingsStore.settings$);
  const translationStyles = (settings.translationStyles ?? []) as TranslationStyle[];
  const selectedStyle = selectedStyleId
    ? translationStyles.find((s) => s.id === selectedStyleId)
    : null;

  const startListeningRef = useRef<() => void>(() => {});

  const {
    isSupported: isRecognitionSupported,
    isListening,
    start: startListening,
    stop: stopListening,
    clearTranscript,
    error: recognitionError,
  } = useSpeechRecognition({
    lang: toRecognitionLang(sourceLang),
    continuous: false,
    interimResults: true,
    onEnd: useCallback(() => {
      // If user is still holding the button, restart recognition (browser auto-stopped after silence)
      if (isHoldingRef.current) {
        startListeningRef.current();
      }
    }, []),
    onResult: useCallback(
      (finalTranscript: string) => {
        const segment = finalTranscript.trim();
        if (!segment) return;

        const historyWithNew = [...conversationRef.current, segment];
        setVoiceError(null);

        const gpt = gptService();
        const stylePrompt = selectedStyle?.prompt;

        const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const wantSuggestion = showSuggestionRef.current;
        const wantBotReply = showBotReplyRef.current;
        const wantSuggestedReply = showSuggestedReplyRef.current;

        // Show turn immediately; update as each result arrives
        const placeholder: UnifiedTurn = {
          id: turnId,
          userSaid: segment,
          correction: '',
          suggestionLines: [],
        };
        setUnifiedTurns((prev) => [...prev, placeholder]);
        setIsCorrecting(true);
        if (wantSuggestion) setIsSuggesting(true);
        if (wantBotReply) setIsReplying(true);

        const updateTurn = (patch: Partial<Omit<UnifiedTurn, 'id' | 'userSaid'>>) => {
          setUnifiedTurns((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, ...patch } : t))
          );
        };
        const handleErr = (err: unknown) => {
          setVoiceError(err instanceof Error ? err.message : 'Something went wrong');
        };

        const pCorrect = gpt
          .correctText(segment, sourceLang, targetLang, stylePrompt)
          .then((corrected) => updateTurn({ correction: corrected }))
          .catch(handleErr)
          .finally(() => setIsCorrecting(false));

        const pSuggest = wantSuggestion
          ? gpt
              .suggestNextIdeas(historyWithNew, targetLang)
              .then((suggestions) => updateTurn({ suggestionLines: parseSuggestionLines(suggestions) }))
              .catch(handleErr)
              .finally(() => setIsSuggesting(false))
          : Promise.resolve();

        const pReply = wantBotReply
          ? gpt
              .getConversationReply(segment, targetLang, stylePrompt)
              .then((replyText) => {
                updateTurn({
                  botReply: { text: replyText, isBlurred: true },
                });
                if (isSpeechSupported) speak(replyText, targetLang);
                return wantSuggestedReply
                  ? gpt
                      .getSuggestedReplyToBot(replyText, targetLang, stylePrompt)
                      .then((suggestedReplyText) => {
                        updateTurn({
                          suggestedReply: { text: suggestedReplyText, isBlurred: true },
                        });
                      })
                      .catch(() => {})
                  : Promise.resolve();
              })
              .catch(handleErr)
              .finally(() => setIsReplying(false))
          : Promise.resolve();

        Promise.allSettled([pCorrect, pSuggest, pReply]).finally(() => gpt.close());
      },
      [sourceLang, targetLang, selectedStyle?.prompt, isSpeechSupported, speak]
    ),
  });
  startListeningRef.current = startListening;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      isHoldingRef.current = false;
      setUnifiedTurns([]);
      setVoiceError(null);
      clearTranscript();
      stopListening();
    }
  }, [isOpen, clearTranscript, stopListening]);

  // Auto-scroll to latest in unified list
  useEffect(() => {
    if (unifiedTurns.length > 0) {
      unifiedListRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [unifiedTurns.length]);

  const toggleTurnBotBlur = useCallback((turnId: string) => {
    setUnifiedTurns((prev) =>
      prev.map((t) =>
        t.id === turnId && t.botReply
          ? { ...t, botReply: { ...t.botReply, isBlurred: !t.botReply.isBlurred } }
          : t
      )
    );
  }, []);

  const toggleTurnSuggestedReplyBlur = useCallback((turnId: string) => {
    setUnifiedTurns((prev) =>
      prev.map((t) =>
        t.id === turnId && t.suggestedReply
          ? { ...t, suggestedReply: { ...t.suggestedReply, isBlurred: !t.suggestedReply.isBlurred } }
          : t
      )
    );
  }, []);

  useEffect(() => {
    if (recognitionError) setVoiceError(recognitionError);
  }, [recognitionError]);

  /** Hold-to-speak: start recognition on press, stop on release */
  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // prevent long-press context menu on mobile
    isHoldingRef.current = true;
    setVoiceError(null);
    stopSpeech();
    startListening();
  }, [startListening, stopSpeech]);

  const handlePressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isHoldingRef.current = false;
    stopListening();
  }, [stopListening]);

  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} title="Conversation Mode" size="full">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
          {/* Language: source & dest */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label
                htmlFor={`${selectId}-voice-source`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Source language
              </label>
              <select
                id={`${selectId}-voice-source`}
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={isListening}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor={`${selectId}-voice-dest`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Target language
              </label>
              <select
                id={`${selectId}-voice-dest`}
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isListening}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedStyleId(null)}
                disabled={isListening}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors disabled:opacity-50 ${
                  selectedStyleId === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                No style
              </button>
              {translationStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyleId(style.id)}
                  disabled={isListening}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors disabled:opacity-50 ${
                    selectedStyleId === style.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</p>
            <div className="flex flex-col gap-2 lg:flex-row lg:gap-6">
              {/* Suggestion toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSuggestion}
                  onClick={() => setShowSuggestion((prev) => !prev)}
                  disabled={isListening}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    showSuggestion ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      showSuggestion ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                    style={{ marginTop: 2 }}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">What to say next</span>
              </label>
              {/* Chat with Bot toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBotReply}
                  onClick={() => setShowBotReply((prev) => !prev)}
                  disabled={isListening}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    showBotReply ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      showBotReply ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                    style={{ marginTop: 2 }}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">Chat with Bot</span>
              </label>
              {/* Suggested reply toggle (dimmed when Chat with Bot is off) */}
              <label className={`flex items-center gap-2 cursor-pointer select-none ${!showBotReply ? 'opacity-40 pointer-events-none' : ''}`}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSuggestedReply}
                  onClick={() => setShowSuggestedReply((prev) => !prev)}
                  disabled={isListening || !showBotReply}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    showSuggestedReply ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      showSuggestedReply ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                    style={{ marginTop: 2 }}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">How to respond</span>
              </label>
            </div>
          </div>

          {/* Result */}
          <div className="space-y-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Result
            </span>

            {/* Unified message list */}
            <div className="min-h-[200px] max-h-[50vh] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div ref={unifiedListRef} className="space-y-6">
                {unifiedTurns.length === 0 && !isCorrecting && !isSuggesting && !isReplying && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Messages will appear here after you speak.
                  </p>
                )}
                {unifiedTurns.map((turn, index) => {
                  const isLatest = index === unifiedTurns.length - 1;
                  const latestBg = 'bg-blue-50 dark:bg-blue-900/20';
                  return (
                    <div
                      key={turn.id}
                      className={`rounded-lg p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 space-y-3 ${isLatest ? latestBg : ''}`}
                    >
                      {/* You said */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">You said</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {turn.userSaid}
                        </p>
                      </div>
                      {/* Correction */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Corrected</p>
                        {turn.correction ? (
                          <>
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-1">
                              {turn.correction}
                            </p>
                            <div className="flex items-center gap-2">
                              {isSpeechSupported && (
                                <button
                                  type="button"
                                  onClick={() => speak(turn.correction, targetLang)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Read aloud"
                                >
                                  <Icon name="volume" size="sm" />
                                </button>
                              )}
                              {onTranslate && (
                                <button
                                  type="button"
                                  onClick={() => onTranslate(turn.correction, targetLang)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Translate"
                                >
                                  <Icon name="translate" size="sm" />
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Icon name="spinner" size="sm" />
                            Correcting...
                          </p>
                        )}
                      </div>
                      {/* Suggestion (only if suggestion lines exist or still loading) */}
                      {(turn.suggestionLines.length > 0 || (isLatest && isSuggesting)) && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">What to say next</p>
                        {turn.suggestionLines.length > 0 ? (
                          <ul className="space-y-2">
                            {turn.suggestionLines.map((line, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-900 dark:text-gray-100">
                                <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                                <div className="flex-1">
                                  <span>{line}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {isSpeechSupported && (
                                      <button
                                        type="button"
                                        onClick={() => speak(line, targetLang)}
                                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Read aloud"
                                      >
                                        <Icon name="volume" size="sm" />
                                      </button>
                                    )}
                                    {onTranslate && (
                                      <button
                                        type="button"
                                        onClick={() => onTranslate(line, targetLang)}
                                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Translate"
                                      >
                                        <Icon name="translate" size="sm" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Icon name="spinner" size="sm" />
                            Suggesting...
                          </p>
                        )}
                      </div>
                      )}
                      {/* Bot (when Chat with Bot is on: show loading until reply arrives) */}
                      {(turn.botReply || (isLatest && isReplying)) && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Reply</p>
                          {turn.botReply ? (
                            <>
                              <div
                                className={`text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap min-h-8 ${
                                  turn.botReply.isBlurred ? 'select-none blur-md pointer-events-none' : ''
                                }`}
                                aria-hidden={turn.botReply.isBlurred}
                              >
                                {turn.botReply.text}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {isSpeechSupported && (
                                  <button
                                    type="button"
                                    onClick={() => speak(turn.botReply!.text, targetLang)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Read aloud"
                                  >
                                    <Icon name="volume" size="sm" />
                                  </button>
                                )}
                                {onTranslate && (
                                  <button
                                    type="button"
                                    onClick={() => onTranslate(turn.botReply!.text, targetLang)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Translate"
                                  >
                                    <Icon name="translate" size="sm" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleTurnBotBlur(turn.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label={turn.botReply.isBlurred ? 'Show message' : 'Hide message'}
                                >
                                  <Icon name={turn.botReply.isBlurred ? 'eye' : 'eye-off'} size="sm" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <Icon name="spinner" size="sm" />
                              Generating reply...
                            </p>
                          )}
                        </div>
                      )}
                      {/* Suggested reply (only when Auto reply was on) */}
                      {turn.suggestedReply && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">How to respond</p>
                          <div
                            className={`text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap min-h-8 ${
                              turn.suggestedReply.isBlurred ? 'select-none blur-md pointer-events-none' : ''
                            }`}
                            aria-hidden={turn.suggestedReply.isBlurred}
                          >
                            {turn.suggestedReply.text}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {isSpeechSupported && (
                              <button
                                type="button"
                                onClick={() => speak(turn.suggestedReply!.text, targetLang)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Read aloud"
                              >
                                <Icon name="volume" size="sm" />
                              </button>
                            )}
                            {onTranslate && (
                              <button
                                type="button"
                                onClick={() => onTranslate(turn.suggestedReply!.text, targetLang)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Translate"
                              >
                                <Icon name="translate" size="sm" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleTurnSuggestedReplyBlur(turn.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              aria-label={turn.suggestedReply.isBlurred ? 'Show suggested reply' : 'Hide suggested reply'}
                            >
                              <Icon name={turn.suggestedReply.isBlurred ? 'eye' : 'eye-off'} size="sm" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {(isCorrecting || isSuggesting || isReplying) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-3">
                  <Icon name="spinner" size="sm" />
                  {isReplying ? 'Generating reply...' : 'Correcting...'}
                </p>
              )}
            </div>
          </div>

          {voiceError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{voiceError}</p>
            </div>
          )}

          {!isRecognitionSupported && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Voice recognition is not supported in this browser. Try Chrome or Edge.
              </p>
            </div>
          )}
        </div>

        {/* Hold to speak button */}
        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
          <Button
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={isListening ? handlePressEnd : undefined}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onContextMenu={preventContextMenu}
            disabled={!isRecognitionSupported}
            variant={isListening ? 'danger' : 'primary'}
            fullWidth
            className="text-sm flex items-center justify-center gap-2 select-none"
            style={{ touchAction: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
          >
            <Icon name={isListening ? 'mic' : 'mic-off'} size="sm" />
            {isListening ? 'Listening...' : 'Hold to speak'}
          </Button>
        </div>
      </div>
    </ModalLayout>
  );
};
