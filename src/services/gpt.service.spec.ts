/**
 * Tests for GPT Service.
 *
 * Tests the main GPT service that orchestrates provider selection,
 * caching, and error handling for vocabulary enrichment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gptService, type GptService } from './gpt.service';
import type { CacheService } from './cache.service';
import type { SettingsStorageService } from './settings-storage.service';
import type { IGptProvider } from './gpt-provider.interface';
import type { GptEnrichmentResponse } from '../types/gpt';
import type { AppSettings } from '../types/settings';

describe('gptService', () => {
  let service: GptService;
  let mockCacheService: CacheService;
  let mockSettingsStorage: SettingsStorageService;
  let mockOpenAIProvider: IGptProvider;
  let mockGeminiProvider: IGptProvider;

  const mockEnrichmentResponse: GptEnrichmentResponse = {
    definition: 'The occurrence of events by chance in a happy way',
    ipa: '/ˌserənˈdɪpɪti/',
    type: 'noun',
    examples: [
      'Finding that book was pure serendipity.',
      'It was serendipity that we met at the conference.',
    ],
  };

  const mockSettings: AppSettings = {
    providers: [
      { id: 'openai', name: 'OpenAI', apiKey: 'sk-test-key', isActive: true },
      { id: 'gemini', name: 'Gemini', apiKey: 'AIzaSy-test', isActive: true },
    ],
    activeProviderId: 'openai',
    theme: 'system',
    defaultLanguage: 'en',
    extraEnrichment: {},
    lastUsedLanguage: 'en',
    lastUsedCategories: [],
    lastUsedExtraEnrichment: {},
    nativeLanguage: 'en',
    translationStyles: [],
  };

  beforeEach(() => {
    // Create mock cache service
    mockCacheService = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockResolvedValue(false),
      clear: vi.fn().mockResolvedValue(undefined),
      getTranslation: vi.fn().mockResolvedValue(undefined),
      setTranslation: vi.fn().mockResolvedValue(undefined),
      deleteTranslation: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    };

    // Create mock settings storage
    mockSettingsStorage = {
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      saveSettings: vi.fn().mockResolvedValue(undefined),
      clearSettings: vi.fn().mockResolvedValue(undefined),
      hasSettings: vi.fn().mockReturnValue(true),
    };

    // Create mock providers
    mockOpenAIProvider = {
      providerId: 'openai',
      enrich: vi.fn().mockResolvedValue(mockEnrichmentResponse),
      translate: vi.fn().mockResolvedValue('Bonjour le monde'),
      improveStylePrompt: vi.fn().mockResolvedValue('Improved style prompt'),
      explain: vi.fn().mockResolvedValue('This is an explanation of the text.'),
      rephrase: vi.fn().mockResolvedValue('This is the rephrased text.'),
      detectLanguage: vi.fn().mockResolvedValue('en'),
      suggestReply: vi.fn().mockResolvedValue('Thank you for your message.'),
    };

    mockGeminiProvider = {
      providerId: 'gemini',
      enrich: vi.fn().mockResolvedValue(mockEnrichmentResponse),
      translate: vi.fn().mockResolvedValue('Bonjour le monde'),
      improveStylePrompt: vi.fn().mockResolvedValue('Improved style prompt'),
      explain: vi.fn().mockResolvedValue('This is an explanation of the text.'),
      rephrase: vi.fn().mockResolvedValue('This is the rephrased text.'),
      detectLanguage: vi.fn().mockResolvedValue('en'),
      suggestReply: vi.fn().mockResolvedValue('Thank you for your message.'),
    };

    // Create service with mocks
    service = gptService({
      cache: mockCacheService,
      settingsStorage: mockSettingsStorage,
      providerFactory: (id, _apiKey) => {
        if (id === 'openai') return mockOpenAIProvider;
        if (id === 'gemini') return mockGeminiProvider;
        throw new Error(`Unknown provider: ${id}`);
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enrich', () => {
    it('should return cached response if available', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(mockEnrichmentResponse);

      const result = await service.enrich('serendipity', 'en');

      expect(result).toEqual(mockEnrichmentResponse);
      expect(mockCacheService.get).toHaveBeenCalledWith('serendipity', 'en');
      expect(mockOpenAIProvider.enrich).not.toHaveBeenCalled();
    });

    it('should call provider and cache response when not cached', async () => {
      vi.mocked(mockCacheService.get).mockResolvedValue(undefined);

      const result = await service.enrich('serendipity', 'en');

      expect(result).toEqual(mockEnrichmentResponse);
      expect(mockCacheService.get).toHaveBeenCalledWith('serendipity', 'en');
      expect(mockOpenAIProvider.enrich).toHaveBeenCalledWith('serendipity', 'en', undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'serendipity',
        'en',
        mockEnrichmentResponse
      );
    });

    it('should use active provider from settings', async () => {
      const geminiSettings: AppSettings = {
        ...mockSettings,
        activeProviderId: 'gemini',
      };
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue(geminiSettings);

      await service.enrich('serendipity', 'en');

      expect(mockGeminiProvider.enrich).toHaveBeenCalledWith('serendipity', 'en', undefined);
      expect(mockOpenAIProvider.enrich).not.toHaveBeenCalled();
    });

    it('should throw error when no active provider is configured', async () => {
      const noProviderSettings: AppSettings = {
        ...mockSettings,
        providers: [],
        activeProviderId: 'openai', // Keep valid ID but no providers
      };
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue(noProviderSettings);

      await expect(service.enrich('serendipity', 'en')).rejects.toThrow(
        'No active GPT provider configured'
      );
    });

    it('should throw error when active provider has no API key', async () => {
      const noKeySettings: AppSettings = {
        ...mockSettings,
        providers: [
          { id: 'openai', name: 'OpenAI', apiKey: '', isActive: true },
        ],
      };
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue(noKeySettings);

      await expect(service.enrich('serendipity', 'en')).rejects.toThrow(
        'API key not configured for provider: openai'
      );
    });

    it('should retry on provider failure', async () => {
      vi.mocked(mockOpenAIProvider.enrich)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEnrichmentResponse);

      const result = await service.enrich('serendipity', 'en');

      expect(result).toEqual(mockEnrichmentResponse);
      expect(mockOpenAIProvider.enrich).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      vi.mocked(mockOpenAIProvider.enrich).mockRejectedValue(new Error('Network error'));

      await expect(service.enrich('serendipity', 'en')).rejects.toThrow(
        'Failed to enrich vocabulary after 3 attempts: Network error'
      );
      expect(mockOpenAIProvider.enrich).toHaveBeenCalledTimes(3);
    });

    it('should not cache failed responses', async () => {
      vi.mocked(mockOpenAIProvider.enrich).mockRejectedValue(new Error('API error'));

      await expect(service.enrich('serendipity', 'en')).rejects.toThrow();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle empty text input', async () => {
      await expect(service.enrich('', 'en')).rejects.toThrow(
        'Text is required for enrichment'
      );
      expect(mockOpenAIProvider.enrich).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only text input', async () => {
      await expect(service.enrich('   ', 'en')).rejects.toThrow(
        'Text is required for enrichment'
      );
      expect(mockOpenAIProvider.enrich).not.toHaveBeenCalled();
    });

    it('should handle empty language input', async () => {
      await expect(service.enrich('serendipity', '')).rejects.toThrow(
        'Language is required for enrichment'
      );
      expect(mockOpenAIProvider.enrich).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await service.clearCache();

      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the cache service', () => {
      service.close();

      expect(mockCacheService.close).toHaveBeenCalled();
    });
  });

  describe('checkApiKeyStatus', () => {
    it('should return configured status when API key is present', async () => {
      const status = await service.checkApiKeyStatus();

      expect(status).toEqual({
        isConfigured: true,
        providerId: 'openai',
        providerName: 'OpenAI',
      });
    });

    it('should return not configured when API key is empty', async () => {
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        providers: [
          { id: 'openai', name: 'OpenAI', apiKey: '', isActive: true },
        ],
      });

      const status = await service.checkApiKeyStatus();

      expect(status).toEqual({
        isConfigured: false,
        providerId: 'openai',
        providerName: 'OpenAI',
      });
    });

    it('should return not configured when no active provider', async () => {
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        activeProviderId: null as unknown as 'openai', // Testing edge case
        providers: [],
      });

      const status = await service.checkApiKeyStatus();

      expect(status).toEqual({
        isConfigured: false,
        providerId: null,
        providerName: null,
      });
    });

    it('should return not configured when provider not found', async () => {
      vi.mocked(mockSettingsStorage.getSettings).mockResolvedValue({
        ...mockSettings,
        activeProviderId: 'unknown' as 'openai', // Testing edge case with unknown provider
      });

      const status = await service.checkApiKeyStatus();

      expect(status).toEqual({
        isConfigured: false,
        providerId: 'unknown',
        providerName: null,
      });
    });
  });

  describe('translate', () => {
    it('should return cached translation if available', async () => {
      vi.mocked(mockCacheService.getTranslation).mockResolvedValue('Bonjour');

      const result = await service.translate('Hello', 'en', 'fr');

      expect(result).toEqual({
        text: 'Bonjour',
        fromCache: true,
        cacheKey: 'translate:en:fr:none:hello',
      });
      expect(mockCacheService.getTranslation).toHaveBeenCalledWith('translate:en:fr:none:hello');
      expect(mockOpenAIProvider.translate).not.toHaveBeenCalled();
    });

    it('should call provider and cache translation when not cached', async () => {
      vi.mocked(mockCacheService.getTranslation).mockResolvedValue(undefined);
      vi.mocked(mockOpenAIProvider.translate).mockResolvedValue('Bonjour le monde');

      const result = await service.translate('Hello world', 'en', 'fr');

      expect(result).toEqual({
        text: 'Bonjour le monde',
        fromCache: false,
        cacheKey: 'translate:en:fr:none:hello world',
      });
      expect(mockOpenAIProvider.translate).toHaveBeenCalledWith('Hello world', 'en', 'fr', undefined);
      expect(mockCacheService.setTranslation).toHaveBeenCalledWith(
        'translate:en:fr:none:hello world',
        'Bonjour le monde'
      );
    });

    it('should include style ID in cache key when provided', async () => {
      vi.mocked(mockCacheService.getTranslation).mockResolvedValue(undefined);
      vi.mocked(mockOpenAIProvider.translate).mockResolvedValue('Bonjour');

      const result = await service.translate('Hello', 'en', 'fr', 'formal-email', 'Use formal tone');

      expect(result.cacheKey).toBe('translate:en:fr:formal-email:hello');
      expect(mockOpenAIProvider.translate).toHaveBeenCalledWith('Hello', 'en', 'fr', 'Use formal tone');
    });

    it('should throw error when text is empty', async () => {
      await expect(service.translate('', 'en', 'fr')).rejects.toThrow(
        'Text is required for translation'
      );
    });

    it('should throw error when fromLang is empty', async () => {
      await expect(service.translate('Hello', '', 'fr')).rejects.toThrow(
        'Source language is required for translation'
      );
    });

    it('should throw error when toLang is empty', async () => {
      await expect(service.translate('Hello', 'en', '')).rejects.toThrow(
        'Target language is required for translation'
      );
    });

    it('should retry on provider failure', async () => {
      vi.mocked(mockCacheService.getTranslation).mockResolvedValue(undefined);
      vi.mocked(mockOpenAIProvider.translate)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Bonjour');

      const result = await service.translate('Hello', 'en', 'fr');

      expect(result.text).toBe('Bonjour');
      expect(mockOpenAIProvider.translate).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearTranslationCache', () => {
    it('should delete specific translation cache entry', async () => {
      await service.clearTranslationCache('translate:en:fr:none:hello');

      expect(mockCacheService.deleteTranslation).toHaveBeenCalledWith('translate:en:fr:none:hello');
    });
  });

  describe('improveStylePrompt', () => {
    it('should call provider to improve a simple style description', async () => {
      vi.mocked(mockOpenAIProvider.improveStylePrompt).mockResolvedValue(
        'Translate using formal business language suitable for professional email correspondence. Use polite tone, avoid contractions.'
      );

      const result = await service.improveStylePrompt('formal email');

      expect(result).toBe(
        'Translate using formal business language suitable for professional email correspondence. Use polite tone, avoid contractions.'
      );
      expect(mockOpenAIProvider.improveStylePrompt).toHaveBeenCalledWith('formal email');
    });

    it('should throw error when description is empty', async () => {
      await expect(service.improveStylePrompt('')).rejects.toThrow(
        'Description is required'
      );
    });

    it('should retry on provider failure', async () => {
      vi.mocked(mockOpenAIProvider.improveStylePrompt)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Improved prompt');

      const result = await service.improveStylePrompt('casual chat');

      expect(result).toBe('Improved prompt');
      expect(mockOpenAIProvider.improveStylePrompt).toHaveBeenCalledTimes(2);
    });
  });
});
