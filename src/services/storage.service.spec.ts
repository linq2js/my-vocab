import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteDB } from 'idb';
import { storageService, DB_NAME, DB_VERSION, type StorageService } from './storage.service';
import type { Vocabulary } from '../types/vocabulary';
import type { GptEnrichmentResponse } from '../types/gpt';

describe('storageService', () => {
  let service: StorageService;

  const mockVocabulary: Vocabulary = {
    id: 'test-id-1',
    text: 'serendipity',
    description: 'A happy accident',
    tags: ['vocabulary', 'positive', 'rare'],
    language: 'en',
    definition: 'The occurrence of events by chance in a happy way',
    ipa: '/ˌserənˈdɪpɪti/',
    examples: ['Finding that book was pure serendipity.'],
    partOfSpeech: 'noun',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    service = storageService();
  });

  afterEach(async () => {
    // Close connection before deleting DB
    service.close();
    await deleteDB(DB_NAME);
  });

  describe('database initialization', () => {
    it('should export correct database name and version', () => {
      expect(DB_NAME).toBe('myvocab-db');
      expect(DB_VERSION).toBe(1);
    });

    it('should initialize database on first access', async () => {
      const result = await service.getAllVocabularies();
      expect(result).toEqual([]);
    });
  });

  describe('vocabulary CRUD operations', () => {
    describe('addVocabulary', () => {
      it('should add a vocabulary entry', async () => {
        const id = await service.addVocabulary(mockVocabulary);
        expect(id).toBe(mockVocabulary.id);
      });

      it('should be retrievable after adding', async () => {
        await service.addVocabulary(mockVocabulary);
        const retrieved = await service.getVocabulary(mockVocabulary.id);
        expect(retrieved).toEqual(mockVocabulary);
      });
    });

    describe('getVocabulary', () => {
      it('should return undefined for non-existent id', async () => {
        const result = await service.getVocabulary('non-existent-id');
        expect(result).toBeUndefined();
      });

      it('should return the vocabulary entry by id', async () => {
        await service.addVocabulary(mockVocabulary);
        const result = await service.getVocabulary(mockVocabulary.id);
        expect(result?.text).toBe('serendipity');
      });
    });

    describe('getAllVocabularies', () => {
      it('should return empty array when no vocabularies exist', async () => {
        const result = await service.getAllVocabularies();
        expect(result).toEqual([]);
      });

      it('should return all vocabularies', async () => {
        const vocab2: Vocabulary = {
          ...mockVocabulary,
          id: 'test-id-2',
          text: 'ephemeral',
        };
        await service.addVocabulary(mockVocabulary);
        await service.addVocabulary(vocab2);
        const result = await service.getAllVocabularies();
        expect(result).toHaveLength(2);
      });
    });

    describe('updateVocabulary', () => {
      it('should update an existing vocabulary entry', async () => {
        await service.addVocabulary(mockVocabulary);
        const updated: Vocabulary = {
          ...mockVocabulary,
          text: 'updated-serendipity',
          updatedAt: new Date('2026-01-02'),
        };
        await service.updateVocabulary(updated);
        const result = await service.getVocabulary(mockVocabulary.id);
        expect(result?.text).toBe('updated-serendipity');
      });
    });

    describe('deleteVocabulary', () => {
      it('should delete a vocabulary entry', async () => {
        await service.addVocabulary(mockVocabulary);
        await service.deleteVocabulary(mockVocabulary.id);
        const result = await service.getVocabulary(mockVocabulary.id);
        expect(result).toBeUndefined();
      });

      it('should not throw when deleting non-existent entry', async () => {
        await expect(service.deleteVocabulary('non-existent')).resolves.not.toThrow();
      });
    });
  });

  describe('vocabulary queries', () => {
    describe('getVocabulariesByLanguage', () => {
      it('should return vocabularies filtered by language', async () => {
        const spanishVocab: Vocabulary = {
          ...mockVocabulary,
          id: 'spanish-1',
          text: 'hola',
          language: 'es',
        };
        await service.addVocabulary(mockVocabulary);
        await service.addVocabulary(spanishVocab);
        const result = await service.getVocabulariesByLanguage('en');
        expect(result).toHaveLength(1);
        expect(result[0]?.language).toBe('en');
      });
    });

  });

  describe('GPT cache operations', () => {
    const mockCacheEntry = {
      key: 'serendipity_en',
      response: {
        definition: 'The occurrence of events by chance in a happy way',
        ipa: '/ˌserənˈdɪpɪti/',
        type: 'noun',
        examples: ['Finding that book was pure serendipity.'],
      } as GptEnrichmentResponse,
      createdAt: new Date('2026-01-01'),
    };

    describe('getCachedGptResponse', () => {
      it('should return undefined for non-existent cache key', async () => {
        const result = await service.getCachedGptResponse('non-existent');
        expect(result).toBeUndefined();
      });

      it('should return cached response when exists', async () => {
        await service.cacheGptResponse(
          mockCacheEntry.key,
          mockCacheEntry.response
        );
        const result = await service.getCachedGptResponse(mockCacheEntry.key);
        expect(result?.definition).toBe(mockCacheEntry.response.definition);
      });
    });

    describe('cacheGptResponse', () => {
      it('should cache a GPT response', async () => {
        await service.cacheGptResponse(
          mockCacheEntry.key,
          mockCacheEntry.response
        );
        const result = await service.getCachedGptResponse(mockCacheEntry.key);
        expect(result).toBeDefined();
      });

      it('should overwrite existing cache entry', async () => {
        await service.cacheGptResponse(
          mockCacheEntry.key,
          mockCacheEntry.response
        );
        const updatedResponse: GptEnrichmentResponse = {
          ...mockCacheEntry.response,
          definition: 'Updated definition',
        };
        await service.cacheGptResponse(mockCacheEntry.key, updatedResponse);
        const result = await service.getCachedGptResponse(mockCacheEntry.key);
        expect(result?.definition).toBe('Updated definition');
      });
    });

    describe('clearGptCache', () => {
      it('should clear all cached GPT responses', async () => {
        await service.cacheGptResponse(
          mockCacheEntry.key,
          mockCacheEntry.response
        );
        await service.cacheGptResponse('another_key', mockCacheEntry.response);
        await service.clearGptCache();
        const result1 = await service.getCachedGptResponse(mockCacheEntry.key);
        const result2 = await service.getCachedGptResponse('another_key');
        expect(result1).toBeUndefined();
        expect(result2).toBeUndefined();
      });
    });
  });

  describe('close', () => {
    it('should close the database connection', () => {
      // This test verifies close doesn't throw
      expect(() => service.close()).not.toThrow();
    });

    it('should allow reopening after close', async () => {
      await service.addVocabulary(mockVocabulary);
      service.close();
      
      // Create new service instance
      const newService = storageService();
      const result = await newService.getVocabulary(mockVocabulary.id);
      expect(result?.text).toBe('serendipity');
      newService.close();
    });
  });
});
