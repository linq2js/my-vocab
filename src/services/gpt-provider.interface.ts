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
   * @returns Promise resolving to enrichment data including definition, IPA, type, and examples
   * @throws Error if the API call fails or returns invalid data
   *
   * @example
   * ```typescript
   * const result = await provider.enrich('serendipity', 'en');
   * console.log(result.definition); // 'The occurrence of events by chance...'
   * console.log(result.ipa); // '/ˌserənˈdɪpɪti/'
   * ```
   */
  enrich(text: string, language: string): Promise<GptEnrichmentResponse>;
}
