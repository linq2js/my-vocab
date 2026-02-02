/**
 * Translation-related types for MyVocab.
 *
 * These types support the translation feature including:
 * - Translation styles (custom AI prompts for different tones/contexts)
 * - Translation results with caching metadata
 */

/**
 * A custom translation style that defines how translations should be performed.
 *
 * Users can create styles for different contexts like:
 * - Formal email communication
 * - Casual chat messages
 * - Business reports
 * - Academic writing
 *
 * @example
 * ```typescript
 * const formalStyle: TranslationStyle = {
 *   id: 'style-123',
 *   name: 'Formal Email',
 *   prompt: 'Translate using formal business language suitable for professional email correspondence. Use polite tone, avoid contractions.',
 *   createdAt: 1706000000000,
 *   updatedAt: 1706000000000,
 * };
 * ```
 */
export interface TranslationStyle {
  /** Unique identifier for the style */
  id: string;

  /** Display name for the style (e.g., "Formal Email", "Casual Chat") */
  name: string;

  /** AI instruction prompt that describes how to translate (e.g., "Translate in formal business tone") */
  prompt: string;

  /** Timestamp when the style was created */
  createdAt: number;

  /** Timestamp when the style was last updated */
  updatedAt: number;
}

/**
 * Result of a translation operation.
 *
 * Includes the translated text along with caching metadata
 * to support cache indicators in the UI.
 *
 * @example
 * ```typescript
 * const result: TranslateResult = {
 *   text: 'Bonjour le monde',
 *   fromCache: true,
 *   cacheKey: 'translate:en:fr:none:Hello world',
 * };
 * ```
 */
export interface TranslateResult {
  /** The translated text */
  text: string;

  /** Whether this result came from cache */
  fromCache: boolean;

  /** Cache key used for this translation (for clearing specific cache entries) */
  cacheKey: string;
}
