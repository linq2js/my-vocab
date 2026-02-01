/**
 * HomePage component for MyVocab PWA.
 *
 * Main home page displaying the vocabulary list with search and filter capabilities.
 * Integrates with vocabStore for vocabulary data and uiStore for UI state.
 *
 * Features:
 * - Search bar for filtering vocabularies by text
 * - Filter panel for language, content type, and part of speech
 * - Responsive vocabulary list grid
 * - Add vocabulary floating action button
 * - Empty state handling with filter hints
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * // Basic usage in router
 * <Route path="/" element={<HomePage />} />
 *
 * // Or direct render
 * <HomePage />
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'atomirx/react';
import { PageLayout } from '../components/templates/PageLayout';
import { SearchBar } from '../components/molecules/SearchBar';
import { ContentTypeFilter } from '../components/molecules/ContentTypeFilter';
import { FilterPanel } from '../components/molecules/FilterPanel';
import { FloatingActionButton, type FABAction } from '../components/molecules/FloatingActionButton';
import { VocabList } from '../components/organisms/VocabList';
import { vocabStore } from '../stores/vocab.store';
import { uiStore } from '../stores/ui.store';
import { ContentType, getContentTypeDisplay } from '../constants/contentTypes';
import type { Vocabulary } from '../types/vocabulary';

/**
 * FAB actions for adding different content types.
 * Uses full labels for clarity in the speed dial menu.
 */
const FAB_ACTIONS: FABAction[] = [
  { 
    id: ContentType.VOCABULARY, 
    label: getContentTypeDisplay(ContentType.VOCABULARY).label, 
    icon: 'book' 
  },
  { 
    id: ContentType.IDIOM, 
    label: getContentTypeDisplay(ContentType.IDIOM).label, 
    icon: 'globe' 
  },
  { 
    id: ContentType.PHRASAL_VERB, 
    label: getContentTypeDisplay(ContentType.PHRASAL_VERB).label, 
    icon: 'tag' 
  },
];

/**
 * Map FAB action IDs to URL content type parameters
 */
const ACTION_TO_TYPE: Record<string, string> = {
  [ContentType.VOCABULARY]: 'vocabulary',
  [ContentType.IDIOM]: 'idiom',
  [ContentType.PHRASAL_VERB]: 'phrasal-verb',
};

/**
 * HomePage component - main vocabulary list view.
 *
 * @returns The HomePage component
 */
export const HomePage = (): React.ReactElement => {
  const navigate = useNavigate();

  // Get reactive state from stores
  const allVocabularies = useSelector(vocabStore.items$);
  const searchQuery = useSelector(uiStore.searchQuery$);
  const filters = useSelector(uiStore.filters$);

  // Local state for part of speech filter (not in uiStore)
  const [partOfSpeech, setPartOfSpeech] = useState<string | null>(null);

  // Initialize vocab store on mount (fire and forget - UI shows defaults immediately)
  useEffect(() => {
    vocabStore.init().catch(console.error);
  }, []);

  /**
   * Filter vocabularies based on search query and filters.
   * Memoized to prevent unnecessary recalculations.
   */
  const filteredVocabularies = useMemo((): Vocabulary[] => {
    let result = vocabStore.filter({
      language: filters.language ?? undefined,
      searchText: searchQuery || undefined,
    });

    // Apply content type filter (multiple selection)
    // Empty array means "All" - no filtering
    if (filters.contentTypes.length > 0) {
      result = result.filter((v) => filters.contentTypes.includes(v.contentType));
    }

    // Apply part of speech filter (not in vocabStore.filter)
    if (partOfSpeech) {
      result = result.filter((v) => v.partOfSpeech === partOfSpeech);
    }

    // Apply tag filter if any tags are selected
    if (filters.tags.length > 0) {
      result = result.filter((v) =>
        filters.tags.every((tag) => v.tags.includes(tag))
      );
    }

    return result;
  }, [allVocabularies, searchQuery, filters, partOfSpeech]);

  /**
   * Check if any filters are active (including part of speech).
   */
  const hasActiveFilters = useMemo((): boolean => {
    return uiStore.hasActiveFilters() || !!partOfSpeech || !!searchQuery;
  }, [filters, partOfSpeech, searchQuery]);

  /**
   * Handle FAB action click - navigate to add page with content type.
   */
  const handleFABAction = useCallback((actionId: string): void => {
    const contentType = ACTION_TO_TYPE[actionId] || 'vocabulary';
    navigate(`/add?type=${contentType}`);
  }, [navigate]);

  /**
   * Handle "Add as" click from empty search results.
   * Navigates to add page with pre-filled text from search query.
   */
  const handleAddAs = useCallback((contentType: string, text: string): void => {
    const type = ACTION_TO_TYPE[contentType] || contentType;
    navigate(`/add?type=${type}&text=${encodeURIComponent(text)}`);
  }, [navigate]);

  /**
   * Handle edit vocabulary action.
   */
  const handleEditVocabulary = useCallback((vocabulary: Vocabulary): void => {
    uiStore.openModal('editVocab', vocabulary);
  }, []);

  /**
   * Handle delete vocabulary action.
   */
  const handleDeleteVocabulary = useCallback((vocabulary: Vocabulary): void => {
    uiStore.openModal('deleteVocab', vocabulary);
  }, []);

  /**
   * Handle part of speech filter change.
   */
  const handlePartOfSpeechChange = useCallback((pos: string | null): void => {
    setPartOfSpeech(pos);
  }, []);

  /**
   * Handle filter reset (including part of speech).
   */
  const handleFilterReset = useCallback((): void => {
    setPartOfSpeech(null);
  }, []);

  return (
    <PageLayout>
      <div className="space-y-4">
        {/* Search Bar */}
        <SearchBar />

        {/* Content Type Filter - chips below search */}
        <ContentTypeFilter />

        {/* Other Filters Panel */}
        <FilterPanel
          compact
          partOfSpeech={partOfSpeech}
          onPartOfSpeechChange={handlePartOfSpeechChange}
          onReset={handleFilterReset}
        />

        {/* Vocabulary List */}
        <VocabList
          items={filteredVocabularies}
          loading={false}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          emptyMessage={
            hasActiveFilters
              ? 'No vocabularies match your filters'
              : 'No vocabulary items yet'
          }
          onEdit={handleEditVocabulary}
          onDelete={handleDeleteVocabulary}
          onAddAs={handleAddAs}
        />
      </div>

      {/* Floating Action Button with Speed Dial */}
      <FloatingActionButton
        actions={FAB_ACTIONS}
        onActionClick={handleFABAction}
      />
    </PageLayout>
  );
};
