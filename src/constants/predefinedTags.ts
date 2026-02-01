/**
 * Predefined tags for vocabulary entries.
 * These special tags trigger additional AI enrichment fields.
 * Users can select multiple predefined tags, and their enrichment fields combine.
 */

/**
 * Predefined tag configuration.
 */
export interface PredefinedTag {
  /** Unique identifier (used as the tag value) */
  id: string;
  /** Display label */
  label: string;
  /** Single letter abbreviation for compact display */
  abbr: string;
  /** Icon name */
  icon: string;
  /** Default extra enrichment fields for this tag */
  enrichment: string;
  /** Description of when to use this tag */
  description: string;
}

/**
 * All predefined tags with their enrichment mappings.
 * When a user selects these tags, the corresponding enrichment fields are requested.
 */
export const PREDEFINED_TAGS: PredefinedTag[] = [
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    abbr: 'V',
    icon: 'book',
    enrichment: 'synonyms, antonyms, collocations',
    description: 'Single words or standard terms',
  },
  {
    id: 'idiom',
    label: 'Idiom',
    abbr: 'I',
    icon: 'globe',
    enrichment: 'origin, literal meaning, similar expressions',
    description: 'Expressions with figurative meaning',
  },
  {
    id: 'phrasal-verb',
    label: 'Phrasal Verb',
    abbr: 'P',
    icon: 'tag',
    enrichment: 'synonyms, formal alternative, separable',
    description: 'Verb + preposition/adverb combinations',
  },
  {
    id: 'collocation',
    label: 'Collocation',
    abbr: 'C',
    icon: 'tag',
    enrichment: 'common patterns, alternative collocations, register',
    description: 'Words that naturally go together',
  },
  {
    id: 'slang',
    label: 'Slang',
    abbr: 'S',
    icon: 'info',
    enrichment: 'origin, formality level, regional usage',
    description: 'Informal or casual language',
  },
  {
    id: 'expression',
    label: 'Expression',
    abbr: 'E',
    icon: 'info',
    enrichment: 'usage context, formality, alternatives',
    description: 'Common phrases and expressions',
  },
  {
    id: 'quote',
    label: 'Quote',
    abbr: 'Q',
    icon: 'info',
    enrichment: 'author, context, interpretation',
    description: 'Notable quotes or sayings',
  },
  {
    id: 'proverb',
    label: 'Proverb',
    abbr: 'R',
    icon: 'book',
    enrichment: 'origin, similar proverbs, modern usage',
    description: 'Traditional sayings and wisdom',
  },
];

/**
 * Set of predefined tag IDs for quick lookup.
 */
export const PREDEFINED_TAG_IDS = new Set(PREDEFINED_TAGS.map((t) => t.id));

/**
 * Map of predefined tag ID to tag configuration.
 */
export const PREDEFINED_TAG_MAP = new Map(
  PREDEFINED_TAGS.map((t) => [t.id, t])
);

/**
 * Check if a tag is a predefined tag.
 * @param tag - The tag to check
 * @returns True if the tag is predefined
 */
export function isPredefinedTag(tag: string): boolean {
  return PREDEFINED_TAG_IDS.has(tag);
}

/**
 * Get predefined tag configuration by ID.
 * @param id - The predefined tag ID
 * @returns The tag configuration or undefined
 */
export function getPredefinedTag(id: string): PredefinedTag | undefined {
  return PREDEFINED_TAG_MAP.get(id);
}

/**
 * Get display info for a predefined tag.
 * @param id - The predefined tag ID
 * @returns Display info with label, abbr, icon
 */
export function getPredefinedTagDisplay(id: string): {
  label: string;
  abbr: string;
  icon: string;
} | null {
  const tag = PREDEFINED_TAG_MAP.get(id);
  if (!tag) return null;
  return { label: tag.label, abbr: tag.abbr, icon: tag.icon };
}

/**
 * Get combined enrichment fields from multiple predefined tags.
 * Deduplicates fields when combining.
 * @param tags - Array of tag strings (may include non-predefined tags)
 * @returns Combined enrichment string or empty string if no predefined tags
 */
export function getCombinedEnrichment(tags: string[]): string {
  const enrichmentFields = new Set<string>();

  for (const tag of tags) {
    const predefined = PREDEFINED_TAG_MAP.get(tag);
    if (predefined) {
      // Split enrichment string and add each field
      predefined.enrichment.split(',').forEach((field) => {
        enrichmentFields.add(field.trim());
      });
    }
  }

  return Array.from(enrichmentFields).join(', ');
}

/**
 * Separate tags into predefined and custom tags.
 * @param tags - Array of all tags
 * @returns Object with predefined and custom tag arrays
 */
export function separateTags(tags: string[]): {
  predefined: string[];
  custom: string[];
} {
  const predefined: string[] = [];
  const custom: string[] = [];

  for (const tag of tags) {
    if (isPredefinedTag(tag)) {
      predefined.push(tag);
    } else {
      custom.push(tag);
    }
  }

  return { predefined, custom };
}

/**
 * Filter constant for entries with no predefined tags.
 */
export const NO_PREDEFINED_TAG_FILTER = '__no_predefined_tag__';

/**
 * Standard parts of speech that map to "vocabulary" category.
 */
const VOCABULARY_PARTS_OF_SPEECH = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'determiner',
  'article',
]);

/**
 * Map AI-returned type/partOfSpeech to a predefined tag ID.
 * Returns null if no matching predefined tag.
 * 
 * @param partOfSpeech - The type/partOfSpeech returned from AI enrichment
 * @returns Matching predefined tag ID or null
 */
export function matchPartOfSpeechToTag(partOfSpeech: string | undefined): string | null {
  if (!partOfSpeech) return null;
  
  const normalized = partOfSpeech.toLowerCase().trim();
  
  // Direct matches to predefined tags
  if (normalized === 'idiom') return 'idiom';
  if (normalized === 'phrasal verb' || normalized === 'phrasal-verb') return 'phrasal-verb';
  if (normalized === 'collocation') return 'collocation';
  if (normalized === 'slang') return 'slang';
  if (normalized === 'expression') return 'expression';
  if (normalized === 'quote') return 'quote';
  if (normalized === 'proverb') return 'proverb';
  
  // Standard parts of speech → vocabulary
  if (VOCABULARY_PARTS_OF_SPEECH.has(normalized)) return 'vocabulary';
  
  // Check for partial matches (e.g., "phrasal verb phrase" → phrasal-verb)
  if (normalized.includes('idiom')) return 'idiom';
  if (normalized.includes('phrasal')) return 'phrasal-verb';
  if (normalized.includes('proverb')) return 'proverb';
  if (normalized.includes('slang')) return 'slang';
  
  return null;
}
