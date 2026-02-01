/**
 * Tests for OpenAI GPT provider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from './openai.provider';
import type { GptEnrichmentResponse } from '../../types/gpt';

describe('OpenAIProvider', () => {
  const mockApiKey = 'sk-test-api-key-12345';
  let provider: OpenAIProvider;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new OpenAIProvider(mockApiKey);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('providerId', () => {
    it('should return "openai" as provider ID', () => {
      expect(provider.providerId).toBe('openai');
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

    it('should call OpenAI API with correct parameters', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockSuccessResponse),
              },
            },
          ],
        }),
      } as Response);

      await provider.enrich('serendipity', 'en');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockApiKey}`,
          },
        })
      );
    });

    it('should include text and language in the prompt', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockSuccessResponse),
              },
            },
          ],
        }),
      } as Response);

      await provider.enrich('serendipity', 'en');

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      const userMessage = body.messages.find(
        (m: { role: string }) => m.role === 'user'
      );

      expect(userMessage.content).toContain('serendipity');
      expect(userMessage.content).toContain('en');
    });

    it('should return parsed GptEnrichmentResponse on success', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockSuccessResponse),
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
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(mockSuccessResponse)}\n\`\`\``,
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
        'OpenAI API error: Invalid API key'
      );
    });

    it('should throw error when API returns empty choices', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'OpenAI API returned no response'
      );
    });

    it('should throw error when response is not valid JSON', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is not valid JSON',
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Failed to parse OpenAI response as JSON'
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
          choices: [
            {
              message: {
                content: JSON.stringify({
                  definition: 'A definition',
                  // Missing ipa, type, examples
                }),
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.enrich('serendipity', 'en')).rejects.toThrow(
        'Invalid response structure from OpenAI'
      );
    });
  });
});
