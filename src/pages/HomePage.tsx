/**
 * HomePage component for MyVocab PWA.
 *
 * Main home page displaying the vocabulary list with search and filter capabilities.
 * Integrates with vocabStore for vocabulary data and uiStore for UI state.
 *
 * Features:
 * - Search bar for filtering vocabularies by text
 * - Filter panel for language, predefined tags, and part of speech
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
import { FloatingActionButton } from '../components/molecules/FloatingActionButton';
import { VocabList } from '../components/organisms/VocabList';
import { vocabStore } from '../stores/vocab.store';
import { uiStore } from '../stores/ui.store';
import type { Vocabulary } from '../types/vocabulary';

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
      predefinedTags: filters.predefinedTags.length > 0 ? filters.predefinedTags : undefined,
      noPredefinedTag: filters.noPredefinedTag || undefined,
    });

    // Apply part of speech filter (not in vocabStore.filter)
    if (partOfSpeech) {
      result = result.filter((v) => v.partOfSpeech === partOfSpeech);
    }

    // Apply custom tag filter if any tags are selected
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
   * Handle FAB click - navigate to add page.
   */
  const handleFABClick = useCallback((): void => {
    navigate('/add');
  }, [navigate]);

  /**
   * Handle "Add as" click from empty search results.
   * Navigates to add page with pre-filled text from search query.
   */
  const handleAddAs = useCallback((_category: string, text: string): void => {
    navigate(`/add?text=${encodeURIComponent(text)}`);
  }, [navigate]);

  /**
   * Handle edit vocabulary action - navigate to edit page.
   */
  const handleEditVocabulary = useCallback((vocabulary: Vocabulary): void => {
    navigate(`/add?edit=${vocabulary.id}`);
  }, [navigate]);

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

        {/* Category Filter - chips below search */}
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

      {/* Floating Action Button */}
      <FloatingActionButton onClick={handleFABClick} />
    </PageLayout>
  );
};
