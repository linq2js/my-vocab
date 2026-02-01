/**
 * Tests for Vocabulary Store
 *
 * Tests the vocab store's reactive state management and IndexedDB persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createVocabStore, type VocabStore } from './vocab.store';
import type { Vocabulary, ContentType } from '../types/vocabulary';
import type { StorageService } from '../services/storage.service';

/**
 * Creates a mock vocabulary entry for testing.
 */
function createMockVocabulary(overrides: Partial<Vocabulary> = {}): Vocabulary {
  return {
    id: `vocab_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    text: 'serendipity',
    description: 'A happy accident',
    tags: ['positive', 'rare'],
    language: 'en',
    contentType: 'vocabulary',
    definition: 'The occurrence of events by chance in a happy way',
    ipa: '/ˌserənˈdɪpɪti/',
    examples: ['Finding that book was pure serendipity.'],
    partOfSpeech: 'noun',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock storage service for testing.
 */
function createMockStorageService(
  initialVocabs: Vocabulary[] = []
): StorageService {
  let vocabs = [...initialVocabs];

  return {
    addVocabulary: vi.fn(async (vocab: Vocabulary) => {
      vocabs.push(vocab);
      return vocab.id;
    }),
    getVocabulary: vi.fn(async (id: string) => {
      return vocabs.find((v) => v.id === id);
    }),
    getAllVocabularies: vi.fn(async () => [...vocabs]),
    updateVocabulary: vi.fn(async (vocab: Vocabulary) => {
      const index = vocabs.findIndex((v) => v.id === vocab.id);
      if (index !== -1) {
        vocabs[index] = vocab;
      }
    }),
    deleteVocabulary: vi.fn(async (id: string) => {
      vocabs = vocabs.filter((v) => v.id !== id);
    }),
    getVocabulariesByLanguage: vi.fn(async (language: string) => {
      return vocabs.filter((v) => v.language === language);
    }),
    getVocabulariesByContentType: vi.fn(async (contentType: ContentType) => {
      return vocabs.filter((v) => v.contentType === contentType);
    }),
    getCachedGptResponse: vi.fn(async () => undefined),
    cacheGptResponse: vi.fn(async () => {}),
    clearGptCache: vi.fn(async () => {}),
    close: vi.fn(),
  };
}

describe('vocabStore', () => {
  let store: VocabStore;
  let mockStorage: StorageService;

  beforeEach(() => {
    mockStorage = createMockStorageService();
    store = createVocabStore({ storage: mockStorage });
  });

  afterEach(() => {
    store.close();
  });

  describe('initialization', () => {
    it('should start with empty items', () => {
      expect(store.items$.get()).toEqual([]);
    });

    it('should load items from storage on init', async () => {
      const existingVocabs = [
        createMockVocabulary({ id: 'v1', text: 'word1' }),
        createMockVocabulary({ id: 'v2', text: 'word2' }),
      ];
      mockStorage = createMockStorageService(existingVocabs);
      store = createVocabStore({ storage: mockStorage });

      await store.init();

      const items = store.items$.get();
      expect(items).toHaveLength(2);
      expect(items[0]?.text).toBe('word1');
    });

    it('should not load twice if already initialized', async () => {
      await store.init();
      await store.init();

      expect(mockStorage.getAllVocabularies).toHaveBeenCalledTimes(1);
    });
  });

  describe('add', () => {
    it('should add a new vocabulary item', async () => {
      const vocab = createMockVocabulary({ id: 'new-vocab' });

      await store.add(vocab);

      const items = store.items$.get();
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('new-vocab');
    });

    it('should persist to storage when adding', async () => {
      const vocab = createMockVocabulary();

      await store.add(vocab);

      expect(mockStorage.addVocabulary).toHaveBeenCalledWith(vocab);
    });

    it('should set createdAt and updatedAt if not provided', async () => {
      const vocab = createMockVocabulary();
      // Remove dates to test auto-setting
      const vocabWithoutDates = {
        ...vocab,
        createdAt: undefined as unknown as Date,
        updatedAt: undefined as unknown as Date,
      };

      await store.add(vocabWithoutDates);

      const added = store.items$.get()[0];
      expect(added).toBeDefined();
      expect(added?.createdAt).toBeInstanceOf(Date);
      expect(added?.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate id if not provided', async () => {
      const vocab = createMockVocabulary();
      const vocabWithoutId = { ...vocab, id: '' };

      await store.add(vocabWithoutId);

      const added = store.items$.get()[0];
      expect(added).toBeDefined();
      expect(added?.id).toBeTruthy();
      expect(added?.id.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update an existing vocabulary item', async () => {
      const vocab = createMockVocabulary({ id: 'update-test' });
      await store.add(vocab);

      const updated = { ...vocab, text: 'updated-text' };
      await store.update(updated);

      expect(store.items$.get()[0]?.text).toBe('updated-text');
    });

    it('should persist update to storage', async () => {
      const vocab = createMockVocabulary();
      await store.add(vocab);

      const updated = { ...vocab, text: 'updated' };
      await store.update(updated);

      expect(mockStorage.updateVocabulary).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'updated' })
      );
    });

    it('should update updatedAt timestamp', async () => {
      const vocab = createMockVocabulary({ id: 'timestamp-test' });
      const originalUpdatedAt = new Date('2020-01-01');
      vocab.updatedAt = originalUpdatedAt;
      await store.add(vocab);

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await store.update({ ...vocab, text: 'changed' });

      const updated = store.items$.get()[0];
      expect(updated).toBeDefined();
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should not update if item does not exist', async () => {
      const vocab = createMockVocabulary({ id: 'non-existent' });

      await store.update(vocab);

      expect(store.items$.get()).toHaveLength(0);
      expect(mockStorage.updateVocabulary).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a vocabulary item by id', async () => {
      const vocab = createMockVocabulary({ id: 'remove-test' });
      await store.add(vocab);

      await store.remove('remove-test');

      expect(store.items$.get()).toHaveLength(0);
    });

    it('should persist removal to storage', async () => {
      const vocab = createMockVocabulary({ id: 'persist-remove' });
      await store.add(vocab);

      await store.remove('persist-remove');

      expect(mockStorage.deleteVocabulary).toHaveBeenCalledWith('persist-remove');
    });

    it('should handle removing non-existent item gracefully', async () => {
      await store.remove('non-existent');

      expect(store.items$.get()).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return vocabulary by id', async () => {
      const vocab = createMockVocabulary({ id: 'find-test', text: 'findme' });
      await store.add(vocab);

      const found = store.getById('find-test');

      expect(found?.text).toBe('findme');
    });

    it('should return undefined for non-existent id', () => {
      const found = store.getById('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('filter', () => {
    beforeEach(async () => {
      await store.add(
        createMockVocabulary({
          id: 'v1',
          text: 'hello',
          language: 'en',
          contentType: 'vocabulary',
          tags: ['greeting'],
        })
      );
      await store.add(
        createMockVocabulary({
          id: 'v2',
          text: 'bonjour',
          language: 'fr',
          contentType: 'vocabulary',
          tags: ['greeting', 'formal'],
        })
      );
      await store.add(
        createMockVocabulary({
          id: 'v3',
          text: 'break a leg',
          language: 'en',
          contentType: 'idiom',
          tags: ['luck'],
        })
      );
    });

    it('should filter by language', () => {
      const filtered = store.filter({ language: 'en' });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((v) => v.language === 'en')).toBe(true);
    });

    it('should filter by contentType', () => {
      const filtered = store.filter({ contentType: 'idiom' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.text).toBe('break a leg');
    });

    it('should filter by tag', () => {
      const filtered = store.filter({ tag: 'greeting' });

      expect(filtered).toHaveLength(2);
    });

    it('should filter by search text (case-insensitive)', () => {
      const filtered = store.filter({ searchText: 'HELLO' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.text).toBe('hello');
    });

    it('should combine multiple filters', () => {
      const filtered = store.filter({
        language: 'en',
        contentType: 'vocabulary',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.text).toBe('hello');
    });

    it('should return all items when no filters provided', () => {
      const filtered = store.filter({});

      expect(filtered).toHaveLength(3);
    });

    it('should search in text and description', async () => {
      // Add item with description
      await store.add(
        createMockVocabulary({
          id: 'v4',
          text: 'xyz',
          description: 'searchable description',
          language: 'en',
        })
      );

      const filtered = store.filter({ searchText: 'searchable' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('v4');
    });
  });

  describe('clear', () => {
    it('should remove all items from store', async () => {
      await store.add(createMockVocabulary({ id: 'v1' }));
      await store.add(createMockVocabulary({ id: 'v2' }));

      await store.clear();

      expect(store.items$.get()).toHaveLength(0);
    });

    it('should persist clear to storage', async () => {
      await store.add(createMockVocabulary({ id: 'v1' }));
      await store.add(createMockVocabulary({ id: 'v2' }));

      await store.clear();

      expect(mockStorage.deleteVocabulary).toHaveBeenCalledTimes(2);
    });
  });

  describe('reactive updates', () => {
    it('should notify subscribers when items change', async () => {
      let notificationCount = 0;
      const unsubscribe = store.items$.on(() => {
        notificationCount++;
      });

      await store.add(createMockVocabulary({ id: 'v1' }));
      await store.add(createMockVocabulary({ id: 'v2' }));

      unsubscribe();

      // Should have been notified for each add
      expect(notificationCount).toBeGreaterThanOrEqual(2);
      expect(store.items$.get()).toHaveLength(2);
    });
  });
});
