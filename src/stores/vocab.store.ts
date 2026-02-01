/**
 * Vocabulary Store for MyVocab
 *
 * Reactive state management for vocabulary entries using atomirx patterns.
 * Provides CRUD operations with IndexedDB persistence via the storage service.
 *
 * Features:
 * - Reactive atom-based state (items$)
 * - IndexedDB persistence through storage service
 * - Filtering by language, contentType, tags, and search text
 * - Auto-generation of IDs and timestamps
 *
 * @example
 * ```typescript
 * import { createVocabStore } from './vocab.store';
 * import { useAtomValue } from 'atomirx/react';
 *
 * // Create store instance
 * const vocabStore = createVocabStore();
 *
 * // Initialize (load from storage)
 * await vocabStore.init();
 *
 * // Add vocabulary
 * await vocabStore.add({
 *   text: 'serendipity',
 *   language: 'en',
 *   contentType: 'vocabulary',
 *   tags: ['positive'],
 * });
 *
 * // Filter vocabularies
 * const englishWords = vocabStore.filter({ language: 'en' });
 *
 * // In React component
 * const items = useAtomValue(vocabStore.items$);
 * ```
 */

import { atom } from "atomirx";
import type { Vocabulary } from "../types/vocabulary";
import {
  storageService,
  type StorageService,
} from "../services/storage.service";
import { isPredefinedTag } from "../constants/predefinedTags";

/**
 * Filter options for querying vocabulary items.
 */
export interface VocabFilterOptions {
  /** Filter by language code (e.g., 'en', 'fr') */
  language?: string;
  /** Filter by predefined tags (items must have at least one of these) */
  predefinedTags?: string[];
  /** Filter for items with no predefined tags */
  noPredefinedTag?: boolean;
  /** Filter by custom tag (items must contain this tag) */
  tag?: string;
  /** Search text (matches against text and description, case-insensitive) */
  searchText?: string;
}

/**
 * Configuration options for the vocab store.
 */
export interface VocabStoreOptions {
  /** Optional storage service instance (for testing) */
  storage?: StorageService;
}

/**
 * Vocabulary store interface type.
 */
export interface VocabStore {
  /** Reactive atom containing all vocabulary items */
  items$: ReturnType<typeof atom<Vocabulary[]>>;

  /**
   * Initializes the store by loading items from storage.
   * Safe to call multiple times - only loads once.
   *
   * @returns Promise resolving when initialization is complete
   */
  init: () => Promise<void>;

  /**
   * Adds a new vocabulary item.
   * Auto-generates id, createdAt, and updatedAt if not provided.
   *
   * @param vocab - The vocabulary item to add (id and dates optional)
   * @returns Promise resolving when item is added and persisted
   */
  add: (
    vocab: Partial<Vocabulary> & Pick<Vocabulary, "text" | "language" | "tags">
  ) => Promise<void>;

  /**
   * Updates an existing vocabulary item.
   * Automatically updates the updatedAt timestamp.
   * Does nothing if item with given id doesn't exist.
   *
   * @param vocab - The vocabulary item with updated values
   * @returns Promise resolving when update is complete
   */
  update: (vocab: Vocabulary) => Promise<void>;

  /**
   * Removes a vocabulary item by id.
   *
   * @param id - The id of the vocabulary to remove
   * @returns Promise resolving when removal is complete
   */
  remove: (id: string) => Promise<void>;

  /**
   * Gets a vocabulary item by id.
   *
   * @param id - The id to look up
   * @returns The vocabulary item or undefined if not found
   */
  getById: (id: string) => Vocabulary | undefined;

  /**
   * Filters vocabulary items by various criteria.
   * All provided filters are combined with AND logic.
   *
   * @param options - Filter options
   * @returns Array of matching vocabulary items
   */
  filter: (options: VocabFilterOptions) => Vocabulary[];

  /**
   * Removes all vocabulary items from the store and storage.
   *
   * @returns Promise resolving when all items are cleared
   */
  clear: () => Promise<void>;

  /**
   * Gets the count of vocabulary items.
   *
   * @returns Number of vocabulary items
   */
  getCount: () => number;

  /**
   * Closes the store and underlying storage connection.
   * Important for cleanup in tests.
   */
  close: () => void;
}

/**
 * Generates a unique ID for vocabulary entries.
 *
 * @returns A unique string ID
 */
function generateId(): string {
  return `vocab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Creates a vocabulary store with reactive state and IndexedDB persistence.
 *
 * @param options - Optional configuration options
 * @returns Vocabulary store instance
 */
export function createVocabStore(options: VocabStoreOptions = {}): VocabStore {
  const storage = options.storage ?? storageService();

  // Reactive atom for vocabulary items
  const items$ = atom<Vocabulary[]>([], { meta: { key: "vocab.items" } });

  // Track initialization state
  let initialized = false;

  /**
   * Initializes the store by loading items from storage.
   */
  const init = async (): Promise<void> => {
    if (initialized) {
      return;
    }

    const storedItems = await storage.getAllVocabularies();
    items$.set(storedItems);
    initialized = true;
  };

  /**
   * Adds a new vocabulary item.
   */
  const add = async (
    vocab: Partial<Vocabulary> & Pick<Vocabulary, "text" | "language" | "tags">
  ): Promise<void> => {
    const now = new Date();
    const newVocab: Vocabulary = {
      id: vocab.id || generateId(),
      text: vocab.text,
      description: vocab.description,
      tags: vocab.tags,
      language: vocab.language,
      definition: vocab.definition,
      ipa: vocab.ipa,
      examples: vocab.examples,
      partOfSpeech: vocab.partOfSpeech,
      forms: vocab.forms,
      extra: vocab.extra,
      senses: vocab.senses,
      createdAt: vocab.createdAt instanceof Date ? vocab.createdAt : now,
      updatedAt: vocab.updatedAt instanceof Date ? vocab.updatedAt : now,
    };

    // Update reactive state
    items$.set((prev) => [...prev, newVocab]);

    // Persist to storage
    await storage.addVocabulary(newVocab);
  };

  /**
   * Updates an existing vocabulary item.
   */
  const update = async (vocab: Vocabulary): Promise<void> => {
    const currentItems = items$.get();
    const existingIndex = currentItems.findIndex((v) => v.id === vocab.id);

    if (existingIndex === -1) {
      // Item doesn't exist, don't update
      return;
    }

    const updatedVocab: Vocabulary = {
      ...vocab,
      updatedAt: new Date(),
    };

    // Update reactive state
    items$.set((prev) =>
      prev.map((v) => (v.id === vocab.id ? updatedVocab : v))
    );

    // Persist to storage
    await storage.updateVocabulary(updatedVocab);
  };

  /**
   * Removes a vocabulary item by id.
   */
  const remove = async (id: string): Promise<void> => {
    // Update reactive state
    items$.set((prev) => prev.filter((v) => v.id !== id));

    // Persist to storage
    await storage.deleteVocabulary(id);
  };

  /**
   * Gets a vocabulary item by id.
   */
  const getById = (id: string): Vocabulary | undefined => {
    return items$.get().find((v) => v.id === id);
  };

  /**
   * Filters vocabulary items by various criteria.
   */
  const filter = (options: VocabFilterOptions): Vocabulary[] => {
    let result = items$.get();

    if (options.language) {
      result = result.filter((v) => v.language === options.language);
    }

    // Filter by predefined tags (items must have at least one of the selected predefined tags)
    if (options.predefinedTags && options.predefinedTags.length > 0) {
      result = result.filter((v) => {
        const itemPredefinedTags = v.tags.filter(isPredefinedTag);
        return options.predefinedTags!.some((tag) =>
          itemPredefinedTags.includes(tag)
        );
      });
    }

    // Filter for items with no predefined tags
    if (options.noPredefinedTag) {
      result = result.filter((v) => {
        const itemPredefinedTags = v.tags.filter(isPredefinedTag);
        return itemPredefinedTags.length === 0;
      });
    }

    if (options.tag) {
      result = result.filter((v) => v.tags.includes(options.tag!));
    }

    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      result = result.filter(
        (v) =>
          v.text.toLowerCase().includes(searchLower) ||
          (v.description && v.description.toLowerCase().includes(searchLower))
      );
    }

    return result;
  };

  /**
   * Removes all vocabulary items.
   */
  const clear = async (): Promise<void> => {
    // Clear reactive state
    items$.set([]);

    // Clear all from storage (more efficient than one-by-one)
    await storage.clearAllVocabularies();
  };

  /**
   * Gets the count of vocabulary items.
   */
  const getCount = (): number => {
    return items$.get().length;
  };

  /**
   * Closes the store and storage connection.
   */
  const close = (): void => {
    storage.close();
  };

  return {
    items$,
    init,
    add,
    update,
    remove,
    getById,
    filter,
    clear,
    getCount,
    close,
  };
}

/**
 * Default vocabulary store instance.
 * Use this for the main application store.
 *
 * @example
 * ```typescript
 * import { vocabStore } from './vocab.store';
 *
 * // Initialize on app start
 * await vocabStore.init();
 *
 * // Use throughout the app
 * const items = vocabStore.items$.get();
 * ```
 */
export const vocabStore = createVocabStore();
