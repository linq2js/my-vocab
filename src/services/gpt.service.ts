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
   * Closes the underlying services.
   */
  const close = (): void => {
    cache.close();
  };

  return {
    enrich,
    checkApiKeyStatus,
    clearCache,
    close,
  };
}
