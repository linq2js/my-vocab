/**
 * Content type classification for vocabulary entries.
 * - vocabulary: Single word or term
 * - idiom: Idiomatic expression
 * - phrasal-verb: Verb + particle combination
 * - quote: Memorable quote or saying
 */
export type ContentType = 'vocabulary' | 'idiom' | 'phrasal-verb' | 'quote';

/**
 * Represents a vocabulary entry in the application.
 * 
 * @example
 * ```typescript
 * const vocab: Vocabulary = {
 *   id: 'abc123',
 *   text: 'serendipity',
 *   description: 'A happy accident',
 *   tags: ['positive', 'rare'],
 *   language: 'en',
 *   contentType: 'vocabulary',
 *   definition: 'The occurrence of events by chance in a happy way',
 *   ipa: '/ˌserənˈdɪpɪti/',
 *   examples: ['Finding that book was pure serendipity.'],
 *   partOfSpeech: 'noun',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface Vocabulary {
  /** Unique identifier for the vocabulary entry */
  id: string;
  
  /** The word, phrase, idiom, or quote text */
  text: string;
  
  /** Optional user-provided description or notes */
  description?: string;
  
  /** Tags for categorization and filtering */
  tags: string[];
  
  /** Language code (e.g., 'en', 'es', 'fr') */
  language: string;
  
  /** Type of content this entry represents */
  contentType: ContentType;
  
  /** Dictionary definition (typically from GPT enrichment) */
  definition?: string;
  
  /** International Phonetic Alphabet pronunciation */
  ipa?: string;
  
  /** Example sentences demonstrating usage */
  examples?: string[];
  
  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech?: string;
  
  /** Timestamp when the entry was created */
  createdAt: Date;
  
  /** Timestamp when the entry was last modified */
  updatedAt: Date;
}
