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
 * Grammatical forms of a vocabulary word.
 * 
 * Different parts of speech have different applicable forms:
 * - Verbs: past, pastParticiple, presentParticiple, thirdPerson
 * - Nouns: plural
 * - Adjectives/Adverbs: comparative, superlative
 * 
 * @example
 * ```typescript
 * // Verb forms
 * const verbForms: VocabularyForms = {
 *   past: 'ran',
 *   pastParticiple: 'run',
 *   presentParticiple: 'running',
 *   thirdPerson: 'runs',
 * };
 * 
 * // Noun forms
 * const nounForms: VocabularyForms = {
 *   plural: 'children',
 * };
 * ```
 */
export interface VocabularyForms {
  /** Past tense (verbs) */
  past?: string;
  
  /** Past participle (verbs) */
  pastParticiple?: string;
  
  /** Present participle / gerund (verbs) */
  presentParticiple?: string;
  
  /** Third person singular present (verbs) */
  thirdPerson?: string;
  
  /** Plural form (nouns) */
  plural?: string;
  
  /** Comparative form (adjectives/adverbs) */
  comparative?: string;
  
  /** Superlative form (adjectives/adverbs) */
  superlative?: string;
}

/**
 * User-requested extra enrichment data.
 * Keys are field names requested by user, values are AI-generated content.
 * 
 * @example
 * ```typescript
 * const extra: ExtraEnrichment = {
 *   synonyms: 'luck, fortune, chance, fate',
 *   antonyms: 'misfortune, bad luck',
 *   etymology: 'Coined by Horace Walpole in 1754',
 * };
 * ```
 */
export type ExtraEnrichment = Record<string, string>;

/**
 * Represents an additional sense/meaning of a word.
 * Used when a word has multiple parts of speech or distinct meanings
 * beyond the primary/most common usage.
 * 
 * @example
 * ```typescript
 * // "run" as a noun (in addition to its primary verb meaning)
 * const sense: WordSense = {
 *   type: 'noun',
 *   definition: 'An act or instance of running',
 *   examples: ['I went for a run this morning.'],
 *   forms: { plural: 'runs' },
 * };
 * ```
 */
export interface WordSense {
  /** Part of speech for this sense (noun, verb, adjective, etc.) */
  type: string;
  
  /** Dictionary definition for this specific sense */
  definition: string;
  
  /** Example sentences demonstrating this sense */
  examples?: string[];
  
  /** Grammatical forms specific to this sense */
  forms?: VocabularyForms;
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
 *   forms: {
 *     plural: 'serendipities',
 *   },
 *   extra: {
 *     synonyms: 'luck, fortune, chance',
 *     etymology: 'Coined by Horace Walpole in 1754',
 *   },
 * };
 * ```
 */
export interface GptEnrichmentResponse {
  /** Dictionary definition of the word/phrase (primary/most common usage) */
  definition: string;
  
  /** International Phonetic Alphabet pronunciation */
  ipa: string;
  
  /** Part of speech or content type (noun, verb, idiom, etc.) - primary usage */
  type: string;
  
  /** Example sentences demonstrating usage (primary sense) */
  examples: string[];
  
  /** Grammatical forms (conjugations, plural, comparative, etc.) - primary usage */
  forms?: VocabularyForms;
  
  /** User-requested extra enrichment fields (synonyms, etymology, etc.) */
  extra?: ExtraEnrichment;
  
  /** Additional senses/meanings beyond the primary usage (e.g., when word is both noun and verb) */
  senses?: WordSense[];
}
