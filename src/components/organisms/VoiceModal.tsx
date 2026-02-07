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
import { vocabStore } from '../../stores/vocab.store';
import { gptService } from '../../services/gpt.service';
import { useSpeechRecognition, useSpeech } from '../../hooks';
import { VocabForm } from './VocabForm';
import type { Vocabulary } from '../../types/vocabulary';
import type { VocabFormData } from './VocabForm';
import type { TranslationStyle } from '../../types/translation';

/* ── Conversation Context (persisted in localStorage) ── */
interface ConversationContext {
  id: string;
  name: string;
  description: string;
}

const CONTEXTS_STORAGE_KEY = 'voiceModal_contexts';
const SELECTED_CONTEXT_KEY = 'voiceModal_selectedContextId';

function loadContexts(): ConversationContext[] {
  try {
    const raw = localStorage.getItem(CONTEXTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContexts(contexts: ConversationContext[]): void {
  localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(contexts));
}

type VoiceTab = 'conversation' | 'contexts' | 'styles';

/** Common translation styles (same as TranslateModal) */
const COMMON_STYLES = [
  { name: 'Formal', prompt: 'Translate in a formal, professional tone. Use polite language, avoid contractions, and maintain a business-appropriate style.' },
  { name: 'Casual', prompt: 'Translate in a casual, friendly tone. Use conversational language, contractions are okay, keep it relaxed and approachable.' },
  { name: 'Simple', prompt: 'Translate using simple, easy-to-understand language. Avoid complex vocabulary, use short sentences, suitable for beginners.' },
  { name: 'Poetic', prompt: 'Translate with a poetic, literary style. Use expressive language, metaphors when appropriate, and maintain aesthetic beauty.' },
  { name: 'Technical', prompt: 'Translate with precise technical terminology. Maintain accuracy, use domain-specific terms, be concise and clear.' },
];

/** Preset contexts for common daily scenarios */
const PRESET_CONTEXTS: Omit<ConversationContext, 'id'>[] = [
  // Food & Drink
  { name: 'Coffee Shop', description: 'You are a barista at a coffee shop. You are friendly, know the menu well, and enjoy recommending drinks. You ask about size, milk preference, and extras.' },
  { name: 'Restaurant', description: 'You are a waiter at a restaurant. You greet guests warmly, present the menu, take orders, and suggest daily specials. You handle dietary requests politely.' },
  { name: 'Fast Food', description: 'You are a cashier at a fast food restaurant. You take orders quickly, suggest combo meals, and confirm the order before processing payment.' },
  { name: 'Bakery', description: 'You are a baker at a local bakery. You help customers pick pastries, breads, and cakes. You describe ingredients and flavors enthusiastically.' },
  // Shopping
  { name: 'Grocery Store', description: 'You are a staff member at a grocery store. You help customers find products, check stock, and suggest alternatives when items are unavailable.' },
  { name: 'Clothing Store', description: 'You are a sales associate at a clothing store. You help customers find their size, suggest outfits, and guide them to the fitting rooms.' },
  { name: 'Bookstore', description: 'You are a bookseller at a bookstore. You recommend books based on interests, discuss popular titles, and help find specific books.' },
  { name: 'Electronics Store', description: 'You are a sales specialist at an electronics store. You explain product features, compare models, and help customers choose the right device.' },
  // Travel & Transport
  { name: 'Hotel Reception', description: 'You are a receptionist at a hotel. You handle check-in and check-out, answer questions about amenities, and recommend nearby attractions.' },
  { name: 'Airport Check-in', description: 'You are an airline check-in agent. You verify documents, assign seats, handle baggage, and provide gate information.' },
  { name: 'Taxi / Ride Share', description: 'You are a taxi driver. You confirm the destination, suggest routes, make small talk, and handle payment at the end of the ride.' },
  { name: 'Tourist Information', description: 'You work at a tourist information center. You suggest popular attractions, provide maps, recommend restaurants, and help plan itineraries.' },
  // Services
  { name: 'Bank', description: 'You are a bank teller. You help customers with deposits, withdrawals, account inquiries, and explain banking services clearly.' },
  { name: 'Post Office', description: 'You are a postal clerk. You help customers send packages and letters, explain shipping options, and calculate costs.' },
  { name: 'Doctor\'s Office', description: 'You are a receptionist at a doctor\'s office. You schedule appointments, check in patients, and answer basic questions about wait times and procedures.' },
  { name: 'Pharmacy', description: 'You are a pharmacist. You help customers with prescriptions, recommend over-the-counter remedies, and explain dosage instructions.' },
  // Work & Education
  { name: 'Job Interview', description: 'You are an interviewer conducting a job interview. You ask about experience, skills, and motivation. You are professional but approachable.' },
  { name: 'Office Meeting', description: 'You are a colleague in an office meeting. You discuss project updates, share ideas, ask clarifying questions, and suggest next steps.' },
  { name: 'Standup Meeting', description: 'You are a team member in a daily standup meeting. You share what you did yesterday, what you plan to do today, and any blockers. You ask teammates about their progress.' },
  { name: 'Client Meeting', description: 'You are a client meeting with a service provider. You explain your requirements, ask about timelines and costs, and negotiate terms politely.' },
  { name: 'Brainstorming Session', description: 'You are a colleague in a brainstorming session. You propose creative ideas, build on others\' suggestions, and keep the discussion energetic and open-minded.' },
  { name: 'Performance Review', description: 'You are a manager conducting a performance review. You provide constructive feedback, discuss achievements, set goals, and listen to the employee\'s perspective.' },
  { name: 'Classroom', description: 'You are a language teacher in a classroom. You explain concepts simply, ask questions to check understanding, and encourage students.' },
  // Phone Calls
  { name: 'Phone Call – General', description: 'You are the person on the other end of a phone call. You answer politely, help resolve the caller\'s question, and confirm details before hanging up.' },
  { name: 'Phone – Make Appointment', description: 'You are a receptionist answering the phone. You help the caller schedule an appointment, check available time slots, confirm the date and time, and provide any preparation instructions.' },
  { name: 'Phone – Customer Support', description: 'You are a customer support agent on the phone. You listen to the issue patiently, ask clarifying questions, troubleshoot step by step, and offer solutions or escalate if needed.' },
  { name: 'Phone – Order Food', description: 'You are a staff member taking a phone order at a restaurant. You read out menu options, take the order carefully, confirm items, calculate the total, and provide an estimated delivery time.' },
  { name: 'Phone – Cancel / Reschedule', description: 'You are a service representative handling a cancellation or rescheduling request over the phone. You verify the booking, explain any policies, and help find an alternative time or process the cancellation.' },
  { name: 'Phone – Emergency', description: 'You are a 911 / emergency dispatcher. You stay calm, ask for the caller\'s location, determine the nature of the emergency, provide immediate instructions, and dispatch help.' },
  // Daily Life
  { name: 'Neighbor Chat', description: 'You are a friendly neighbor. You make small talk about the weather, neighborhood events, pets, and weekend plans.' },
  { name: 'Gym', description: 'You are a fitness trainer at a gym. You suggest exercises, correct form, motivate clients, and discuss workout plans.' },
];

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

  /** Tab state */
  const [activeTab, setActiveTab] = useState<VoiceTab>('conversation');

  const [sourceLang, setSourceLang] = useState('en');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  /** Options: which sections to show */
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showBotReply, setShowBotReply] = useState(true);
  const [showSuggestedReply, setShowSuggestedReply] = useState(true);

  /** Contexts (persisted in localStorage) */
  const [contexts, setContexts] = useState<ConversationContext[]>(loadContexts);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_CONTEXT_KEY)
  );
  const selectedContext = contexts.find((c) => c.id === selectedContextId) ?? null;
  const selectedContextRef = useRef(selectedContext);
  selectedContextRef.current = selectedContext;

  // Persist selected context id
  useEffect(() => {
    if (selectedContextId) {
      localStorage.setItem(SELECTED_CONTEXT_KEY, selectedContextId);
    } else {
      localStorage.removeItem(SELECTED_CONTEXT_KEY);
    }
  }, [selectedContextId]);

  /** Change context and clear conversation memory */
  const handleChangeContext = useCallback((id: string | null) => {
    if (id === selectedContextId) return;
    setSelectedContextId(id);
    setUnifiedTurns([]);
  }, [selectedContextId]);

  /** Contexts CRUD */
  const [editingContext, setEditingContext] = useState<ConversationContext | null>(null);
  const [contextFormName, setContextFormName] = useState('');
  const [contextFormDescription, setContextFormDescription] = useState('');
  const handleAddContext = useCallback(() => {
    const name = contextFormName.trim();
    const description = contextFormDescription.trim();
    if (!name) return;
    const newContext: ConversationContext = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      description,
    };
    const updated = [...contexts, newContext];
    setContexts(updated);
    saveContexts(updated);
    setContextFormName('');
    setContextFormDescription('');
    setEditingContext(null);
  }, [contextFormName, contextFormDescription, contexts]);

  const handleUpdateContext = useCallback(() => {
    if (!editingContext) return;
    const name = contextFormName.trim();
    const description = contextFormDescription.trim();
    if (!name) return;
    const updated = contexts.map((c) =>
      c.id === editingContext.id ? { ...c, name, description } : c
    );
    setContexts(updated);
    saveContexts(updated);
    setEditingContext(null);
    setContextFormName('');
    setContextFormDescription('');
  }, [editingContext, contextFormName, contextFormDescription, contexts]);

  const handleDeleteContext = useCallback((id: string) => {
    const updated = contexts.filter((c) => c.id !== id);
    setContexts(updated);
    saveContexts(updated);
    if (selectedContextId === id) {
      handleChangeContext(null);
    }
  }, [contexts, selectedContextId, handleChangeContext]);

  const handleStartEditContext = useCallback((ctx: ConversationContext) => {
    setEditingContext(ctx);
    setContextFormName(ctx.name);
    setContextFormDescription(ctx.description);
  }, []);

  const handleCancelContextForm = useCallback(() => {
    setEditingContext(null);
    setContextFormName('');
    setContextFormDescription('');
  }, []);

  const [showPresets, setShowPresets] = useState(false);

  const handleAddPreset = useCallback((preset: Omit<ConversationContext, 'id'>) => {
    const newContext: ConversationContext = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: preset.name,
      description: preset.description,
    };
    const updated = [...contexts, newContext];
    setContexts(updated);
    saveContexts(updated);
  }, [contexts]);

  const handleAddAllPresets = useCallback(() => {
    const existingNames = new Set(contexts.map((c) => c.name.toLowerCase()));
    const newContexts = PRESET_CONTEXTS
      .filter((p) => !existingNames.has(p.name.toLowerCase()))
      .map((p) => ({
        id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`,
        name: p.name,
        description: p.description,
      }));
    if (newContexts.length === 0) return;
    const updated = [...contexts, ...newContexts];
    setContexts(updated);
    saveContexts(updated);
    setShowPresets(false);
  }, [contexts]);

  const settings = useSelector(settingsStore.settings$);
  const translationStyles = (settings.translationStyles ?? []) as TranslationStyle[];
  const selectedStyle = selectedStyleId
    ? translationStyles.find((s) => s.id === selectedStyleId)
    : null;

  /** Style CRUD state */
  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleName, setStyleName] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);
  const [isAddingCommonStyles, setIsAddingCommonStyles] = useState(false);

  const handleSaveStyle = useCallback(async () => {
    if (!styleName.trim()) { setStyleError('Style name is required'); return; }
    if (!stylePrompt.trim()) { setStyleError('Style description is required'); return; }
    setStyleError(null);
    try {
      if (editingStyleId) {
        await settingsStore.updateTranslationStyle(editingStyleId, { name: styleName.trim(), prompt: stylePrompt.trim() });
      } else {
        await settingsStore.addTranslationStyle({ name: styleName.trim(), prompt: stylePrompt.trim() });
      }
      setIsEditingStyle(false);
      setEditingStyleId(null);
      setStyleName('');
      setStylePrompt('');
    } catch (error) {
      setStyleError(error instanceof Error ? error.message : 'Failed to save style');
    }
  }, [styleName, stylePrompt, editingStyleId]);

  const handleImproveStylePrompt = useCallback(async () => {
    if (!stylePrompt.trim()) { setStyleError('Enter a description first'); return; }
    setIsImprovingPrompt(true);
    setStyleError(null);
    try {
      const gpt = gptService();
      const improved = await gpt.improveStylePrompt(stylePrompt);
      setStylePrompt(improved);
      gpt.close();
    } catch (error) {
      setStyleError(error instanceof Error ? error.message : 'Failed to improve prompt');
    } finally {
      setIsImprovingPrompt(false);
    }
  }, [stylePrompt]);

  const handleEditStyle = useCallback((style: TranslationStyle) => {
    setEditingStyleId(style.id);
    setStyleName(style.name);
    setStylePrompt(style.prompt);
    setIsEditingStyle(true);
    setStyleError(null);
  }, []);

  const handleDeleteStyle = useCallback(async (styleId: string) => {
    await settingsStore.deleteTranslationStyle(styleId);
    if (selectedStyleId === styleId) setSelectedStyleId(null);
  }, [selectedStyleId]);

  const handleCancelStyleEdit = useCallback(() => {
    setIsEditingStyle(false);
    setEditingStyleId(null);
    setStyleName('');
    setStylePrompt('');
    setStyleError(null);
  }, []);

  const handleAddCommonStyles = useCallback(async () => {
    setIsAddingCommonStyles(true);
    setStyleError(null);
    try {
      const existingNames = new Set(translationStyles.map((s) => s.name.toLowerCase()));
      const stylesToAdd = COMMON_STYLES.filter((s) => !existingNames.has(s.name.toLowerCase()));
      if (stylesToAdd.length === 0) { setStyleError('All common styles already exist'); return; }
      for (const style of stylesToAdd) {
        await settingsStore.addTranslationStyle(style);
      }
    } catch (error) {
      setStyleError(error instanceof Error ? error.message : 'Failed to add common styles');
    } finally {
      setIsAddingCommonStyles(false);
    }
  }, [translationStyles]);

  /** Unified list: each turn has You said, Correction, Suggestion, and optionally Bot + Suggested reply */
  const [unifiedTurns, setUnifiedTurns] = useState<UnifiedTurn[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  /** Add vocab modal state */
  const [addVocabText, setAddVocabText] = useState<string | null>(null);
  const [isAddVocabSaving, setIsAddVocabSaving] = useState(false);
  const isAddVocabOpen = addVocabText !== null;

  const handleOpenAddVocab = useCallback((text: string) => {
    setAddVocabText(text);
  }, []);

  const handleCloseAddVocab = useCallback(() => {
    setAddVocabText(null);
    setIsAddVocabSaving(false);
  }, []);

  const handleAddVocabSubmit = useCallback(async (data: Partial<Vocabulary> & VocabFormData) => {
    setIsAddVocabSaving(true);
    try {
      await vocabStore.add({
        text: data.text,
        description: data.description,
        tags: data.tags,
        language: data.language,
        definition: data.definition,
        ipa: data.ipa,
        examples: data.examples,
        partOfSpeech: data.partOfSpeech,
        forms: data.forms,
        extra: data.extra,
        senses: data.senses,
      });
      handleCloseAddVocab();
    } catch (error) {
      console.error('Failed to add vocabulary:', error);
    } finally {
      setIsAddVocabSaving(false);
    }
  }, [handleCloseAddVocab]);

  const conversationRef = useRef<string[]>([]);
  conversationRef.current = unifiedTurns.map((t) => t.userSaid);
  const unifiedTurnsRef = useRef(unifiedTurns);
  unifiedTurnsRef.current = unifiedTurns;
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
        const ctx = selectedContextRef.current;
        const contextPrompt = ctx?.description?.trim();
        // Combine style prompt with context for reply APIs
        const replyStylePrompt = [stylePrompt, contextPrompt ? `You are: ${contextPrompt}` : '']
          .filter(Boolean)
          .join('. ') || undefined;

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

        const pSuggest = wantSuggestion
          ? gpt
              .suggestNextIdeas(historyWithNew, sourceLang)
              .then((suggestions) => updateTurn({ suggestionLines: parseSuggestionLines(suggestions) }))
              .catch(handleErr)
              .finally(() => setIsSuggesting(false))
          : Promise.resolve();

        // Correction runs first; then reply uses the corrected text + conversation history
        const pCorrectAndReply = gpt
          .correctText(segment, sourceLang, sourceLang, stylePrompt) // same language for source & target
          .then((corrected) => {
            updateTurn({ correction: corrected });
            setIsCorrecting(false);

            if (!wantBotReply) return;

            // Build conversation history from previous turns (corrected text + bot replies)
            const prevTurns = conversationRef.current.length > 0
              ? unifiedTurnsRef.current.slice(0, -1) // exclude the placeholder we just added
              : [];
            const history: Array<{ user: string; bot?: string }> = prevTurns.map((t) => ({
              user: t.correction || t.userSaid,
              bot: t.botReply?.text,
            }));
            // Add current turn with corrected text
            history.push({ user: corrected });

            return gpt
              .getConversationReply(history, sourceLang, replyStylePrompt)
              .then((replyText) => {
                updateTurn({
                  botReply: { text: replyText, isBlurred: true },
                });
                if (isSpeechSupported) speak(replyText, sourceLang);
                return wantSuggestedReply
                  ? gpt
                      .getSuggestedReplyToBot(replyText, sourceLang, replyStylePrompt)
                      .then((suggestedReplyText) => {
                        updateTurn({
                          suggestedReply: { text: suggestedReplyText, isBlurred: true },
                        });
                      })
                      .catch(() => {})
                  : undefined;
              })
              .catch(handleErr)
              .finally(() => setIsReplying(false));
          })
          .catch((err) => {
            handleErr(err);
            setIsCorrecting(false);
            setIsReplying(false);
          });

        Promise.allSettled([pCorrectAndReply, pSuggest]).finally(() => gpt.close());
      },
      [sourceLang, selectedStyle?.prompt, isSpeechSupported, speak]
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

  const headerTabs = (
    <div className="flex gap-1">
      <button
        type="button"
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'conversation'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => setActiveTab('conversation')}
      >
        Conversation
      </button>
      <button
        type="button"
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'contexts'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => setActiveTab('contexts')}
      >
        Contexts
      </button>
      <button
        type="button"
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'styles'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => setActiveTab('styles')}
      >
        Styles
      </button>
    </div>
  );

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} headerContent={headerTabs} size="full">

      {/* ── Conversation Tab ── */}
      {activeTab === 'conversation' && (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
          {/* Language */}
          <div>
            <label
              htmlFor={`${selectId}-voice-source`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Language
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

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Style
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedStyleId ?? ''}
                onChange={(e) => setSelectedStyleId(e.target.value || null)}
                disabled={isListening}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">No style</option>
                {translationStyles.map((style) => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setActiveTab('styles')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Manage styles"
                title="Manage styles"
              >
                <Icon name="settings" size="sm" />
              </button>
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
            {/* Context selector (visible when Chat with Bot is on) */}
            {showBotReply && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={selectedContextId ?? ''}
                  onChange={(e) => handleChangeContext(e.target.value || null)}
                  disabled={isListening}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">No context</option>
                  {contexts.map((ctx) => (
                    <option key={ctx.id} value={ctx.id}>{ctx.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab('contexts')}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Manage contexts"
                  title="Manage contexts"
                >
                  <Icon name="settings" size="sm" />
                </button>
              </div>
            )}
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
                                  onClick={() => speak(turn.correction, sourceLang)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Read aloud"
                                >
                                  <Icon name="volume" size="sm" />
                                </button>
                              )}
                              {onTranslate && (
                                <button
                                  type="button"
                                  onClick={() => onTranslate(turn.correction, sourceLang)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Translate"
                                >
                                  <Icon name="translate" size="sm" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenAddVocab(turn.correction)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Add to vocabulary"
                              >
                                <Icon name="plus" size="sm" />
                              </button>
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
                                        onClick={() => speak(line, sourceLang)}
                                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Read aloud"
                                      >
                                        <Icon name="volume" size="sm" />
                                      </button>
                                    )}
                                    {onTranslate && (
                                      <button
                                        type="button"
                                        onClick={() => onTranslate(line, sourceLang)}
                                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Translate"
                                      >
                                        <Icon name="translate" size="sm" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddVocab(line)}
                                      className="p-1 rounded-lg text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                      aria-label="Add to vocabulary"
                                    >
                                      <Icon name="plus" size="sm" />
                                    </button>
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
                                    onClick={() => speak(turn.botReply!.text, sourceLang)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Read aloud"
                                  >
                                    <Icon name="volume" size="sm" />
                                  </button>
                                )}
                                {onTranslate && (
                                  <button
                                    type="button"
                                    onClick={() => onTranslate(turn.botReply!.text, sourceLang)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Translate"
                                  >
                                    <Icon name="translate" size="sm" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddVocab(turn.botReply!.text)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Add to vocabulary"
                                >
                                  <Icon name="plus" size="sm" />
                                </button>
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
                                onClick={() => speak(turn.suggestedReply!.text, sourceLang)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Read aloud"
                              >
                                <Icon name="volume" size="sm" />
                              </button>
                            )}
                            {onTranslate && (
                              <button
                                type="button"
                                onClick={() => onTranslate(turn.suggestedReply!.text, sourceLang)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Translate"
                              >
                                <Icon name="translate" size="sm" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAddVocab(turn.suggestedReply!.text)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              aria-label="Add to vocabulary"
                            >
                              <Icon name="plus" size="sm" />
                            </button>
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
      )}

      {/* ── Contexts Tab ── */}
      {activeTab === 'contexts' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Context form (add / edit) */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {editingContext ? 'Edit Context' : 'New Context'}
              </p>
              <input
                type="text"
                value={contextFormName}
                onChange={(e) => setContextFormName(e.target.value)}
                placeholder="Context name (e.g. Coffee Shop)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={contextFormDescription}
                onChange={(e) => setContextFormDescription(e.target.value)}
                placeholder="Description / role (e.g. You are a barista at a coffee shop. You are friendly and recommend popular drinks.)"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={editingContext ? handleUpdateContext : handleAddContext}
                  disabled={!contextFormName.trim()}
                >
                  {editingContext ? 'Update' : 'Add'}
                </Button>
                {(editingContext || contextFormName || contextFormDescription) && (
                  <Button variant="outline" size="sm" onClick={handleCancelContextForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Add common contexts */}
            <div>
              <button
                type="button"
                onClick={() => setShowPresets((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Icon name={showPresets ? 'chevron-down' : 'chevron-right'} size="sm" />
                Add common contexts
              </button>
              {showPresets && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Click to add individual contexts, or add all at once.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CONTEXTS.map((preset) => {
                      const alreadyAdded = contexts.some((c) => c.name.toLowerCase() === preset.name.toLowerCase());
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => !alreadyAdded && handleAddPreset(preset)}
                          disabled={alreadyAdded}
                          title={preset.description}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            alreadyAdded
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                        >
                          {alreadyAdded ? `${preset.name} ✓` : `+ ${preset.name}`}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddAllPresets}>
                    Add all
                  </Button>
                </div>
              )}
            </div>

            {/* Context list */}
            {contexts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                No contexts yet. Create one above or add common contexts to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {contexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedContextId === ctx.id
                        ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleChangeContext(selectedContextId === ctx.id ? null : ctx.id)}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {ctx.name}
                          {selectedContextId === ctx.id && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">Active</span>
                          )}
                        </p>
                        {ctx.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {ctx.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditContext(ctx)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Edit context"
                        >
                          <Icon name="edit" size="sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContext(ctx.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Delete context"
                        >
                          <Icon name="trash" size="sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Styles Tab ── */}
      {activeTab === 'styles' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {!isEditingStyle ? (
            <>
              {/* Styles List */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Conversation Styles
                </h3>

                {translationStyles.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    No custom styles yet. Create one to personalize your conversations.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {translationStyles.map((style) => (
                      <div
                        key={style.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          selectedStyleId === style.id
                            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setSelectedStyleId(selectedStyleId === style.id ? null : style.id)}
                          >
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {style.name}
                              {selectedStyleId === style.id && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">Active</span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {style.prompt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEditStyle(style)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              aria-label={`Edit ${style.name}`}
                            >
                              <Icon name="edit" size="sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStyle(style.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              aria-label={`Delete ${style.name}`}
                            >
                              <Icon name="trash" size="sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Style Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingStyle(true);
                    setEditingStyleId(null);
                    setStyleName('');
                    setStylePrompt('');
                    setStyleError(null);
                  }}
                  fullWidth
                >
                  <Icon name="plus" size="sm" className="mr-2" />
                  Add New Style
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleAddCommonStyles}
                  disabled={isAddingCommonStyles}
                  loading={isAddingCommonStyles}
                  fullWidth
                >
                  {isAddingCommonStyles ? 'Adding...' : 'Add Common Styles'}
                </Button>
              </div>

              {/* Error Message for Common Styles */}
              {styleError && !isEditingStyle && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{styleError}</p>
                </div>
              )}
            </>
          ) : (
            /* Style Edit Form */
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {editingStyleId ? 'Edit Style' : 'Create New Style'}
              </h3>

              {/* Style Name */}
              <div>
                <label
                  htmlFor={`${selectId}-style-name`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Style Name
                </label>
                <input
                  id={`${selectId}-style-name`}
                  type="text"
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="e.g., Formal Email, Casual Chat"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Style Prompt */}
              <div>
                <label
                  htmlFor={`${selectId}-style-prompt`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Style Description
                </label>
                <textarea
                  id={`${selectId}-style-prompt`}
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="Describe how you want the conversation tone to be, e.g., 'formal business tone' or 'friendly and casual'"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Improve with AI Button */}
              <Button
                variant="secondary"
                onClick={handleImproveStylePrompt}
                disabled={!stylePrompt.trim() || isImprovingPrompt}
                loading={isImprovingPrompt}
                fullWidth
              >
                {isImprovingPrompt ? 'Improving...' : 'Improve with AI'}
              </Button>

              {/* Error Message */}
              {styleError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{styleError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCancelStyleEdit} fullWidth>
                  Cancel
                </Button>
                <Button onClick={handleSaveStyle} fullWidth>
                  {editingStyleId ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Vocab Modal */}
      <ModalLayout
        isOpen={isAddVocabOpen}
        onClose={handleCloseAddVocab}
        title="Add Vocabulary"
        size="full"
        highZIndex
      >
        <div className="flex-1 overflow-y-auto p-4">
          <VocabForm
            onSubmit={handleAddVocabSubmit}
            onCancel={handleCloseAddVocab}
            initialData={addVocabText ? { text: addVocabText, tags: [], language: sourceLang } as unknown as Vocabulary : undefined}
            loading={isAddVocabSaving}
          />
        </div>
      </ModalLayout>
    </ModalLayout>
  );
};
