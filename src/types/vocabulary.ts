import type { VocabularyForms, ExtraEnrichment, WordSense } from './gpt';

// Re-export types for convenience
export type { VocabularyForms, ExtraEnrichment, WordSense } from './gpt';

/**
 * Represents a vocabulary entry in the application.
 * 
 * Tags can include both predefined tags (vocabulary, idiom, phrasal-verb, etc.)
 * and custom user tags. Predefined tags trigger additional AI enrichment fields.
 * 
 * @example
 * ```typescript
 * const vocab: Vocabulary = {
 *   id: 'abc123',
 *   text: 'serendipity',
 *   description: 'A happy accident',
 *   tags: ['vocabulary', 'positive', 'rare'],  // 'vocabulary' is predefined, others are custom
 *   language: 'en',
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
  
  /** Tags for categorization and filtering (includes predefined and custom tags) */
  tags: string[];
  
  /** Language code (e.g., 'en', 'es', 'fr') */
  language: string;
  
  /** Dictionary definition (typically from GPT enrichment) */
  definition?: string;
  
  /** International Phonetic Alphabet pronunciation */
  ipa?: string;
  
  /** Example sentences demonstrating usage */
  examples?: string[];
  
  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech?: string;
  
  /** Grammatical forms (conjugations, plural, comparative, etc.) */
  forms?: VocabularyForms;
  
  /** User-requested extra enrichment fields (synonyms, etymology, etc.) */
  extra?: ExtraEnrichment;
  
  /** Additional senses/meanings beyond the primary usage (e.g., when word is both noun and verb) */
  senses?: WordSense[];
  
  /** Timestamp when the entry was created */
  createdAt: Date;
  
  /** Timestamp when the entry was last modified */
  updatedAt: Date;
}
