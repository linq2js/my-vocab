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
- definition: A clear, concise dictionary definition for the PRIMARY/most common usage
- ipa: The International Phonetic Alphabet pronunciation
- type: The part of speech (noun, verb, adjective, etc.) or content type (idiom, phrasal verb, quote) for the PRIMARY usage
- examples: REQUIRED - An array of 2-3 example sentences demonstrating PRIMARY usage. This is MANDATORY for ALL content types including idioms, phrasal verbs, and quotes. For idioms and phrasal verbs, show them used naturally in context. For quotes, provide the original quote and context of when/how it was said.
- forms: An object containing grammatical forms of the word for PRIMARY usage (only include applicable forms):
  - For verbs: past, pastParticiple, presentParticiple, thirdPerson
  - For nouns: plural
  - For adjectives/adverbs: comparative, superlative
  - For idioms, phrasal verbs, or quotes: omit or use empty object
- senses: IMPORTANT - Check if the word can function as MULTIPLE parts of speech (e.g., "run" as verb AND noun, "book" as noun AND verb, "light" as noun, verb, AND adjective). If yes, include ALL additional senses here. Each sense object must have:
  - type: The part of speech for this sense (REQUIRED)
  - definition: Definition for this specific sense (REQUIRED)
  - examples: 1-2 example sentences (optional but recommended)
  - forms: Grammatical forms for this sense (e.g., plural for nouns)
  For example, if primary is "run" as verb, senses should include "run" as noun (a morning run, a run in stockings).
  Only use empty array [] if the word truly has only ONE part of speech and meaning`;

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

Return a JSON object with definition, ipa, type, examples, forms, senses${extraFields?.trim() ? ', and extra' : ''}.`;
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
