/**
 * Abstract interface for GPT providers.
 * Defines the contract that all GPT provider implementations must follow.
 *
 * This interface enables the provider pattern for vocabulary enrichment,
 * allowing seamless switching between OpenAI and Gemini providers.
 *
 * @example
 * ```typescript
 * // Implementing the interface
 * class OpenAIProvider implements IGptProvider {
 *   readonly providerId = 'openai';
 *
 *   async enrich(text: string, language: string): Promise<GptEnrichmentResponse> {
 *     // OpenAI-specific implementation
 *   }
 * }
 *
 * // Using the interface
 * const provider: IGptProvider = new OpenAIProvider();
 * const enrichment = await provider.enrich('serendipity', 'en');
 * ```
 */

import type { GptEnrichmentResponse, GptProviderId } from '../types/gpt';

/**
 * Request parameters for vocabulary enrichment.
 */
export interface GptEnrichmentRequest {
  /** The word, phrase, or expression to enrich */
  text: string;

  /** ISO language code (e.g., 'en', 'es', 'fr') */
  language: string;

  /** Optional content type hint for better enrichment */
  contentType?: 'vocabulary' | 'idiom' | 'phrasal-verb' | 'quote';
}

/**
 * Abstract interface for GPT provider implementations.
 * All GPT providers (OpenAI, Gemini, etc.) must implement this interface.
 */
export interface IGptProvider {
  /** The unique identifier for this provider */
  readonly providerId: GptProviderId;

  /**
   * Enriches a vocabulary entry with linguistic information.
   *
   * @param text - The word, phrase, or expression to enrich
   * @param language - ISO language code (e.g., 'en', 'es', 'fr')
   * @param extraFields - Optional comma-separated list of extra fields to request (e.g., 'synonyms, etymology')
   * @returns Promise resolving to enrichment data including definition, IPA, type, and examples
   * @throws Error if the API call fails or returns invalid data
   *
   * @example
   * ```typescript
   * // Basic enrichment
   * const result = await provider.enrich('serendipity', 'en');
   * console.log(result.definition); // 'The occurrence of events by chance...'
   *
   * // With extra fields
   * const result = await provider.enrich('serendipity', 'en', 'synonyms, etymology');
   * console.log(result.extra?.synonyms); // 'luck, fortune, chance'
   * ```
   */
  enrich(text: string, language: string, extraFields?: string): Promise<GptEnrichmentResponse>;

  /**
   * Translates text from one language to another.
   *
   * @param text - The text to translate
   * @param fromLang - Source language code (e.g., 'en')
   * @param toLang - Target language code (e.g., 'fr')
   * @param stylePrompt - Optional style instruction (e.g., 'Use formal business tone')
   * @returns Promise resolving to the translated text
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const translation = await provider.translate('Hello world', 'en', 'fr');
   * console.log(translation); // 'Bonjour le monde'
   *
   * // With style
   * const formal = await provider.translate('Hello', 'en', 'fr', 'Use formal tone');
   * console.log(formal); // 'Bonjour' or 'Salutations'
   * ```
   */
  translate(text: string, fromLang: string, toLang: string, stylePrompt?: string): Promise<string>;

  /**
   * Improves a simple style description into a detailed AI instruction prompt.
   *
   * @param description - A simple description of the desired translation style (e.g., 'formal email')
   * @returns Promise resolving to an improved, detailed prompt
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const improved = await provider.improveStylePrompt('formal email');
   * console.log(improved);
   * // 'Translate using formal business language suitable for professional email
   * //  correspondence. Use polite tone, avoid contractions, maintain professional register.'
   * ```
   */
  improveStylePrompt(description: string): Promise<string>;
}
