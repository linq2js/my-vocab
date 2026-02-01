import { HTMLAttributes } from 'react';
import { VocabCard } from '../molecules/VocabCard';
import { Spinner } from '../atoms/Spinner';
import { Icon, type IconName } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import type { Vocabulary } from '../../types/vocabulary';
import { 
  ContentType, 
  getContentTypeDisplay,
  type ContentTypeDisplay 
} from '../../constants/contentTypes';

/**
 * Content type option for "Add as" suggestions
 */
interface AddAsOption {
  id: string;
  label: string;
  abbr: string;
  icon: IconName;
}

/**
 * Build add-as options from content type config
 */
const buildAddAsOption = (type: ContentType): AddAsOption => {
  const display = getContentTypeDisplay(type);
  return {
    id: type,
    label: display.label,
    abbr: display.abbr,
    icon: display.icon as IconName,
  };
};

/**
 * Available content types for "Add as" suggestions.
 * Uses abbreviations (V, I, P, Q) for compact display.
 */
const ADD_AS_OPTIONS: AddAsOption[] = [
  buildAddAsOption(ContentType.VOCABULARY),
  buildAddAsOption(ContentType.IDIOM),
  buildAddAsOption(ContentType.PHRASAL_VERB),
  buildAddAsOption(ContentType.QUOTE),
];

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
  /** Current search query (used for "Add as" suggestions) */
  searchQuery?: string;
  /** Custom message to show when list is empty */
  emptyMessage?: string;
  /** Callback when edit button is clicked on a card */
  onEdit?: (vocabulary: Vocabulary) => void;
  /** Callback when delete button is clicked on a card */
  onDelete?: (vocabulary: Vocabulary) => void;
  /** Callback when user wants to add search term as a content type */
  onAddAs?: (contentType: string, text: string) => void;
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

  // Check if we have a search query to show "Add as" suggestions
  const trimmedQuery = searchQuery.trim();
  const showAddAsSuggestions = items.length === 0 && trimmedQuery.length > 0 && onAddAs;

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
          {showAddAsSuggestions 
            ? `No results for "${trimmedQuery}"`
            : emptyMessage
          }
        </h3>
        
        {/* Add as suggestions when search has no results */}
        {showAddAsSuggestions && (
          <div className="mt-4 w-full max-w-md">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Would you like to add it as:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {ADD_AS_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => onAddAs(option.id, trimmedQuery)}
                  className="inline-flex items-center gap-2"
                  title={option.label}
                >
                  <Icon name={option.icon} size="sm" />
                  {option.abbr}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Default empty state messages */}
        {!showAddAsSuggestions && hasActiveFilters && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search query
          </p>
        )}
        {!showAddAsSuggestions && !hasActiveFilters && (
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
          />
        </li>
      ))}
    </ul>
  );
};
