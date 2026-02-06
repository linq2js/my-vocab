/**
 * Abstract interface for GPT providers.
 * Defines the contract that all GPT provider implementations must follow.
 *
 * This interface enables the provider pattern for vocabulary enrichment,
 * allowing seamless switching between OpenAI and Gemini providers.
 *
 * @example
 * ```typescript
 * // Implementing the interface
 * class OpenAIProvider implements IGptProvider {
 *   readonly providerId = 'openai';
 *
 *   async enrich(text: string, language: string): Promise<GptEnrichmentResponse> {
 *     // OpenAI-specific implementation
 *   }
 * }
 *
 * // Using the interface
 * const provider: IGptProvider = new OpenAIProvider();
 * const enrichment = await provider.enrich('serendipity', 'en');
 * ```
 */

import type { GptEnrichmentResponse, GptProviderId } from '../types/gpt';

/**
 * Request parameters for vocabulary enrichment.
 */
export interface GptEnrichmentRequest {
  /** The word, phrase, or expression to enrich */
  text: string;

  /** ISO language code (e.g., 'en', 'es', 'fr') */
  language: string;

  /** Optional content type hint for better enrichment */
  contentType?: 'vocabulary' | 'idiom' | 'phrasal-verb' | 'quote';
}

/**
 * Abstract interface for GPT provider implementations.
 * All GPT providers (OpenAI, Gemini, etc.) must implement this interface.
 */
export interface IGptProvider {
  /** The unique identifier for this provider */
  readonly providerId: GptProviderId;

  /**
   * Enriches a vocabulary entry with linguistic information.
   *
   * @param text - The word, phrase, or expression to enrich
   * @param language - ISO language code (e.g., 'en', 'es', 'fr')
   * @param extraFields - Optional comma-separated list of extra fields to request (e.g., 'synonyms, etymology')
   * @returns Promise resolving to enrichment data including definition, IPA, type, and examples
   * @throws Error if the API call fails or returns invalid data
   *
   * @example
   * ```typescript
   * // Basic enrichment
   * const result = await provider.enrich('serendipity', 'en');
   * console.log(result.definition); // 'The occurrence of events by chance...'
   *
   * // With extra fields
   * const result = await provider.enrich('serendipity', 'en', 'synonyms, etymology');
   * console.log(result.extra?.synonyms); // 'luck, fortune, chance'
   * ```
   */
  enrich(text: string, language: string, extraFields?: string): Promise<GptEnrichmentResponse>;

  /**
   * Translates text from one language to another.
   *
   * @param text - The text to translate
   * @param fromLang - Source language code (e.g., 'en')
   * @param toLang - Target language code (e.g., 'fr')
   * @param stylePrompt - Optional style instruction (e.g., 'Use formal business tone')
   * @returns Promise resolving to the translated text
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const translation = await provider.translate('Hello world', 'en', 'fr');
   * console.log(translation); // 'Bonjour le monde'
   *
   * // With style
   * const formal = await provider.translate('Hello', 'en', 'fr', 'Use formal tone');
   * console.log(formal); // 'Bonjour' or 'Salutations'
   * ```
   */
  translate(text: string, fromLang: string, toLang: string, stylePrompt?: string): Promise<string>;

  /**
   * Improves a simple style description into a detailed AI instruction prompt.
   *
   * @param description - A simple description of the desired translation style (e.g., 'formal email')
   * @returns Promise resolving to an improved, detailed prompt
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const improved = await provider.improveStylePrompt('formal email');
   * console.log(improved);
   * // 'Translate using formal business language suitable for professional email
   * //  correspondence. Use polite tone, avoid contractions, maintain professional register.'
   * ```
   */
  improveStylePrompt(description: string): Promise<string>;

  /**
   * Explains the hidden/deeper meaning of text in the same language.
   *
   * @param text - The text to explain
   * @param language - The language of the text (explanation will be in the same language)
   * @returns Promise resolving to the explanation
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const explanation = await provider.explain('Break a leg!', 'en');
   * console.log(explanation);
   * // 'This is an idiom meaning "good luck", commonly used before performances...'
   * ```
   */
  explain(text: string, language: string): Promise<string>;

  /**
   * Rephrases text in the same language with a specific style/tone.
   *
   * @param text - The text to rephrase
   * @param language - The language of the text
   * @param stylePrompt - Optional style instruction (e.g., 'Use formal business tone')
   * @param context - Optional context for more accurate rephrasing
   * @returns Promise resolving to the rephrased text
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const rephrased = await provider.rephrase('gonna grab some food', 'en', 'Use formal tone');
   * console.log(rephrased); // 'I am going to get something to eat'
   * ```
   */
  rephrase(text: string, language: string, stylePrompt?: string, context?: string): Promise<string>;

  /**
   * Detects the language of a given text.
   *
   * @param text - The text to analyze
   * @returns Promise resolving to the detected language code (e.g., 'en', 'fr', 'es')
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const langCode = await provider.detectLanguage('Bonjour le monde');
   * console.log(langCode); // 'fr'
   * ```
   */
  detectLanguage(text: string): Promise<string>;

  /**
   * Suggests a reply to a message based on the original text and user's idea.
   *
   * @param originalText - The original message/text to reply to
   * @param language - The language for the reply
   * @param userIdea - Optional user's idea or direction for the reply
   * @param stylePrompt - Optional style instruction for the reply tone
   * @returns Promise resolving to the suggested reply
   * @throws Error if the API call fails
   *
   * @example
   * ```typescript
   * const reply = await provider.suggestReply(
   *   'Would you like to join us for dinner tonight?',
   *   'en',
   *   'politely decline, busy with work'
   * );
   * console.log(reply); // 'Thank you for the invitation, but I have to work late tonight...'
   * ```
   */
  suggestReply(originalText: string, language: string, userIdea?: string, stylePrompt?: string): Promise<string>;

  /**
   * Corrects and improves user-spoken (or typed) text into natural target language.
   * Fixes grammar, spelling, and optionally applies style. Output is in the target language.
   *
   * @param text - The raw text (e.g. from speech recognition) to correct
   * @param sourceLang - Language of the input text
   * @param targetLang - Language for the corrected output
   * @param stylePrompt - Optional style instruction (e.g. formal, casual)
   * @returns Promise resolving to the corrected text in target language
   */
  correctText(
    text: string,
    sourceLang: string,
    targetLang: string,
    stylePrompt?: string
  ): Promise<string>;

  /**
   * Suggests 2–4 short "next things to say" based on conversation history.
   * Used for voice practice to keep the conversation going.
   *
   * @param conversationHistory - Array of what the user said in this session (chronological)
   * @param language - Language for the suggestions
   * @returns Promise resolving to a single string with 2–4 bullet or numbered suggestions
   */
  suggestNextIdeas(conversationHistory: string[], language: string): Promise<string>;

  /**
   * Generates a short conversational reply as if the bot is responding to the user.
   * Used for "Replies" / bot message list in conversation mode.
   *
   * @param userMessage - What the user said (e.g. corrected or raw)
   * @param language - Language for the reply
   * @param stylePrompt - Optional style/tone for the reply
   * @returns Promise resolving to a single short reply line
   */
  getConversationReply(
    userMessage: string,
    language: string,
    stylePrompt?: string
  ): Promise<string>;

  /**
   * Suggests a short reply the user could say back to the bot's message (Type 2 suggestion).
   * Used for "suggested reply to bot" – content is hidden by default, user reveals to see.
   *
   * @param botReply - The bot's message that the user would be replying to
   * @param language - Language for the suggested reply
   * @param stylePrompt - Optional style/tone
   * @returns Promise resolving to a short suggested user reply
   */
  getSuggestedReplyToBot(
    botReply: string,
    language: string,
    stylePrompt?: string
  ): Promise<string>;
}
