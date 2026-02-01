/**
 * Shared prompt templates for AI vocabulary enrichment.
 * Used by all AI providers (OpenAI, Gemini, etc.) for consistent behavior.
 */

/**
 * Creates the system prompt for vocabulary enrichment.
 * Instructs the AI on response format and expected fields.
 *
 * @param extraFields - Optional comma-separated list of extra fields to request
 * @returns The system prompt string
 *
 * @example
 * ```typescript
 * // Basic usage
 * const prompt = createSystemPrompt();
 *
 * // With extra fields
 * const prompt = createSystemPrompt('synonyms, antonyms, etymology');
 * ```
 */
export function createSystemPrompt(extraFields?: string): string {
  const basePrompt = `You are a linguistic expert assistant that provides vocabulary enrichment data.
You MUST respond with a valid JSON object containing exactly these fields:
- definition: A clear, concise dictionary definition
- ipa: The International Phonetic Alphabet pronunciation
- type: The part of speech (noun, verb, adjective, etc.) or content type (idiom, phrasal verb, quote)
- examples: An array of 2-3 example sentences demonstrating usage
- forms: An object containing grammatical forms of the word (only include applicable forms):
  - For verbs: past, pastParticiple, presentParticiple, thirdPerson
  - For nouns: plural
  - For adjectives/adverbs: comparative, superlative
  - For idioms, phrasal verbs, or quotes: omit or use empty object`;

  // Add extra fields instruction if requested
  const extraInstruction = extraFields?.trim()
    ? `
- extra: An object containing these additional fields requested by the user: ${extraFields}
  Each field should have a clear, informative value as a string.`
    : '';

  return `${basePrompt}${extraInstruction}

Respond ONLY with the JSON object, no additional text or markdown formatting.`;
}

/**
 * Creates the user prompt for a specific vocabulary enrichment request.
 *
 * @param text - The word, phrase, or expression to enrich
 * @param language - ISO language code (e.g., 'en', 'es', 'fr')
 * @param extraFields - Optional comma-separated list of extra fields requested
 * @returns The user prompt string
 *
 * @example
 * ```typescript
 * // Basic usage
 * const prompt = createUserPrompt('serendipity', 'en');
 *
 * // With extra fields
 * const prompt = createUserPrompt('serendipity', 'en', 'synonyms, etymology');
 * ```
 */
export function createUserPrompt(
  text: string,
  language: string,
  extraFields?: string
): string {
  const basePrompt = `Provide linguistic enrichment data for the following word/phrase in language "${language}":

"${text}"`;

  const extraInstruction = extraFields?.trim()
    ? `

Also include these extra fields in the "extra" object: ${extraFields}`
    : '';

  return `${basePrompt}${extraInstruction}

Return a JSON object with definition, ipa, type, examples, forms${extraFields?.trim() ? ', and extra' : ''}.`;
}

/**
 * Creates a combined prompt (system + user) for providers that don't
 * support separate system messages (e.g., some Gemini configurations).
 *
 * @param text - The word, phrase, or expression to enrich
 * @param language - ISO language code
 * @param extraFields - Optional comma-separated list of extra fields
 * @returns The combined prompt string
 */
export function createCombinedPrompt(
  text: string,
  language: string,
  extraFields?: string
): string {
  return `${createSystemPrompt(extraFields)}

${createUserPrompt(text, language, extraFields)}`;
}
