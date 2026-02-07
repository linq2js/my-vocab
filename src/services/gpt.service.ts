/**
 * GPT Service for MyVocab
 *
 * Main service that orchestrates vocabulary enrichment using GPT providers.
 * Handles provider selection based on settings, caching of responses,
 * and retry logic for failed requests.
 *
 * @example
 * ```typescript
 * const gpt = gptService();
 *
 * // Enrich a vocabulary entry
 * const enrichment = await gpt.enrich('serendipity', 'en');
 * console.log(enrichment.definition);
 * console.log(enrichment.ipa);
 *
 * // Clear cached responses
 * await gpt.clearCache();
 *
 * // Close when done
 * gpt.close();
 * ```
 */

import { cacheService, type CacheService } from "./cache.service";
import {
  settingsStorageService,
  type SettingsStorageService,
} from "./settings-storage.service";
import type { IGptProvider } from "./gpt-provider.interface";
import type { GptEnrichmentResponse, GptProviderId } from "../types/gpt";
import type { TranslateResult } from "../types/translation";
import { OpenAIProvider } from "./providers/openai.provider";
import { GeminiProvider } from "./providers/gemini.provider";

/** Default number of retry attempts for failed requests */
const DEFAULT_MAX_RETRIES = 3;

/** Delay between retries in milliseconds (exponential backoff base) */
const RETRY_DELAY_BASE_MS = 1000;

/**
 * Factory function type for creating GPT providers.
 */
export type ProviderFactory = (
  id: GptProviderId,
  apiKey: string
) => IGptProvider;

/**
 * Configuration options for the GPT service.
 */
export interface GptServiceOptions {
  /** Optional cache service instance (for testing) */
  cache?: CacheService;

  /** Optional settings storage instance (for testing) */
  settingsStorage?: SettingsStorageService;

  /** Optional provider factory (for testing) */
  providerFactory?: ProviderFactory;

  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Status of API key configuration for the active provider.
 */
export interface ApiKeyStatus {
  /** Whether the API key is configured (non-empty) */
  isConfigured: boolean;
  /** The active provider ID, or null if none */
  providerId: string | null;
  /** The active provider name, or null if not found */
  providerName: string | null;
}

/**
 * GPT service interface type.
 */
export interface GptService {
  /**
   * Enriches a vocabulary entry with linguistic information.
   * Checks cache first, then calls the active GPT provider.
   *
   * @param text - The word, phrase, or expression to enrich
   * @param language - ISO language code (e.g., 'en', 'es', 'fr')
   * @param extraFields - Optional comma-separated list of extra fields (e.g., 'synonyms, etymology')
   * @returns Promise resolving to enrichment data
   * @throws Error if no provider is configured, API key is missing, or all retries fail
   */
  enrich: (
    text: string,
    language: string,
    extraFields?: string
  ) => Promise<GptEnrichmentResponse>;

  /**
   * Checks if the active provider has an API key configured.
   * Use this before attempting enrichment to show a friendly message.
   *
   * @returns Promise resolving to the API key status
   */
  checkApiKeyStatus: () => Promise<ApiKeyStatus>;

  /**
   * Clears all cached GPT responses.
   *
   * @returns Promise resolving when cache is cleared
   */
  clearCache: () => Promise<void>;

  /**
   * Translates text from one language to another.
   * Checks cache first, then calls the active GPT provider.
   *
   * @param text - The text to translate
   * @param fromLang - Source language code
   * @param toLang - Target language code
   * @param styleId - Optional style ID for cache key
   * @param stylePrompt - Optional style instruction for the AI
   * @param context - Optional context for more accurate translation (hashed for cache key)
   * @returns Promise resolving to translation result with cache metadata
   * @throws Error if no provider is configured, API key is missing, or all retries fail
   */
  translate: (
    text: string,
    fromLang: string,
    toLang: string,
    styleId?: string,
    stylePrompt?: string,
    context?: string
  ) => Promise<TranslateResult>;

  /**
   * Clears a specific translation cache entry.
   *
   * @param cacheKey - The cache key to clear
   * @returns Promise resolving when cache entry is cleared
   */
  clearTranslationCache: (cacheKey: string) => Promise<void>;

  /**
   * Improves a simple style description into a detailed AI instruction prompt.
   *
   * @param description - A simple description of the desired translation style
   * @returns Promise resolving to an improved, detailed prompt
   * @throws Error if no provider is configured or API key is missing
   */
  improveStylePrompt: (description: string) => Promise<string>;

  /**
   * Explains the hidden/deeper meaning of text in the same language.
   * Does not use caching as explanations may vary.
   *
   * @param text - The text to explain
   * @param language - The language of the text (explanation will be in the same language)
   * @returns Promise resolving to the explanation
   * @throws Error if no provider is configured or API key is missing
   */
  explain: (text: string, language: string) => Promise<string>;

  /**
   * Rephrases text in the same language with a specific style/tone.
   * Checks cache first, then calls the active GPT provider.
   *
   * @param text - The text to rephrase
   * @param language - The language of the text
   * @param styleId - Optional style ID for cache key
   * @param stylePrompt - Optional style instruction for the AI
   * @param context - Optional context for more accurate rephrasing (hashed for cache key)
   * @returns Promise resolving to rephrase result with cache metadata
   * @throws Error if no provider is configured, API key is missing, or all retries fail
   */
  rephrase: (
    text: string,
    language: string,
    styleId?: string,
    stylePrompt?: string,
    context?: string
  ) => Promise<TranslateResult>;

  /**
   * Detects the language of a given text.
   *
   * @param text - The text to analyze
   * @returns Promise resolving to the detected language code (e.g., 'en', 'fr')
   * @throws Error if no provider is configured or API key is missing
   */
  detectLanguage: (text: string) => Promise<string>;

  /**
   * Suggests a reply to a message based on the original text and user's idea.
   *
   * @param originalText - The original message/text to reply to
   * @param language - The language for the reply
   * @param userIdea - Optional user's idea or direction for the reply
   * @param stylePrompt - Optional style instruction for the reply tone
   * @returns Promise resolving to the suggested reply
   * @throws Error if no provider is configured or API key is missing
   */
  suggestReply: (
    originalText: string,
    language: string,
    userIdea?: string,
    stylePrompt?: string
  ) => Promise<string>;

  /**
   * Corrects user-spoken or typed text into natural target language with optional style.
   *
   * @param text - Raw text (e.g. from speech) to correct
   * @param sourceLang - Language of the input
   * @param targetLang - Language for the corrected output
   * @param stylePrompt - Optional style instruction
   * @returns Promise resolving to corrected text in target language
   */
  correctText: (
    text: string,
    sourceLang: string,
    targetLang: string,
    stylePrompt?: string
  ) => Promise<string>;

  /**
   * Suggests 2–4 short next things to say based on conversation history.
   *
   * @param conversationHistory - What the user said in this session (chronological)
   * @param language - Language for the suggestions
   * @param contextPrompt - Optional context/scenario description (e.g. "You are a waiter at a restaurant…")
   * @returns Promise resolving to a string with 2–4 suggestions (bulleted or numbered)
   */
  suggestNextIdeas: (conversationHistory: string[], language: string, contextPrompt?: string) => Promise<string>;

  /**
   * Generates a short conversational reply as if the bot is responding to the user.
   *
   * @param conversationHistory - Array of { user, bot? } turns (corrected text)
   * @param language - Language for the reply
   * @param stylePrompt - Optional style/tone
   * @returns Promise resolving to the reply text
   */
  getConversationReply: (
    conversationHistory: Array<{ user: string; bot?: string }>,
    language: string,
    stylePrompt?: string
  ) => Promise<string>;

  /**
   * Suggests a short reply the user could say back to the bot (Type 2 suggestion).
   */
  getSuggestedReplyToBot: (
    botReply: string,
    language: string,
    stylePrompt?: string
  ) => Promise<string>;

  /**
   * Closes the underlying services.
   * Important for cleanup in tests.
   */
  close: () => void;
}

/**
 * Default provider factory that creates provider instances.
 *
 * @param id - The provider identifier
 * @param apiKey - The API key for the provider
 * @returns The provider instance
 */
function defaultProviderFactory(
  id: GptProviderId,
  apiKey: string
): IGptProvider {
  switch (id) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

/**
 * Delays execution for a specified duration.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay for retries.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param baseMs - The base delay in milliseconds
 * @returns The delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, baseMs: number): number {
  // Exponential backoff with jitter: base * 2^attempt + random(0-500)
  const exponentialDelay = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return exponentialDelay + jitter;
}

/**
 * Creates a GPT service for vocabulary enrichment.
 *
 * @param options - Optional configuration options
 * @returns GPT service instance
 */
export function gptService(options: GptServiceOptions = {}): GptService {
  const cache = options.cache ?? cacheService();
  const settingsStorage = options.settingsStorage ?? settingsStorageService();
  const providerFactory = options.providerFactory ?? defaultProviderFactory;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  /**
   * Gets the active provider based on current settings.
   *
   * @returns Promise resolving to the active provider instance
   * @throws Error if no provider is configured or API key is missing
   */
  const getActiveProvider = async (): Promise<IGptProvider> => {
    const settings = await settingsStorage.getSettings();

    if (!settings.activeProviderId || settings.providers.length === 0) {
      throw new Error("No active GPT provider configured");
    }

    const providerConfig = settings.providers.find(
      (p) => p.id === settings.activeProviderId
    );

    if (!providerConfig) {
      throw new Error(`Provider not found: ${settings.activeProviderId}`);
    }

    if (!providerConfig.apiKey) {
      throw new Error(
        `API key not configured for provider: ${providerConfig.id}`
      );
    }

    return providerFactory(providerConfig.id, providerConfig.apiKey);
  };

  /**
   * Enriches a vocabulary entry with retry logic.
   *
   * @param text - The word, phrase, or expression to enrich
   * @param language - ISO language code
   * @param provider - The provider to use
   * @param extraFields - Optional extra fields to request
   * @returns Promise resolving to enrichment data
   * @throws Error if all retries fail
   */
  const enrichWithRetry = async (
    text: string,
    language: string,
    provider: IGptProvider,
    extraFields?: string
  ): Promise<GptEnrichmentResponse> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.enrich(text, language, extraFields);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't delay after the last attempt
        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to enrich vocabulary after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Enriches a vocabulary entry with linguistic information.
   */
  const enrich = async (
    text: string,
    language: string,
    extraFields?: string
  ): Promise<GptEnrichmentResponse> => {
    // Validate inputs
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for enrichment");
    }

    const trimmedLanguage = language.trim();
    if (!trimmedLanguage) {
      throw new Error("Language is required for enrichment");
    }

    const trimmedExtra = extraFields?.trim() || undefined;

    // Check cache first (only for standard enrichment without extra fields)
    // Extra fields are user-specific and shouldn't be cached
    if (!trimmedExtra) {
      const cached = await cache.get(trimmedText, trimmedLanguage);
      if (cached) {
        return cached;
      }
    }

    // Get active provider and enrich
    const provider = await getActiveProvider();
    const response = await enrichWithRetry(
      trimmedText,
      trimmedLanguage,
      provider,
      trimmedExtra
    );

    // Cache the successful response (only standard enrichment)
    if (!trimmedExtra) {
      await cache.set(trimmedText, trimmedLanguage, response);
    }

    return response;
  };

  /**
   * Checks if the active provider has an API key configured.
   */
  const checkApiKeyStatus = async (): Promise<ApiKeyStatus> => {
    const settings = await settingsStorage.getSettings();

    // No active provider configured
    if (!settings.activeProviderId || settings.providers.length === 0) {
      return {
        isConfigured: false,
        providerId: null,
        providerName: null,
      };
    }

    const providerConfig = settings.providers.find(
      (p) => p.id === settings.activeProviderId
    );

    // Provider not found in list
    if (!providerConfig) {
      return {
        isConfigured: false,
        providerId: settings.activeProviderId,
        providerName: null,
      };
    }

    // Check if API key is present
    return {
      isConfigured: Boolean(providerConfig.apiKey),
      providerId: providerConfig.id,
      providerName: providerConfig.name,
    };
  };

  /**
   * Clears all cached responses.
   */
  const clearCache = async (): Promise<void> => {
    await cache.clear();
  };

  /**
   * Simple hash function for context string.
   * Uses djb2 algorithm for fast, consistent hashing.
   */
  const hashString = (str: string): string => {
    if (!str) return "none";
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  };

  /**
   * Generates a cache key for translations.
   */
  const generateTranslationCacheKey = (
    text: string,
    fromLang: string,
    toLang: string,
    styleId?: string,
    context?: string
  ): string => {
    const normalizedText = text.trim().toLowerCase();
    const contextHash = hashString(context?.trim().toLowerCase() || "");
    return `translate:${fromLang}:${toLang}:${styleId || "none"}:${contextHash}:${normalizedText}`;
  };

  /**
   * Translates text with retry logic.
   */
  const translateWithRetry = async (
    text: string,
    fromLang: string,
    toLang: string,
    provider: IGptProvider,
    stylePrompt?: string
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.translate(text, fromLang, toLang, stylePrompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to translate after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Translates text from one language to another.
   */
  const translate = async (
    text: string,
    fromLang: string,
    toLang: string,
    styleId?: string,
    stylePrompt?: string,
    context?: string
  ): Promise<TranslateResult> => {
    // Validate inputs
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for translation");
    }

    const trimmedFromLang = fromLang.trim();
    if (!trimmedFromLang) {
      throw new Error("Source language is required for translation");
    }

    const trimmedToLang = toLang.trim();
    if (!trimmedToLang) {
      throw new Error("Target language is required for translation");
    }

    // Generate cache key (includes context hash)
    const cacheKey = generateTranslationCacheKey(
      trimmedText,
      trimmedFromLang,
      trimmedToLang,
      styleId,
      context
    );

    // Check cache first
    const cached = await cache.getTranslation(cacheKey);
    if (cached) {
      return {
        text: cached,
        fromCache: true,
        cacheKey,
      };
    }

    // Get active provider and translate
    const provider = await getActiveProvider();
    const translatedText = await translateWithRetry(
      trimmedText,
      trimmedFromLang,
      trimmedToLang,
      provider,
      stylePrompt
    );

    // Cache the result
    await cache.setTranslation(cacheKey, translatedText);

    return {
      text: translatedText,
      fromCache: false,
      cacheKey,
    };
  };

  /**
   * Clears a specific translation cache entry.
   */
  const clearTranslationCache = async (cacheKey: string): Promise<void> => {
    await cache.deleteTranslation(cacheKey);
  };

  /**
   * Improves a style prompt with retry logic.
   */
  const improveStylePromptWithRetry = async (
    description: string,
    provider: IGptProvider
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.improveStylePrompt(description);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to improve style prompt after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Improves a simple style description into a detailed AI instruction prompt.
   */
  const improveStylePrompt = async (description: string): Promise<string> => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      throw new Error("Description is required");
    }

    const provider = await getActiveProvider();
    return improveStylePromptWithRetry(trimmedDescription, provider);
  };

  /**
   * Explains text with retry logic.
   */
  const explainWithRetry = async (
    text: string,
    language: string,
    provider: IGptProvider
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.explain(text, language);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to explain text after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Generates a cache key for rephrase results.
   */
  const generateRephraseCacheKey = (
    text: string,
    language: string,
    styleId?: string,
    context?: string
  ): string => {
    const normalizedText = text.trim().toLowerCase();
    const contextHash = hashString(context?.trim().toLowerCase() || "");
    return `rephrase:${language}:${styleId || "none"}:${contextHash}:${normalizedText}`;
  };

  /**
   * Rephrases text with retry logic.
   */
  const rephraseWithRetry = async (
    text: string,
    language: string,
    provider: IGptProvider,
    stylePrompt?: string,
    context?: string
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.rephrase(text, language, stylePrompt, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to rephrase text after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Explains the hidden/deeper meaning of text in the same language.
   * Does not use caching as explanations may vary.
   */
  const explain = async (text: string, language: string): Promise<string> => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for explanation");
    }

    const trimmedLanguage = language.trim();
    if (!trimmedLanguage) {
      throw new Error("Language is required for explanation");
    }

    // No caching for explanations
    const provider = await getActiveProvider();
    return explainWithRetry(trimmedText, trimmedLanguage, provider);
  };

  /**
   * Rephrases text in the same language with a specific style/tone.
   */
  const rephrase = async (
    text: string,
    language: string,
    styleId?: string,
    stylePrompt?: string,
    context?: string
  ): Promise<TranslateResult> => {
    // Validate inputs
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for rephrasing");
    }

    const trimmedLanguage = language.trim();
    if (!trimmedLanguage) {
      throw new Error("Language is required for rephrasing");
    }

    // Generate cache key (includes context hash)
    const cacheKey = generateRephraseCacheKey(
      trimmedText,
      trimmedLanguage,
      styleId,
      context
    );

    // Check cache first
    const cached = await cache.getTranslation(cacheKey);
    if (cached) {
      return {
        text: cached,
        fromCache: true,
        cacheKey,
      };
    }

    // Get active provider and rephrase
    const provider = await getActiveProvider();
    const rephrasedText = await rephraseWithRetry(
      trimmedText,
      trimmedLanguage,
      provider,
      stylePrompt,
      context
    );

    // Cache the result
    await cache.setTranslation(cacheKey, rephrasedText);

    return {
      text: rephrasedText,
      fromCache: false,
      cacheKey,
    };
  };

  /**
   * Detects language with retry logic.
   */
  const detectLanguageWithRetry = async (
    text: string,
    provider: IGptProvider
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.detectLanguage(text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to detect language after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Detects the language of a given text.
   */
  const detectLanguage = async (text: string): Promise<string> => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for language detection");
    }

    const provider = await getActiveProvider();
    return detectLanguageWithRetry(trimmedText, provider);
  };

  /**
   * Suggests a reply with retry logic.
   */
  const suggestReplyWithRetry = async (
    originalText: string,
    language: string,
    provider: IGptProvider,
    userIdea?: string,
    stylePrompt?: string
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.suggestReply(originalText, language, userIdea, stylePrompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delayMs = calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS);
          await delay(delayMs);
        }
      }
    }

    throw new Error(
      `Failed to suggest reply after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Suggests a reply to a message based on the original text and user's idea.
   */
  const suggestReply = async (
    originalText: string,
    language: string,
    userIdea?: string,
    stylePrompt?: string
  ): Promise<string> => {
    const trimmedText = originalText.trim();
    if (!trimmedText) {
      throw new Error("Original text is required for reply suggestion");
    }

    const trimmedLanguage = language.trim();
    if (!trimmedLanguage) {
      throw new Error("Language is required for reply suggestion");
    }

    const provider = await getActiveProvider();
    return suggestReplyWithRetry(
      trimmedText,
      trimmedLanguage,
      provider,
      userIdea?.trim(),
      stylePrompt?.trim()
    );
  };

  /**
   * Corrects user-spoken or typed text into natural target language.
   */
  const correctText = async (
    text: string,
    sourceLang: string,
    targetLang: string,
    stylePrompt?: string
  ): Promise<string> => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text is required for correction");
    }
    const provider = await getActiveProvider();
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.correctText(
          trimmedText,
          sourceLang.trim(),
          targetLang.trim(),
          stylePrompt?.trim()
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await delay(calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS));
        }
      }
    }
    throw new Error(
      `Failed to correct text after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Suggests 2–4 short next things to say based on conversation history.
   */
  const suggestNextIdeas = async (
    conversationHistory: string[],
    language: string,
    contextPrompt?: string
  ): Promise<string> => {
    const provider = await getActiveProvider();
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.suggestNextIdeas(
          conversationHistory,
          language.trim(),
          contextPrompt?.trim()
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await delay(calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS));
        }
      }
    }
    throw new Error(
      `Failed to suggest next ideas after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Generates a short conversational reply using the full conversation history.
   */
  const getConversationReply = async (
    conversationHistory: Array<{ user: string; bot?: string }>,
    language: string,
    stylePrompt?: string
  ): Promise<string> => {
    if (!conversationHistory.length) {
      throw new Error('Conversation history is required for conversation reply');
    }
    const provider = await getActiveProvider();
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.getConversationReply(
          conversationHistory,
          language.trim(),
          stylePrompt?.trim()
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await delay(calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS));
        }
      }
    }
    throw new Error(
      `Failed to get conversation reply after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Suggests a short reply the user could say back to the bot (Type 2 suggestion).
   */
  const getSuggestedReplyToBot = async (
    botReply: string,
    language: string,
    stylePrompt?: string
  ): Promise<string> => {
    const trimmed = botReply.trim();
    if (!trimmed) {
      throw new Error('Bot reply is required for suggested reply');
    }
    const provider = await getActiveProvider();
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.getSuggestedReplyToBot(
          trimmed,
          language.trim(),
          stylePrompt?.trim()
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await delay(calculateBackoffDelay(attempt, RETRY_DELAY_BASE_MS));
        }
      }
    }
    throw new Error(
      `Failed to get suggested reply to bot after ${maxRetries} attempts: ${lastError?.message}`
    );
  };

  /**
   * Closes the underlying services.
   */
  const close = (): void => {
    cache.close();
  };

  return {
    enrich,
    checkApiKeyStatus,
    clearCache,
    translate,
    clearTranslationCache,
    improveStylePrompt,
    explain,
    rephrase,
    detectLanguage,
    suggestReply,
    correctText,
    suggestNextIdeas,
    getConversationReply,
    getSuggestedReplyToBot,
    close,
  };
}
