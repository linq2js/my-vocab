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
import { Icon } from '../components/atoms/Icon';
import { Toast } from '../components/atoms/Toast';
import { vocabStore } from '../stores/vocab.store';
import { uiStore } from '../stores/ui.store';
import { useReadAloud } from '../contexts/ReadAloudContext';
import type { Vocabulary } from '../types/vocabulary';

/**
 * HomePage component - main vocabulary list view.
 *
 * @returns The HomePage component
 */
export const HomePage = (): React.ReactElement => {
  const navigate = useNavigate();
  const { isReadAloudMode, toggleReadAloudMode, exitReadAloudMode } = useReadAloud();

  // Get reactive state from stores
  const allVocabularies = useSelector(vocabStore.items$);
  const searchQuery = useSelector(uiStore.searchQuery$);
  const filters = useSelector(uiStore.filters$);

  // Local state for part of speech filter (not in uiStore)
  const [partOfSpeech, setPartOfSpeech] = useState<string | null>(null);
  
  // Toast state for read-aloud mode
  const [showReadAloudToast, setShowReadAloudToast] = useState(false);

  // Initialize vocab store on mount (fire and forget - UI shows defaults immediately)
  useEffect(() => {
    vocabStore.init().catch(console.error);
  }, []);

  // Exit read-aloud mode when navigating away
  const originalNavigate = navigate;
  const navigateWithExitReadAloud = useCallback((to: string) => {
    exitReadAloudMode();
    originalNavigate(to);
  }, [originalNavigate, exitReadAloudMode]);

  // Handle read-aloud mode toggle with toast
  const handleToggleReadAloud = useCallback(() => {
    if (!isReadAloudMode) {
      setShowReadAloudToast(true);
    }
    toggleReadAloudMode();
  }, [isReadAloudMode, toggleReadAloudMode]);

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
    navigateWithExitReadAloud('/add');
  }, [navigateWithExitReadAloud]);

  /**
   * Handle "Add as" click from empty search results.
   * Navigates to add page with pre-filled text from search query.
   */
  const handleAddAs = useCallback((_category: string, text: string): void => {
    navigateWithExitReadAloud(`/add?text=${encodeURIComponent(text)}`);
  }, [navigateWithExitReadAloud]);

  /**
   * Handle edit vocabulary action - navigate to edit page.
   */
  const handleEditVocabulary = useCallback((vocabulary: Vocabulary): void => {
    navigateWithExitReadAloud(`/add?edit=${vocabulary.id}`);
  }, [navigateWithExitReadAloud]);

  /**
   * Handle delete vocabulary action.
   * VocabCard already shows a confirmation dialog, so we directly delete here.
   */
  const handleDeleteVocabulary = useCallback((vocabulary: Vocabulary): void => {
    vocabStore.remove(vocabulary.id).catch(console.error);
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
      <div className="space-y-4 pb-20">
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

        {/* Entry Count */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? (
            <span>
              Showing <span className="font-medium text-gray-700 dark:text-gray-300">{filteredVocabularies.length}</span> of {allVocabularies.length} entries
            </span>
          ) : (
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{allVocabularies.length}</span> {allVocabularies.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

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

      {/* Read Aloud Toast */}
      <Toast
        message="Read aloud mode enabled! Expand any entry and tap on a word to hear its pronunciation."
        isVisible={showReadAloudToast}
        onDismiss={() => setShowReadAloudToast(false)}
        duration={5000}
      />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-row items-center gap-3">
        {/* Read Aloud Mode Toggle */}
        <button
          type="button"
          onClick={handleToggleReadAloud}
          className={`
            w-12 h-12 rounded-full
            ${isReadAloudMode 
              ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900' 
              : 'bg-gray-600 hover:bg-gray-700'}
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
          `}
          aria-label={isReadAloudMode ? 'Exit read aloud mode' : 'Enter read aloud mode'}
          title={isReadAloudMode ? 'Click to exit read aloud mode' : 'Click to enable read aloud mode - tap any word to hear it'}
        >
          <Icon name="volume" size="md" />
        </button>
        
        {/* Add Button */}
        <FloatingActionButton onClick={handleFABClick} />
      </div>
    </PageLayout>
  );
};
