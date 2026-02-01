/**
 * OpenAI implementation of the GPT provider interface.
 *
 * This provider uses the OpenAI Chat Completions API to enrich vocabulary entries
 * with definitions, IPA pronunciation, part of speech, and example sentences.
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider('sk-your-api-key');
 * const enrichment = await provider.enrich('serendipity', 'en');
 * console.log(enrichment.definition);
 *
 * // With extra fields
 * const enrichment = await provider.enrich('serendipity', 'en', 'synonyms, etymology');
 * console.log(enrichment.extra?.synonyms);
 * ```
 */

import type { IGptProvider } from '../gpt-provider.interface';
import type { GptEnrichmentResponse, GptProviderId } from '../../types/gpt';
import { createSystemPrompt, createUserPrompt } from './prompts';

/** OpenAI API endpoint for chat completions */
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** Default model to use for enrichment */
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Extracts JSON from a response that may be wrapped in markdown code blocks.
 *
 * @param content - The raw response content from OpenAI
 * @returns The extracted JSON string
 */
function extractJsonFromResponse(content: string): string {
  // Remove markdown code block if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  return content.trim();
}

/**
 * Validates that an object has all string values.
 *
 * @param obj - The object to validate
 * @returns True if all values are strings
 */
function isStringRecord(obj: unknown): boolean {
  if (obj === undefined || obj === null) {
    return true; // optional fields
  }
  if (typeof obj !== 'object') {
    return false;
  }
  return Object.values(obj as Record<string, unknown>).every(
    (value) => typeof value === 'string'
  );
}

/**
 * Validates a single word sense object.
 *
 * @param sense - The sense object to validate
 * @returns True if the sense has required fields with correct types
 */
function isValidWordSense(sense: unknown): boolean {
  if (typeof sense !== 'object' || sense === null) {
    return false;
  }

  const s = sense as Record<string, unknown>;

  // Required fields: type and definition
  if (typeof s.type !== 'string' || typeof s.definition !== 'string') {
    return false;
  }

  // Optional: examples must be array of strings if present
  if (s.examples !== undefined) {
    if (!Array.isArray(s.examples) || !s.examples.every((ex) => typeof ex === 'string')) {
      return false;
    }
  }

  // Optional: forms must be string record if present
  if (!isStringRecord(s.forms)) {
    return false;
  }

  return true;
}

/**
 * Validates the senses array.
 *
 * @param senses - The senses array to validate
 * @returns True if senses is a valid array of word senses (or undefined/empty)
 */
function isValidSensesArray(senses: unknown): boolean {
  if (senses === undefined || senses === null) {
    return true; // optional field
  }
  if (!Array.isArray(senses)) {
    return false;
  }
  return senses.every(isValidWordSense);
}

/**
 * Validates that a parsed response has all required fields.
 *
 * @param data - The parsed response data
 * @returns True if the response has all required fields with correct types
 */
function isValidEnrichmentResponse(
  data: unknown
): data is GptEnrichmentResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const response = data as Record<string, unknown>;

  return (
    typeof response.definition === 'string' &&
    typeof response.ipa === 'string' &&
    typeof response.type === 'string' &&
    Array.isArray(response.examples) &&
    response.examples.every((ex) => typeof ex === 'string') &&
    isStringRecord(response.forms) &&
    isStringRecord(response.extra) &&
    isValidSensesArray(response.senses)
  );
}

/**
 * OpenAI implementation of the GPT provider interface.
 *
 * Provides vocabulary enrichment using OpenAI's Chat Completions API.
 */
export class OpenAIProvider implements IGptProvider {
  /** The unique identifier for this provider */
  readonly providerId: GptProviderId = 'openai';

  /** The API key for authentication */
  private readonly apiKey: string;

  /** The model to use for completions */
  private readonly model: string;

  /**
   * Creates a new OpenAI provider instance.
   *
   * @param apiKey - The OpenAI API key for authentication
   * @param model - Optional model override (defaults to gpt-4o-mini)
   */
  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Enriches a vocabulary entry with linguistic information using OpenAI.
   *
   * @param text - The word, phrase, or expression to enrich
   * @param language - ISO language code (e.g., 'en', 'es', 'fr')
   * @param extraFields - Optional comma-separated list of extra fields to request
   * @returns Promise resolving to enrichment data
   * @throws Error if the API call fails, returns invalid data, or network error occurs
   */
  async enrich(
    text: string,
    language: string,
    extraFields?: string
  ): Promise<GptEnrichmentResponse> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: createSystemPrompt(extraFields) },
          { role: 'user', content: createUserPrompt(text, language, extraFields) },
        ],
        temperature: 0.3, // Lower temperature for more consistent responses
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `${response.status} ${response.statusText}`;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenAI API returned no response');
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned empty content');
    }

    // Parse JSON response
    const jsonString = extractJsonFromResponse(content);
    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Validate response has required fields
    if (!isValidEnrichmentResponse(parsedResponse)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return parsedResponse;
  }
}
