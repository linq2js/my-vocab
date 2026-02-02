/**
 * TranslateModal component for MyVocab.
 *
 * A modal dialog with two tabs:
 * - Translate: Quick translation with style selection
 * - Styles: CRUD interface for custom translation styles
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TranslateModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
 *
 * // With pre-filled text (from VocabCard)
 * <TranslateModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   initialText="hello"
 *   initialSourceLang="en"
 *   autoTranslate
 * />
 * ```
 */

import React, { useState, useEffect, useCallback, useId, useRef } from "react";
import { useSelector } from "atomirx/react";
import { ModalLayout } from "../templates/ModalLayout";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { LANGUAGES } from "../../constants/languages";
import { settingsStore } from "../../stores/settings.store";
import { gptService } from "../../services/gpt.service";
import { useSpeech } from "../../hooks";
import type { TranslationStyle, TranslateResult } from "../../types/translation";

/**
 * Props for the TranslateModal component
 */
export interface TranslateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Pre-fill source text (from VocabCard) */
  initialText?: string;
  /** Pre-fill source language (from VocabCard) */
  initialSourceLang?: string;
  /** If true, translate immediately when modal opens with initial values */
  autoTranslate?: boolean;
}

type TabType = "translate" | "styles";

/**
 * Common translation styles that can be added with one click.
 */
const COMMON_STYLES = [
  {
    name: "Formal",
    prompt: "Translate in a formal, professional tone. Use polite language, avoid contractions, and maintain a business-appropriate style.",
  },
  {
    name: "Casual",
    prompt: "Translate in a casual, friendly tone. Use conversational language, contractions are okay, keep it relaxed and approachable.",
  },
  {
    name: "Simple",
    prompt: "Translate using simple, easy-to-understand language. Avoid complex vocabulary, use short sentences, suitable for beginners.",
  },
  {
    name: "Poetic",
    prompt: "Translate with a poetic, literary style. Use expressive language, metaphors when appropriate, and maintain aesthetic beauty.",
  },
  {
    name: "Technical",
    prompt: "Translate with precise technical terminology. Maintain accuracy, use domain-specific terms, be concise and clear.",
  },
];

/**
 * TranslateModal component - translation tool with style management.
 */
export const TranslateModal = ({
  isOpen,
  onClose,
  initialText = "",
  initialSourceLang = "",
  autoTranslate = false,
}: TranslateModalProps): React.ReactElement | null => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("translate");

  // Translation state
  const [sourceText, setSourceText] = useState("");
  const [context, setContext] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("en");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [translationResult, setTranslationResult] =
    useState<TranslateResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Explanation state
  const [explanationResult, setExplanationResult] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Style editing state
  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleName, setStyleName] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);
  const [isAddingCommonStyles, setIsAddingCommonStyles] = useState(false);

  // Clear cache confirmation
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  // Textarea refs for auto-resize
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs for scrolling to results
  const translationResultRef = useRef<HTMLDivElement>(null);
  const explanationResultRef = useRef<HTMLDivElement>(null);

  // Get settings from store
  const settings = useSelector(settingsStore.settings$);
  const nativeLanguage = settings.nativeLanguage || "en";
  const translationStyles = settings.translationStyles || [];

  // Speech synthesis for read aloud
  const { speak, isSupported: isSpeechSupported } = useSpeech();

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen) {
      // Set initial values
      setSourceText(initialText);
      setContext("");
      setSourceLang(initialSourceLang || "en");
      setTargetLang(nativeLanguage);
      setSelectedStyleId(null);
      setTranslationResult(null);
      setTranslationError(null);
      setExplanationResult(null);
      setActiveTab("translate");
      setIsEditingStyle(false);

      // Auto-translate if requested and we have text
      if (autoTranslate && initialText && initialSourceLang) {
        handleTranslate(initialText, initialSourceLang, nativeLanguage, null);
      }
    }
  }, [isOpen, initialText, initialSourceLang, nativeLanguage, autoTranslate]);

  // Auto-resize textarea when sourceText changes (including initial value)
  useEffect(() => {
    if (textareaRef.current && sourceText) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [sourceText]);

  // Auto-resize context textarea when context changes
  useEffect(() => {
    if (contextTextareaRef.current && context) {
      const textarea = contextTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [context]);

  /**
   * Handle translation
   */
  const handleTranslate = useCallback(
    async (
      text: string = sourceText,
      from: string = sourceLang,
      to: string = targetLang,
      styleId: string | null = selectedStyleId,
      translationContext: string = context
    ) => {
      if (!text.trim()) {
        setTranslationError("Please enter text to translate");
        return;
      }

      if (from === to) {
        setTranslationError("Source and target languages must be different");
        return;
      }

      setIsTranslating(true);
      setTranslationError(null);
      setTranslationResult(null);

      try {
        const gpt = gptService();
        const style = styleId
          ? translationStyles.find((s) => s.id === styleId)
          : null;

        // Build the prompt with style and context
        let fullPrompt = style?.prompt || "";
        if (translationContext.trim()) {
          const contextInstruction = `Context for translation: ${translationContext.trim()}`;
          fullPrompt = fullPrompt
            ? `${fullPrompt}. ${contextInstruction}`
            : contextInstruction;
        }

        const result = await gpt.translate(
          text,
          from,
          to,
          styleId || undefined,
          fullPrompt || undefined,
          translationContext || undefined  // Pass context for cache key
        );

        setTranslationResult(result);
        gpt.close();
        
        // Scroll to result after a brief delay to ensure DOM update
        setTimeout(() => {
          translationResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } catch (error) {
        setTranslationError(
          error instanceof Error ? error.message : "Translation failed"
        );
      } finally {
        setIsTranslating(false);
      }
    },
    [sourceText, sourceLang, targetLang, selectedStyleId, translationStyles, context]
  );

  /**
   * Handle swap languages
   */
  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    // Clear result when swapping
    setTranslationResult(null);
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async () => {
    if (!translationResult?.text) return;

    try {
      await navigator.clipboard.writeText(translationResult.text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = translationResult.text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  /**
   * Handle read aloud (text-to-speech)
   */
  const handleSpeak = () => {
    if (!translationResult?.text || !isSpeechSupported) return;
    speak(translationResult.text, targetLang);
  };

  /**
   * Handle explain - get AI explanation of the source text's hidden meaning
   */
  const handleExplain = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslationError("Please enter text to explain");
      return;
    }

    setIsExplaining(true);
    setTranslationError(null);
    setExplanationResult(null);
    setTranslationResult(null);

    try {
      const gpt = gptService();
      const explanation = await gpt.explain(sourceText, sourceLang);
      setExplanationResult(explanation);
      gpt.close();
      
      // Scroll to result after a brief delay to ensure DOM update
      setTimeout(() => {
        explanationResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (error) {
      setTranslationError(
        error instanceof Error ? error.message : "Explanation failed"
      );
    } finally {
      setIsExplaining(false);
    }
  }, [sourceText, sourceLang]);

  /**
   * Handle clear cache
   */
  const handleClearCache = async () => {
    if (!translationResult?.cacheKey) return;

    try {
      const gpt = gptService();
      await gpt.clearTranslationCache(translationResult.cacheKey);
      gpt.close();
      setShowClearCacheConfirm(false);
      // Re-translate
      handleTranslate();
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  /**
   * Handle add/edit style
   */
  const handleSaveStyle = async () => {
    if (!styleName.trim()) {
      setStyleError("Style name is required");
      return;
    }
    if (!stylePrompt.trim()) {
      setStyleError("Style description is required");
      return;
    }

    setStyleError(null);

    try {
      if (editingStyleId) {
        await settingsStore.updateTranslationStyle(editingStyleId, {
          name: styleName.trim(),
          prompt: stylePrompt.trim(),
        });
      } else {
        await settingsStore.addTranslationStyle({
          name: styleName.trim(),
          prompt: stylePrompt.trim(),
        });
      }

      // Reset form
      setIsEditingStyle(false);
      setEditingStyleId(null);
      setStyleName("");
      setStylePrompt("");
    } catch (error) {
      setStyleError(
        error instanceof Error ? error.message : "Failed to save style"
      );
    }
  };

  /**
   * Handle improve prompt with AI
   */
  const handleImprovePrompt = async () => {
    if (!stylePrompt.trim()) {
      setStyleError("Enter a description first");
      return;
    }

    setIsImprovingPrompt(true);
    setStyleError(null);

    try {
      const gpt = gptService();
      const improved = await gpt.improveStylePrompt(stylePrompt);
      setStylePrompt(improved);
      gpt.close();
    } catch (error) {
      setStyleError(
        error instanceof Error ? error.message : "Failed to improve prompt"
      );
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  /**
   * Handle edit style
   */
  const handleEditStyle = (style: TranslationStyle) => {
    setEditingStyleId(style.id);
    setStyleName(style.name);
    setStylePrompt(style.prompt);
    setIsEditingStyle(true);
    setStyleError(null);
  };

  /**
   * Handle delete style
   */
  const handleDeleteStyle = async (styleId: string) => {
    await settingsStore.deleteTranslationStyle(styleId);
    if (selectedStyleId === styleId) {
      setSelectedStyleId(null);
    }
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setIsEditingStyle(false);
    setEditingStyleId(null);
    setStyleName("");
    setStylePrompt("");
    setStyleError(null);
  };

  /**
   * Handle add common styles
   * Adds predefined common styles that don't already exist
   */
  const handleAddCommonStyles = async () => {
    setIsAddingCommonStyles(true);
    setStyleError(null);

    try {
      const existingNames = new Set(
        translationStyles.map((s) => s.name.toLowerCase())
      );

      // Filter out styles that already exist (by name)
      const stylesToAdd = COMMON_STYLES.filter(
        (style) => !existingNames.has(style.name.toLowerCase())
      );

      if (stylesToAdd.length === 0) {
        setStyleError("All common styles already exist");
        return;
      }

      // Add each style
      for (const style of stylesToAdd) {
        await settingsStore.addTranslationStyle(style);
      }
    } catch (error) {
      setStyleError(
        error instanceof Error ? error.message : "Failed to add common styles"
      );
    } finally {
      setIsAddingCommonStyles(false);
    }
  };

  const selectId = useId();

  /**
   * Auto-resize textarea based on content
   */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(e.target.value);
    // Don't clear translation result while typing - user can see previous result
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  /**
   * Auto-resize context textarea based on content
   */
  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const headerTabs = (
    <div className="flex gap-1">
      <button
        type="button"
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
          activeTab === "translate"
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        onClick={() => setActiveTab("translate")}
      >
        Translate
      </button>
      <button
        type="button"
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
          activeTab === "styles"
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        onClick={() => setActiveTab("styles")}
      >
        Styles
      </button>
    </div>
  );

  return (
    <ModalLayout isOpen={isOpen} onClose={onClose} headerContent={headerTabs} size="full">

      {/* Translate Tab */}
      {activeTab === "translate" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
            {/* Language Selection */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label
                  htmlFor={`${selectId}-from`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From
                </label>
                <select
                  id={`${selectId}-from`}
                  value={sourceLang}
                  onChange={(e) => {
                    setSourceLang(e.target.value);
                    setTranslationResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSwapLanguages}
                className="mt-6 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Swap languages"
              >
                <Icon name="refresh" size="md" />
              </button>

              <div className="flex-1">
                <label
                  htmlFor={`${selectId}-to`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To
                </label>
                <select
                  id={`${selectId}-to`}
                  value={targetLang}
                  onChange={(e) => {
                    setTargetLang(e.target.value);
                    setTranslationResult(null);
                  }}
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

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Style
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStyleId(null);
                    setTranslationResult(null);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedStyleId === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  No Style
                </button>
                {translationStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setSelectedStyleId(style.id);
                      setTranslationResult(null);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedStyleId === style.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("styles");
                    setIsEditingStyle(true);
                    setEditingStyleId(null);
                    setStyleName("");
                    setStylePrompt("");
                  }}
                  className="px-3 py-1.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Add new style"
                >
                  <Icon name="plus" size="sm" />
                </button>
              </div>
            </div>

            {/* Source Text Input */}
            <div>
              <label
                htmlFor={`${selectId}-text`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Text to translate
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id={`${selectId}-text`}
                  value={sourceText}
                  onChange={handleTextareaChange}
                  placeholder="Enter text to translate..."
                  rows={2}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden"
                  style={{ minHeight: '60px', maxHeight: '200px' }}
                />
                {sourceText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceText("");
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Clear text"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setSourceText(text);
                          if (textareaRef.current) {
                            textareaRef.current.style.height = 'auto';
                            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                          }
                        }
                      } catch {
                        // Clipboard access denied or not available
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Paste from clipboard"
                  >
                    <Icon name="clipboard" size="sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Context Input */}
            <div>
              <label
                htmlFor={`${selectId}-context`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Context
                <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  (optional)
                </span>
              </label>
              <div className="relative">
                <textarea
                  ref={contextTextareaRef}
                  id={`${selectId}-context`}
                  value={context}
                  onChange={handleContextChange}
                  placeholder="e.g., topic, background info..."
                  rows={1}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden text-sm leading-5"
                  style={{ minHeight: '38px', maxHeight: '150px' }}
                />
                {context ? (
                  <button
                    type="button"
                    onClick={() => {
                      setContext("");
                      if (contextTextareaRef.current) {
                        contextTextareaRef.current.style.height = 'auto';
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Clear context"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setContext(text);
                          if (contextTextareaRef.current) {
                            contextTextareaRef.current.style.height = 'auto';
                            contextTextareaRef.current.style.height = `${Math.min(contextTextareaRef.current.scrollHeight, 150)}px`;
                          }
                        }
                      } catch {
                        // Clipboard access denied or not available
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Paste from clipboard"
                  >
                    <Icon name="clipboard" size="sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {translationError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {translationError}
                </p>
              </div>
            )}

            {/* Translation Result */}
            {translationResult && (
              <div ref={translationResultRef} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Translation
                  </span>
                  <div className="flex items-center gap-2">
                    {translationResult.fromCache && (
                      <button
                        type="button"
                        onClick={() => setShowClearCacheConfirm(true)}
                        className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title="Click to clear cache and re-translate"
                      >
                        cached
                      </button>
                    )}
                    {isSpeechSupported && (
                      <button
                        type="button"
                        onClick={handleSpeak}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        aria-label="Read aloud"
                      >
                        <Icon name="volume" size="sm" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Copy translation"
                    >
                      {copySuccess ? (
                        <Icon name="check" size="sm" color="success" />
                      ) : (
                        <Icon name="copy" size="sm" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {translationResult.text}
                </p>
              </div>
            )}

            {/* Explanation Result */}
            {explanationResult && (
              <div ref={explanationResultRef} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Explanation
                  </span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {explanationResult}
                </p>
              </div>
            )}
          </div>

          {/* Fixed Bottom Bar with Explain and Translate Buttons */}
          <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleExplain}
                disabled={!sourceText.trim() || isTranslating || isExplaining}
                loading={isExplaining}
                fullWidth
              >
                {isExplaining ? "Explaining..." : "Explain"}
              </Button>
              <Button
                onClick={() => handleTranslate()}
                disabled={!sourceText.trim() || isTranslating || isExplaining}
                loading={isTranslating}
                fullWidth
              >
                {isTranslating ? "Translating..." : "Translate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Styles Tab */}
      {activeTab === "styles" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {!isEditingStyle ? (
            <>
              {/* Styles List */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Translation Styles
                </h3>

                {translationStyles.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    No custom styles yet. Create one to personalize your
                    translations.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {translationStyles.map((style) => (
                      <div
                        key={style.id}
                        className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {style.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {style.prompt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEditStyle(style)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              aria-label={`Edit ${style.name}`}
                            >
                              <Icon name="edit" size="sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStyle(style.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
                    setStyleName("");
                    setStylePrompt("");
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
                  {isAddingCommonStyles ? "Adding..." : "Add Common Styles"}
                </Button>
              </div>

              {/* Error Message for Common Styles */}
              {styleError && !isEditingStyle && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {styleError}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Style Edit Form */
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {editingStyleId ? "Edit Style" : "Create New Style"}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  placeholder="Describe how you want translations to sound, e.g., 'formal business tone' or 'friendly and casual'"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Improve with AI Button */}
              <Button
                variant="secondary"
                onClick={handleImprovePrompt}
                disabled={!stylePrompt.trim() || isImprovingPrompt}
                loading={isImprovingPrompt}
                fullWidth
              >
                {isImprovingPrompt ? "Improving..." : "Improve with AI"}
              </Button>

              {/* Error Message */}
              {styleError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {styleError}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCancelEdit} fullWidth>
                  Cancel
                </Button>
                <Button onClick={handleSaveStyle} fullWidth>
                  {editingStyleId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear Cache Confirmation Dialog */}
      {showClearCacheConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Clear Cached Translation?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will remove the cached result and fetch a fresh translation.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleClearCache} fullWidth>
                Clear & Re-translate
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowClearCacheConfirm(false)}
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalLayout>
  );
};
