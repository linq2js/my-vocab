/**
 * Language definitions for vocabulary entries.
 * Contains common languages used for language learning.
 */

/**
 * Represents a language with its code and display name.
 */
export interface Language {
  /** ISO 639-1 language code (e.g., 'en', 'es') */
  code: string;
  /** Human-readable language name */
  name: string;
}

/**
 * Array of common languages for vocabulary learning.
 * Sorted alphabetically by name for UI display.
 */
export const LANGUAGES: readonly Language[] = [
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
] as const;

/**
 * Default language code for new vocabulary entries.
 */
export const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Get a language by its code.
 * @param code - ISO 639-1 language code
 * @returns The language object or undefined if not found
 */
export const getLanguageByCode = (code: string): Language | undefined => {
  return LANGUAGES.find((lang) => lang.code === code);
};

/**
 * Get language name by code.
 * @param code - ISO 639-1 language code
 * @returns The language name or the code itself if not found
 */
export const getLanguageName = (code: string): string => {
  return getLanguageByCode(code)?.name ?? code;
};
