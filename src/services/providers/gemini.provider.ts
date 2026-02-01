/**
 * Google Gemini implementation of the GPT provider interface.
 *
 * This provider uses the Google Gemini API to enrich vocabulary entries
 * with definitions, IPA pronunciation, part of speech, and example sentences.
 *
 * @example
 * ```typescript
 * const provider = new GeminiProvider('AIzaSy-your-api-key');
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
import { createCombinedPrompt } from './prompts';

/** Gemini API base URL */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Default model to use for enrichment */
const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Extracts JSON from a response that may be wrapped in markdown code blocks.
 *
 * @param content - The raw response content from Gemini
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
    isStringRecord(response.extra)
  );
}

/**
 * Google Gemini implementation of the GPT provider interface.
 *
 * Provides vocabulary enrichment using Google's Gemini API.
 */
export class GeminiProvider implements IGptProvider {
  /** The unique identifier for this provider */
  readonly providerId: GptProviderId = 'gemini';

  /** The API key for authentication */
  private readonly apiKey: string;

  /** The model to use for completions */
  private readonly model: string;

  /**
   * Creates a new Gemini provider instance.
   *
   * @param apiKey - The Google API key for authentication
   * @param model - Optional model override (defaults to gemini-2.0-flash)
   */
  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Enriches a vocabulary entry with linguistic information using Gemini.
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
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: createCombinedPrompt(text, language, extraFields),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent responses
          topP: 0.8,
          topK: 40,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `${response.status} ${response.statusText}`;
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API returned no response');
    }

    const parts = data.candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('Gemini API returned empty content');
    }

    const content = parts[0]?.text;
    if (!content) {
      throw new Error('Gemini API returned empty content');
    }

    // Parse JSON response
    const jsonString = extractJsonFromResponse(content);
    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate response has required fields
    if (!isValidEnrichmentResponse(parsedResponse)) {
      throw new Error('Invalid response structure from Gemini');
    }

    return parsedResponse;
  }
}
