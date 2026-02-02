import { HTMLAttributes } from 'react';
import { VocabCard } from '../molecules/VocabCard';
import { Spinner } from '../atoms/Spinner';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import type { Vocabulary } from '../../types/vocabulary';

/**
 * Props for the VocabList component
 */
export interface VocabListProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Array of vocabulary items to display */
  items: Vocabulary[];
  /** Whether to show a compact version of cards (hides examples) */
  compact?: boolean;
  /** Whether the list is currently loading */
  loading?: boolean;
  /** Whether there are active filters applied */
  hasActiveFilters?: boolean;
  /** Current search query (used for "Add" suggestion) */
  searchQuery?: string;
  /** Custom message to show when list is empty */
  emptyMessage?: string;
  /** Callback when edit button is clicked on a card */
  onEdit?: (vocabulary: Vocabulary) => void;
  /** Callback when delete button is clicked on a card */
  onDelete?: (vocabulary: Vocabulary) => void;
  /** Callback when user wants to add search term as vocabulary */
  onAddAs?: (category: string, text: string) => void;
  /** Callback when translate button is clicked - passes text and language */
  onTranslate?: (text: string, language: string) => void;
  /** User's native language code - hides translate buttons when vocab language matches */
  nativeLanguage?: string;
}

/**
 * VocabList organism component for displaying a list of vocabulary cards.
 * Integrates VocabCard molecules with filtering support and empty/loading states.
 *
 * Features:
 * - Displays vocabulary items as cards in a responsive grid
 * - Loading state with spinner
 * - Empty state with customizable message
 * - Filter hint when filters are active but no results
 * - Passes edit/delete actions to individual cards
 * - Compact mode for dense list views
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VocabList items={vocabularies} />
 *
 * // With actions and loading state
 * <VocabList
 *   items={vocabularies}
 *   loading={isLoading}
 *   onEdit={(vocab) => handleEdit(vocab)}
 *   onDelete={(vocab) => handleDelete(vocab)}
 * />
 *
 * // With filter context
 * <VocabList
 *   items={filteredItems}
 *   hasActiveFilters={hasFilters}
 *   emptyMessage="No matches found"
 * />
 * ```
 */
export const VocabList = ({
  items,
  compact = false,
  loading = false,
  hasActiveFilters = false,
  searchQuery = '',
  emptyMessage = 'No vocabulary items yet',
  onEdit,
  onDelete,
  onAddAs,
  onTranslate,
  nativeLanguage,
  className = '',
  ...props
}: VocabListProps) => {
  // Loading state
  if (loading) {
    return (
      <div
        data-testid="vocab-list-loading"
        className="flex flex-col items-center justify-center py-12"
        aria-busy="true"
        aria-label="Loading vocabulary list"
      >
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Loading vocabularies...
        </p>
      </div>
    );
  }

  // Check if we have a search query to show "Add" suggestion
  const trimmedQuery = searchQuery.trim();
  const showAddSuggestion = items.length === 0 && trimmedQuery.length > 0 && onAddAs;

  // Empty state
  if (items.length === 0) {
    return (
      <div
        data-testid="vocab-list-empty"
        className={[
          'flex flex-col items-center justify-center py-12 px-4',
          'text-center',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Empty vocabulary list"
        {...props}
      >
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Icon
            name="search"
            size="lg"
            className="text-gray-400 dark:text-gray-500"
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {showAddSuggestion 
            ? `No results for "${trimmedQuery}"`
            : emptyMessage
          }
        </h3>
        
        {/* Add suggestion when search has no results */}
        {showAddSuggestion && (
          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              onClick={() => onAddAs('', trimmedQuery)}
              className="inline-flex items-center gap-2"
            >
              <Icon name="plus" size="sm" />
              Add "{trimmedQuery}"
            </Button>
          </div>
        )}

        {/* Default empty state messages */}
        {!showAddSuggestion && hasActiveFilters && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search query
          </p>
        )}
        {!showAddSuggestion && !hasActiveFilters && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add your first vocabulary to get started
          </p>
        )}
      </div>
    );
  }

  // List container classes
  // Mobile: 1 column, Large screens (sm+): 2 columns
  const listClasses = [
    'grid gap-4',
    'grid-cols-1',
    'sm:grid-cols-2',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ul
      className={listClasses}
      role="list"
      aria-label="Vocabulary list"
      {...props}
    >
      {items.map((vocabulary) => (
        <li key={vocabulary.id} className="list-none">
          <VocabCard
            vocabulary={vocabulary}
            compact={compact}
            onEdit={onEdit}
            onDelete={onDelete}
            onTranslate={onTranslate}
            nativeLanguage={nativeLanguage}
          />
        </li>
      ))}
    </ul>
  );
};
