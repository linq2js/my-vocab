/**
 * Tests for GPT Cache Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheService, generateCacheKey } from './cache.service';
import type { GptEnrichmentResponse } from '../types/gpt';

// Mock the storage service
const mockStorageService = {
  getCachedGptResponse: vi.fn(),
  cacheGptResponse: vi.fn(),
  clearGptCache: vi.fn(),
  close: vi.fn(),
  addVocabulary: vi.fn(),
  getVocabulary: vi.fn(),
  getAllVocabularies: vi.fn(),
  updateVocabulary: vi.fn(),
  deleteVocabulary: vi.fn(),
  getVocabulariesByLanguage: vi.fn(),
  getVocabulariesByContentType: vi.fn(),
};

vi.mock('./storage.service', () => ({
  storageService: () => mockStorageService,
}));

describe('cacheService', () => {
  let cache: ReturnType<typeof cacheService>;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = cacheService();
  });

  afterEach(() => {
    cache.close();
  });

  describe('generateCacheKey', () => {
    it('should generate key in format word_language', () => {
      expect(generateCacheKey('hello', 'en')).toBe('hello_en');
    });

    it('should convert word to lowercase', () => {
      expect(generateCacheKey('Hello', 'en')).toBe('hello_en');
    });

    it('should convert language to lowercase', () => {
      expect(generateCacheKey('hello', 'EN')).toBe('hello_en');
    });

    it('should trim whitespace from word', () => {
      expect(generateCacheKey('  hello  ', 'en')).toBe('hello_en');
    });

    it('should handle multi-word phrases', () => {
      expect(generateCacheKey('break down', 'en')).toBe('break down_en');
    });
  });

  describe('get', () => {
    it('should return cached response when found', async () => {
      const mockResponse: GptEnrichmentResponse = {
        definition: 'A greeting',
        ipa: '/həˈloʊ/',
        type: 'noun',
        examples: ['Hello, world!'],
      };
      mockStorageService.getCachedGptResponse.mockResolvedValue(mockResponse);

      const result = await cache.get('hello', 'en');

      expect(result).toEqual(mockResponse);
      expect(mockStorageService.getCachedGptResponse).toHaveBeenCalledWith('hello_en');
    });

    it('should return undefined when not found', async () => {
      mockStorageService.getCachedGptResponse.mockResolvedValue(undefined);

      const result = await cache.get('unknown', 'en');

      expect(result).toBeUndefined();
      expect(mockStorageService.getCachedGptResponse).toHaveBeenCalledWith('unknown_en');
    });

    it('should normalize word and language for lookup', async () => {
      mockStorageService.getCachedGptResponse.mockResolvedValue(undefined);

      await cache.get('  Hello  ', 'EN');

      expect(mockStorageService.getCachedGptResponse).toHaveBeenCalledWith('hello_en');
    });
  });

  describe('set', () => {
    it('should cache response with generated key', async () => {
      const response: GptEnrichmentResponse = {
        definition: 'A greeting',
        ipa: '/həˈloʊ/',
        type: 'noun',
        examples: ['Hello, world!'],
      };

      await cache.set('hello', 'en', response);

      expect(mockStorageService.cacheGptResponse).toHaveBeenCalledWith('hello_en', response);
    });

    it('should normalize word and language before caching', async () => {
      const response: GptEnrichmentResponse = {
        definition: 'A greeting',
        ipa: '/həˈloʊ/',
        type: 'noun',
        examples: ['Hello, world!'],
      };

      await cache.set('  Hello  ', 'EN', response);

      expect(mockStorageService.cacheGptResponse).toHaveBeenCalledWith('hello_en', response);
    });
  });

  describe('clear', () => {
    it('should clear all cached responses', async () => {
      await cache.clear();

      expect(mockStorageService.clearGptCache).toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true when cache entry exists', async () => {
      const mockResponse: GptEnrichmentResponse = {
        definition: 'A greeting',
        ipa: '/həˈloʊ/',
        type: 'noun',
        examples: ['Hello, world!'],
      };
      mockStorageService.getCachedGptResponse.mockResolvedValue(mockResponse);

      const result = await cache.has('hello', 'en');

      expect(result).toBe(true);
    });

    it('should return false when cache entry does not exist', async () => {
      mockStorageService.getCachedGptResponse.mockResolvedValue(undefined);

      const result = await cache.has('unknown', 'en');

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('should close the underlying storage service', () => {
      cache.close();

      expect(mockStorageService.close).toHaveBeenCalled();
    });
  });
});
