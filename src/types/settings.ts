import type { GptProvider, GptProviderId } from './gpt';
import type { ContentType } from './vocabulary';

/**
 * Theme options for the application UI.
 * - light: Light color scheme
 * - dark: Dark color scheme
 * - system: Follow system preference
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Extra enrichment preferences per content type.
 * Each content type can have its own default extra fields request.
 * 
 * @example
 * ```typescript
 * const extraEnrichment: ExtraEnrichmentPrefs = {
 *   vocabulary: 'synonyms, antonyms, etymology',
 *   idiom: 'origin, similar expressions',
 *   'phrasal-verb': 'synonyms, formal alternatives',
 *   quote: 'author background, context',
 * };
 * ```
 */
export type ExtraEnrichmentPrefs = Partial<Record<ContentType, string>>;

/**
 * Application settings configuration.
 * Stored in localStorage (with encrypted API keys).
 * 
 * @example
 * ```typescript
 * const settings: AppSettings = {
 *   providers: [
 *     { id: 'openai', name: 'OpenAI', apiKey: 'sk-...', isActive: true },
 *     { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
 *   ],
 *   activeProviderId: 'openai',
 *   theme: 'system',
 *   defaultLanguage: 'en',
 * };
 * ```
 */
export interface AppSettings {
  /** Configured GPT providers for vocabulary enrichment */
  providers: GptProvider[];
  
  /** ID of the currently active GPT provider */
  activeProviderId: GptProviderId;
  
  /** UI theme preference */
  theme: Theme;
  
  /** Default language for new vocabulary entries (ISO 639-1 code) */
  defaultLanguage: string;
  
  /** Extra enrichment field preferences per content type */
  extraEnrichment: ExtraEnrichmentPrefs;
}

/**
 * Default extra enrichment prompts for each content type.
 * These are used as suggestions when no custom value is set.
 * 
 * Base enrichment already includes: definition, IPA, type, examples, forms
 * These extras are in addition to those fields.
 */
export const DEFAULT_EXTRA_ENRICHMENT: ExtraEnrichmentPrefs = {
  'vocabulary': 'synonyms, antonyms, collocations',
  'idiom': 'origin, literal meaning, similar expressions',
  'phrasal-verb': 'synonyms, formal alternative, separable',
  'quote': 'author, context, interpretation',
};

/**
 * Default application settings used for initialization.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  providers: [
    { id: 'openai', name: 'OpenAI', apiKey: '', isActive: false },
    { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
  ],
  activeProviderId: 'openai',
  theme: 'system',
  defaultLanguage: 'en',
  extraEnrichment: {},
};
