/**
 * Tests for Google Gemini GPT provider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from './gemini.provider';
import type { GptEnrichmentResponse } from '../../types/gpt';

describe('GeminiProvider', () => {
  const mockApiKey = 'AIzaSy-test-api-key-12345';
  let provider: GeminiProvider;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new GeminiProvider(mockApiKey);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('providerId', () => {
    it('should return "gemini" as provider ID', () => {
      expect(provider.providerId).toBe('gemini');
    });
  });

  describe('enrich', () => {
    const mockSuccessResponse: GptEnrichmentResponse = {
      definition: 'The occurrence of events by chance in a happy way',
      ipa: '/ˌserənˈdɪpɪti/',
      type: 'noun',
      examples: [
        'Finding that book was pure serendipity.',
        'It was serendipity that we met at the conference.',
      ],
    };

    it('should call Gemini API with correct URL including API key', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockSuccessResponse),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      await provider.enrich('serendipity', 'en');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('generativelanguage.googleapis.com');
      expect(calledUrl).toContain(`key=${mockApiKey}`);
    });

    it('should include text and language in the prompt', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockSuccessResponse),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      await provider.enrich('serendipity', 'en');

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      const promptText = body.contents[0].parts[0].text;

      expect(promptText).toContain('serendipity');
      expect(promptText).toContain('en');
    });

    it('should return parsed GptEnrichmentResponse on success', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockSuccessResponse),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      const result = await provider.enrich('serendipity', 'en');

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle JSON response wrapped in markdown code block', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `\`\`\`json\n${JSON.stringify(mockSuccessResponse)}\n\`\`\``,
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      const result = await provider.enrich('serendipity', 'en');

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw error when API returns non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            message: 'Invalid API key',
          },
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Gemini API error: Invalid API key'
      );
    });

    it('should throw error when API returns empty candidates', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Gemini API returned no response'
      );
    });

    it('should throw error when response is not valid JSON', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'This is not valid JSON',
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Failed to parse Gemini response as JSON'
      );
    });

    it('should throw error when network request fails', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Network error'
      );
    });

    it('should throw error when response is missing required fields', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      definition: 'A definition',
                      // Missing ipa, type, examples
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Invalid response structure from Gemini'
      );
    });

    it('should handle response with missing content parts gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [],
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Gemini API returned empty content'
      );
    });
  });
});
