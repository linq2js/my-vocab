/**
 * Supported GPT provider identifiers.
 * - openai: OpenAI GPT models (GPT-4, GPT-3.5, etc.)
 * - gemini: Google Gemini models
 */
export type GptProviderId = 'openai' | 'gemini';

/**
 * Represents a GPT provider configuration for vocabulary enrichment.
 * 
 * @example
 * ```typescript
 * const provider: GptProvider = {
 *   id: 'openai',
 *   name: 'OpenAI',
 *   apiKey: 'sk-...',
 *   isActive: true,
 * };
 * ```
 */
export interface GptProvider {
  /** Unique identifier for the provider */
  id: GptProviderId;
  
  /** Display name for the provider */
  name: string;
  
  /** API key for authentication (should be encrypted before storage) */
  apiKey: string;
  
  /** Whether this provider is currently active/enabled */
  isActive: boolean;
}

/**
 * Response structure from GPT enrichment API calls.
 * Contains linguistic information about a vocabulary entry.
 * 
 * @example
 * ```typescript
 * const response: GptEnrichmentResponse = {
 *   definition: 'The occurrence of events by chance in a happy way',
 *   ipa: '/ˌserənˈdɪpɪti/',
 *   type: 'noun',
 *   examples: [
 *     'Finding that book was pure serendipity.',
 *     'It was serendipity that we met at the conference.',
 *   ],
 * };
 * ```
 */
export interface GptEnrichmentResponse {
  /** Dictionary definition of the word/phrase */
  definition: string;
  
  /** International Phonetic Alphabet pronunciation */
  ipa: string;
  
  /** Part of speech or content type (noun, verb, idiom, etc.) */
  type: string;
  
  /** Example sentences demonstrating usage */
  examples: string[];
}
