/**
 * IndexedDB Storage Service for MyVocab PWA
 *
 * Provides persistent storage for vocabulary entries and GPT response caching.
 * Uses the idb library for a promise-based IndexedDB API.
 *
 * Object Stores:
 * - vocabularies: Stores Vocabulary entries with indexes on language, contentType, tags, createdAt
 * - gpt_cache: Caches GPT enrichment responses keyed by {word}_{language}
 *
 * @example
 * ```typescript
 * const storage = storageService();
 *
 * // Add a vocabulary
 * await storage.addVocabulary(vocab);
 *
 * // Get cached GPT response
 * const cached = await storage.getCachedGptResponse('serendipity_en');
 *
 * // Close connection when done (important for tests)
 * storage.close();
 * ```
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Vocabulary } from '../types/vocabulary';
import type { GptEnrichmentResponse } from '../types/gpt';

/** Database name for MyVocab PWA */
export const DB_NAME = 'myvocab-db';

/** Current database version */
export const DB_VERSION = 1;

/**
 * GPT cache entry structure stored in IndexedDB.
 */
export interface GptCacheEntry {
  /** Cache key in format {word}_{language} */
  key: string;
  /** The cached GPT enrichment response */
  response: GptEnrichmentResponse;
  /** Timestamp when the entry was cached */
  createdAt: Date;
}

/**
 * Legacy vocabulary type that may have contentType field (for migration).
 */
interface LegacyVocabulary extends Vocabulary {
  contentType?: string;
}

/**
 * IndexedDB schema definition for type safety.
 */
interface MyVocabDB extends DBSchema {
  vocabularies: {
    key: string;
    value: LegacyVocabulary;
    indexes: {
      'by-language': string;
      'by-contentType': string;  // Keep for backward compatibility
      'by-createdAt': Date;
    };
  };
  gpt_cache: {
    key: string;
    value: GptCacheEntry;
    indexes: {
      'by-createdAt': Date;
    };
  };
}

/**
 * Storage service interface type.
 */
export interface StorageService {
  addVocabulary: (vocabulary: Vocabulary) => Promise<string>;
  getVocabulary: (id: string) => Promise<Vocabulary | undefined>;
  getAllVocabularies: () => Promise<Vocabulary[]>;
  updateVocabulary: (vocabulary: Vocabulary) => Promise<void>;
  deleteVocabulary: (id: string) => Promise<void>;
  getVocabulariesByLanguage: (language: string) => Promise<Vocabulary[]>;
  getCachedGptResponse: (key: string) => Promise<GptEnrichmentResponse | undefined>;
  cacheGptResponse: (key: string, response: GptEnrichmentResponse) => Promise<void>;
  clearGptCache: () => Promise<void>;
  /** Clears all vocabulary data from the database */
  clearAllVocabularies: () => Promise<void>;
  /** Clears all data (vocabularies and GPT cache) from the database */
  clearAllData: () => Promise<void>;
  /** Gets the count of vocabulary items */
  getVocabularyCount: () => Promise<number>;
  /** Closes the database connection. Important for cleanup in tests. */
  close: () => void;
}

/**
 * Creates a storage service for vocabulary data and GPT response caching.
 * Implements CRUD operations for vocabularies and cache management for GPT responses.
 *
 * @returns Storage service instance with all CRUD and cache operations
 */
export function storageService(): StorageService {
  let dbPromise: Promise<IDBPDatabase<MyVocabDB>> | null = null;
  let db: IDBPDatabase<MyVocabDB> | null = null;

  /**
   * Gets or creates the database connection.
   * Uses lazy initialization and caches the connection.
   */
  const getDB = async (): Promise<IDBPDatabase<MyVocabDB>> => {
    if (db) return db;
    
    if (!dbPromise) {
      dbPromise = openDB<MyVocabDB>(DB_NAME, DB_VERSION, {
        upgrade(database) {
          // Create vocabularies object store
          if (!database.objectStoreNames.contains('vocabularies')) {
            const vocabStore = database.createObjectStore('vocabularies', {
              keyPath: 'id',
            });
            vocabStore.createIndex('by-language', 'language');
            vocabStore.createIndex('by-contentType', 'contentType');
            vocabStore.createIndex('by-createdAt', 'createdAt');
          }

          // Create gpt_cache object store
          if (!database.objectStoreNames.contains('gpt_cache')) {
            const cacheStore = database.createObjectStore('gpt_cache', {
              keyPath: 'key',
            });
            cacheStore.createIndex('by-createdAt', 'createdAt');
          }
        },
      });
    }
    
    db = await dbPromise;
    return db;
  };

  /**
   * Closes the database connection.
   * Important for cleanup in tests to allow deleteDB to work.
   */
  const close = (): void => {
    if (db) {
      db.close();
      db = null;
      dbPromise = null;
    }
  };

  /**
   * Adds a new vocabulary entry to the database.
   *
   * @param vocabulary - The vocabulary entry to add
   * @returns Promise resolving to the vocabulary's id
   */
  const addVocabulary = async (vocabulary: Vocabulary): Promise<string> => {
    const database = await getDB();
    await database.put('vocabularies', vocabulary);
    return vocabulary.id;
  };

  /**
   * Retrieves a vocabulary entry by its id.
   *
   * @param id - The vocabulary id to look up
   * @returns Promise resolving to the vocabulary or undefined if not found
   */
  const getVocabulary = async (id: string): Promise<Vocabulary | undefined> => {
    const database = await getDB();
    return database.get('vocabularies', id);
  };

  /**
   * Retrieves all vocabulary entries from the database.
   * Migrates legacy entries that have contentType to use tags instead.
   *
   * @returns Promise resolving to an array of all vocabularies
   */
  const getAllVocabularies = async (): Promise<Vocabulary[]> => {
    const database = await getDB();
    const rawVocabularies = await database.getAll('vocabularies');
    
    // Migrate legacy entries that have contentType
    const migratedVocabularies: Vocabulary[] = [];
    const updatePromises: Promise<void>[] = [];
    
    for (const vocab of rawVocabularies) {
      const legacyVocab = vocab as LegacyVocabulary;
      
      if (legacyVocab.contentType && !legacyVocab.tags.includes(legacyVocab.contentType)) {
        // Add contentType to tags if not already present
        const migratedVocab: Vocabulary = {
          ...legacyVocab,
          tags: [legacyVocab.contentType, ...legacyVocab.tags],
        };
        // Remove contentType from the object (it's now in tags)
        delete (migratedVocab as LegacyVocabulary).contentType;
        
        migratedVocabularies.push(migratedVocab);
        // Update in database (fire and forget, but collect promises)
        updatePromises.push(database.put('vocabularies', migratedVocab as LegacyVocabulary).then(() => {}));
      } else {
        // Remove contentType if present (already in tags)
        const cleanVocab = { ...legacyVocab };
        delete cleanVocab.contentType;
        migratedVocabularies.push(cleanVocab as Vocabulary);
      }
    }
    
    // Wait for all migrations to complete
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return migratedVocabularies;
  };

  /**
   * Updates an existing vocabulary entry.
   * Uses put operation which will create if not exists.
   *
   * @param vocabulary - The vocabulary entry with updated values
   * @returns Promise resolving when update is complete
   */
  const updateVocabulary = async (vocabulary: Vocabulary): Promise<void> => {
    const database = await getDB();
    await database.put('vocabularies', vocabulary);
  };

  /**
   * Deletes a vocabulary entry by its id.
   *
   * @param id - The vocabulary id to delete
   * @returns Promise resolving when deletion is complete
   */
  const deleteVocabulary = async (id: string): Promise<void> => {
    const database = await getDB();
    await database.delete('vocabularies', id);
  };

  /**
   * Retrieves vocabularies filtered by language code.
   *
   * @param language - The language code to filter by (e.g., 'en', 'es')
   * @returns Promise resolving to an array of matching vocabularies
   */
  const getVocabulariesByLanguage = async (
    language: string
  ): Promise<Vocabulary[]> => {
    const database = await getDB();
    return database.getAllFromIndex('vocabularies', 'by-language', language);
  };

  /**
   * Retrieves a cached GPT response by cache key.
   * Cache key format: {word}_{language}
   *
   * @param key - The cache key to look up
   * @returns Promise resolving to the cached response or undefined if not found
   */
  const getCachedGptResponse = async (
    key: string
  ): Promise<GptEnrichmentResponse | undefined> => {
    const database = await getDB();
    const entry = await database.get('gpt_cache', key);
    return entry?.response;
  };

  /**
   * Caches a GPT enrichment response.
   * Overwrites existing entry if key already exists.
   *
   * @param key - The cache key (format: {word}_{language})
   * @param response - The GPT enrichment response to cache
   * @returns Promise resolving when caching is complete
   */
  const cacheGptResponse = async (
    key: string,
    response: GptEnrichmentResponse
  ): Promise<void> => {
    const database = await getDB();
    const entry: GptCacheEntry = {
      key,
      response,
      createdAt: new Date(),
    };
    await database.put('gpt_cache', entry);
  };

  /**
   * Clears all cached GPT responses.
   * Useful for freeing storage or forcing fresh API calls.
   *
   * @returns Promise resolving when cache is cleared
   */
  const clearGptCache = async (): Promise<void> => {
    const database = await getDB();
    await database.clear('gpt_cache');
  };

  /**
   * Clears all vocabulary entries from the database.
   * Does not affect GPT cache or settings.
   *
   * @returns Promise resolving when vocabularies are cleared
   */
  const clearAllVocabularies = async (): Promise<void> => {
    const database = await getDB();
    await database.clear('vocabularies');
  };

  /**
   * Clears all data from the database (vocabularies and GPT cache).
   * Does not affect settings stored in localStorage.
   *
   * @returns Promise resolving when all data is cleared
   */
  const clearAllData = async (): Promise<void> => {
    const database = await getDB();
    await database.clear('vocabularies');
    await database.clear('gpt_cache');
  };

  /**
   * Gets the count of vocabulary items in the database.
   *
   * @returns Promise resolving to the number of vocabulary items
   */
  const getVocabularyCount = async (): Promise<number> => {
    const database = await getDB();
    return database.count('vocabularies');
  };

  return {
    // Vocabulary CRUD
    addVocabulary,
    getVocabulary,
    getAllVocabularies,
    updateVocabulary,
    deleteVocabulary,

    // Vocabulary queries
    getVocabulariesByLanguage,
    getVocabularyCount,

    // GPT cache
    getCachedGptResponse,
    cacheGptResponse,
    clearGptCache,

    // Data management
    clearAllVocabularies,
    clearAllData,

    // Lifecycle
    close,
  };
}
