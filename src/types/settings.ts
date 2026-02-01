import type { GptProvider, GptProviderId } from './gpt';

/**
 * Theme options for the application UI.
 * - light: Light color scheme
 * - dark: Dark color scheme
 * - system: Follow system preference
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Extra enrichment preferences per predefined tag.
 * Each predefined tag can have custom extra fields request that overrides the default.
 * 
 * @example
 * ```typescript
 * const extraEnrichment: ExtraEnrichmentPrefs = {
 *   vocabulary: 'synonyms, antonyms, etymology',
 *   idiom: 'origin, similar expressions',
 *   'phrasal-verb': 'synonyms, formal alternatives',
 * };
 * ```
 */
export type ExtraEnrichmentPrefs = Record<string, string>;

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
  
  /** Last used language when adding entries */
  lastUsedLanguage: string;
  
  /** Last used predefined tag categories when adding entries */
  lastUsedCategories: string[];
  
  /** Last used extra enrichment text per language (language code -> text) */
  lastUsedExtraEnrichment: Record<string, string>;
}

/**
 * Note: Default extra enrichment prompts are now defined in predefinedTags.ts.
 * This constant is kept for backwards compatibility but defaults come from PREDEFINED_TAGS.
 * Users can override per-tag enrichment which is stored in settings.extraEnrichment.
 */

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
  lastUsedLanguage: 'en',
  lastUsedCategories: [],
  lastUsedExtraEnrichment: {},
};
