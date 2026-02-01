/**
 * GPT Cache Service for MyVocab
 *
 * Provides a high-level caching interface for GPT enrichment responses.
 * Uses IndexedDB via the storage service for persistent caching.
 * Cache keys are generated in the format {word}_{language} for efficient lookups.
 *
 * @example
 * ```typescript
 * const cache = cacheService();
 *
 * // Check if response is cached
 * if (await cache.has('serendipity', 'en')) {
 *   const response = await cache.get('serendipity', 'en');
 * }
 *
 * // Cache a new response
 * await cache.set('serendipity', 'en', enrichmentResponse);
 *
 * // Clear all cached responses
 * await cache.clear();
 *
 * // Close connection when done
 * cache.close();
 * ```
 */

import { storageService, type StorageService } from "./storage.service";
import type { GptEnrichmentResponse } from "../types/gpt";

/**
 * Cache service interface type.
 */
export interface CacheService {
  /**
   * Retrieves a cached GPT enrichment response.
   *
   * @param word - The word or phrase to look up
   * @param language - The language code (e.g., 'en', 'es')
   * @returns Promise resolving to the cached response or undefined if not found
   */
  get: (
    word: string,
    language: string
  ) => Promise<GptEnrichmentResponse | undefined>;

  /**
   * Caches a GPT enrichment response.
   *
   * @param word - The word or phrase being cached
   * @param language - The language code (e.g., 'en', 'es')
   * @param response - The GPT enrichment response to cache
   * @returns Promise resolving when caching is complete
   */
  set: (
    word: string,
    language: string,
    response: GptEnrichmentResponse
  ) => Promise<void>;

  /**
   * Checks if a cache entry exists for the given word and language.
   *
   * @param word - The word or phrase to check
   * @param language - The language code (e.g., 'en', 'es')
   * @returns Promise resolving to true if cached, false otherwise
   */
  has: (word: string, language: string) => Promise<boolean>;

  /**
   * Clears all cached GPT responses.
   *
   * @returns Promise resolving when cache is cleared
   */
  clear: () => Promise<void>;

  /**
   * Closes the underlying database connection.
   * Important for cleanup in tests.
   */
  close: () => void;
}

/**
 * Generates a cache key from word and language.
 * Normalizes inputs by converting to lowercase and trimming whitespace.
 *
 * @param word - The word or phrase
 * @param language - The language code
 * @returns Cache key in format {word}_{language}
 *
 * @example
 * ```typescript
 * generateCacheKey('Hello', 'EN'); // Returns 'hello_en'
 * generateCacheKey('  break down  ', 'en'); // Returns 'break down_en'
 * ```
 */
export function generateCacheKey(word: string, language: string): string {
  const normalizedWord = word.trim().toLowerCase();
  const normalizedLanguage = language.toLowerCase();
  return `${normalizedWord}_${normalizedLanguage}`;
}

/**
 * Creates a cache service for GPT enrichment responses.
 * Wraps the storage service with a simpler API focused on caching.
 *
 * @param storage - Optional storage service instance (for testing)
 * @returns Cache service instance
 */
export function cacheService(storage?: StorageService): CacheService {
  const storageInstance = storage ?? storageService();

  /**
   * Retrieves a cached GPT enrichment response.
   */
  const get = async (
    word: string,
    language: string
  ): Promise<GptEnrichmentResponse | undefined> => {
    const key = generateCacheKey(word, language);
    return storageInstance.getCachedGptResponse(key);
  };

  /**
   * Caches a GPT enrichment response.
   */
  const set = async (
    word: string,
    language: string,
    response: GptEnrichmentResponse
  ): Promise<void> => {
    const key = generateCacheKey(word, language);
    await storageInstance.cacheGptResponse(key, response);
  };

  /**
   * Checks if a cache entry exists.
   */
  const has = async (word: string, language: string): Promise<boolean> => {
    const response = await get(word, language);
    return response !== undefined;
  };

  /**
   * Clears all cached responses.
   */
  const clear = async (): Promise<void> => {
    await storageInstance.clearGptCache();
  };

  /**
   * Closes the database connection.
   */
  const close = (): void => {
    storageInstance.close();
  };

  return {
    get,
    set,
    has,
    clear,
    close,
  };
}
