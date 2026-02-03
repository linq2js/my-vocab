/**
 * UI Store for MyVocab
 *
 * Reactive state management for UI concerns using atomirx patterns.
 * Manages search query, filters, and modal states for the application.
 *
 * Features:
 * - Reactive atom-based state (searchQuery$, filters$, modalState$)
 * - Filter management with active filter detection
 * - Modal state management with type safety
 * - Reset functionality for all UI state
 *
 * @example
 * ```typescript
 * import { uiStore } from './ui.store';
 * import { useAtomValue } from 'atomirx/react';
 *
 * // Set search query
 * uiStore.setSearchQuery('hello');
 *
 * // Set filters
 * uiStore.setFilters({ language: 'en', predefinedTags: ['vocabulary'] });
 *
 * // Open modal
 * uiStore.openModal('addVocab');
 *
 * // In React component
 * const searchQuery = useAtomValue(uiStore.searchQuery$);
 * const filters = useAtomValue(uiStore.filters$);
 * const modalState = useAtomValue(uiStore.modalState$);
 * ```
 */

import { atom } from "atomirx";

/**
 * Modal types available in the application.
 */
export type ModalType =
  | "addVocab"
  | "editVocab"
  | "deleteVocab"
  | "settings"
  | "confirm"
  | "enrichment"
  | null;

/**
 * Filter options for vocabulary list.
 */
export interface UiFilters {
  /** Filter by language code (e.g., 'en', 'fr') */
  language: string | null;
  /** Filter by predefined tags (multiple selection, empty = all) */
  predefinedTags: string[];
  /** Filter for entries with no predefined tags */
  noPredefinedTag: boolean;
  /** Filter by custom tags (items must contain all tags) */
  tags: string[];
  /** Filter for entries with no custom tags */
  noCustomTag: boolean;
  /** Filter by part of speech (e.g., 'noun', 'verb') */
  partOfSpeech: string | null;
}

/**
 * Modal state structure.
 */
export interface ModalState {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** The type of modal being displayed */
  type: ModalType;
  /** Optional data passed to the modal */
  data: unknown;
}

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: UiFilters = {
  language: null,
  predefinedTags: [],
  noPredefinedTag: false,
  tags: [],
  noCustomTag: false,
  partOfSpeech: null,
};

/**
 * Default modal state.
 */
const DEFAULT_MODAL_STATE: ModalState = {
  isOpen: false,
  type: null,
  data: null,
};

/**
 * UI store interface type.
 */
export interface UiStore {
  /** Reactive atom containing the current search query */
  searchQuery$: ReturnType<typeof atom<string>>;

  /** Reactive atom containing the current filter settings */
  filters$: ReturnType<typeof atom<UiFilters>>;

  /** Reactive atom containing the current modal state */
  modalState$: ReturnType<typeof atom<ModalState>>;

  /**
   * Sets the search query.
   * Trims whitespace from the input.
   *
   * @param query - The search query string
   */
  setSearchQuery: (query: string) => void;

  /**
   * Clears the search query.
   */
  clearSearchQuery: () => void;

  /**
   * Updates filter settings.
   * Merges with existing filters.
   *
   * @param filters - Partial filter settings to apply
   */
  setFilters: (filters: Partial<UiFilters>) => void;

  /**
   * Resets filters to default values.
   */
  resetFilters: () => void;

  /**
   * Checks if any filters are currently active.
   *
   * @returns True if any filter is set, false otherwise
   */
  hasActiveFilters: () => boolean;

  /**
   * Opens a modal with the specified type and optional data.
   *
   * @param type - The type of modal to open
   * @param data - Optional data to pass to the modal
   */
  openModal: (type: NonNullable<ModalType>, data?: unknown) => void;

  /**
   * Closes the currently open modal.
   */
  closeModal: () => void;

  /**
   * Checks if a modal is currently open.
   *
   * @param type - Optional modal type to check for specifically
   * @returns True if modal is open (and matches type if provided)
   */
  isModalOpen: (type?: ModalType) => boolean;

  /**
   * Resets all UI state to defaults.
   */
  reset: () => void;
}

/**
 * Creates a UI store with reactive state for search, filters, and modals.
 *
 * @returns UI store instance
 */
export function createUiStore(): UiStore {
  // Reactive atoms for UI state
  const searchQuery$ = atom<string>("", {
    meta: { key: "ui.searchQuery" },
  });

  const filters$ = atom<UiFilters>(
    { ...DEFAULT_FILTERS },
    {
      meta: { key: "ui.filters" },
    }
  );

  const modalState$ = atom<ModalState>(
    { ...DEFAULT_MODAL_STATE },
    {
      meta: { key: "ui.modalState" },
    }
  );

  /**
   * Sets the search query.
   */
  const setSearchQuery = (query: string): void => {
    searchQuery$.set(query.trim());
  };

  /**
   * Clears the search query.
   */
  const clearSearchQuery = (): void => {
    searchQuery$.set("");
  };

  /**
   * Updates filter settings.
   */
  const setFilters = (filters: Partial<UiFilters>): void => {
    filters$.set((prev) => ({
      ...prev,
      ...filters,
    }));
  };

  /**
   * Resets filters to default values.
   */
  const resetFilters = (): void => {
    filters$.set({ ...DEFAULT_FILTERS });
  };

  /**
   * Checks if any filters are currently active.
   */
  const hasActiveFilters = (): boolean => {
    const currentFilters = filters$.get();
    return (
      currentFilters.language !== null ||
      currentFilters.predefinedTags.length > 0 ||
      currentFilters.noPredefinedTag ||
      currentFilters.tags.length > 0 ||
      currentFilters.noCustomTag ||
      currentFilters.partOfSpeech !== null
    );
  };

  /**
   * Opens a modal with the specified type and optional data.
   */
  const openModal = (type: NonNullable<ModalType>, data?: unknown): void => {
    modalState$.set({
      isOpen: true,
      type,
      data: data ?? null,
    });
  };

  /**
   * Closes the currently open modal.
   */
  const closeModal = (): void => {
    modalState$.set({ ...DEFAULT_MODAL_STATE });
  };

  /**
   * Checks if a modal is currently open.
   */
  const isModalOpen = (type?: ModalType): boolean => {
    const state = modalState$.get();
    if (type !== undefined) {
      return state.isOpen && state.type === type;
    }
    return state.isOpen;
  };

  /**
   * Resets all UI state to defaults.
   */
  const reset = (): void => {
    searchQuery$.set("");
    filters$.set({ ...DEFAULT_FILTERS });
    modalState$.set({ ...DEFAULT_MODAL_STATE });
  };

  return {
    searchQuery$,
    filters$,
    modalState$,
    setSearchQuery,
    clearSearchQuery,
    setFilters,
    resetFilters,
    hasActiveFilters,
    openModal,
    closeModal,
    isModalOpen,
    reset,
  };
}

/**
 * Default UI store instance.
 * Use this for the main application store.
 *
 * @example
 * ```typescript
 * import { uiStore } from './ui.store';
 *
 * // Set search query
 * uiStore.setSearchQuery('serendipity');
 *
 * // Apply filters
 * uiStore.setFilters({ language: 'en' });
 *
 * // Open add vocabulary modal
 * uiStore.openModal('addVocab');
 * ```
 */
export const uiStore = createUiStore();
