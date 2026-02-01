/**
 * Content types for vocabulary entries.
 * Defines the different categories of content that can be stored.
 */
export enum ContentType {
  /** Standard vocabulary word */
  VOCABULARY = 'vocabulary',
  /** Idiomatic expression */
  IDIOM = 'idiom',
  /** Phrasal verb (verb + preposition/adverb) */
  PHRASAL_VERB = 'phrasal-verb',
  /** Notable quote or saying */
  QUOTE = 'quote',
}

/**
 * Content type display configuration.
 * 
 * Abbreviations are used for compact UI elements like chips/badges.
 * - V = Vocabulary
 * - I = Idiom  
 * - P = Phrasal Verb
 * - Q = Quote
 */
export interface ContentTypeDisplay {
  /** Full display label */
  label: string;
  /** Single letter abbreviation for compact display */
  abbr: string;
  /** Icon name for the content type */
  icon: string;
}

/**
 * Display configuration for each content type.
 * Use `getContentTypeDisplay()` to get display info.
 */
export const CONTENT_TYPE_DISPLAY: Record<string, ContentTypeDisplay> = {
  [ContentType.VOCABULARY]: {
    label: 'Vocabulary',
    abbr: 'V',
    icon: 'book',
  },
  [ContentType.IDIOM]: {
    label: 'Idiom',
    abbr: 'I',
    icon: 'globe',
  },
  [ContentType.PHRASAL_VERB]: {
    label: 'Phrasal Verb',
    abbr: 'P',
    icon: 'tag',
  },
  [ContentType.QUOTE]: {
    label: 'Quote',
    abbr: 'Q',
    icon: 'quote',
  },
};

/**
 * Get display information for a content type.
 * @param contentType - The content type value
 * @returns Display configuration with label, abbreviation, and icon
 */
export function getContentTypeDisplay(contentType: string): ContentTypeDisplay {
  return CONTENT_TYPE_DISPLAY[contentType] || {
    label: contentType,
    abbr: contentType.charAt(0).toUpperCase(),
    icon: 'file',
  };
}

/**
 * Get abbreviation for a content type.
 * @param contentType - The content type value
 * @returns Single letter abbreviation (V, I, P, Q)
 */
export function getContentTypeAbbr(contentType: string): string {
  return getContentTypeDisplay(contentType).abbr;
}

/**
 * Get full label for a content type.
 * @param contentType - The content type value  
 * @returns Full display label
 */
export function getContentTypeLabel(contentType: string): string {
  return getContentTypeDisplay(contentType).label;
}
