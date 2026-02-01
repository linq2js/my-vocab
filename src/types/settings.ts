import type { GptProvider, GptProviderId } from './gpt';

/**
 * Theme options for the application UI.
 * - light: Light color scheme
 * - dark: Dark color scheme
 * - system: Follow system preference
 */
export type Theme = 'light' | 'dark' | 'system';

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
}

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
};
