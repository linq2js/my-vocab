/**
 * CategoryFilter molecule component for filtering by predefined tags (categories).
 *
 * Displays predefined tag options as chips that can be selected.
 * Supports multiple selection with an "All" option that clears other selections.
 * Includes a "No Category" option to filter entries without predefined tags.
 *
 * @example
 * ```tsx
 * // Basic usage (connected to uiStore)
 * <CategoryFilter />
 *
 * // Disabled state
 * <CategoryFilter disabled />
 * ```
 */

import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { useSelector } from 'atomirx/react';
import { uiStore } from '../../stores/ui.store';
import { PREDEFINED_TAGS, NO_PREDEFINED_TAG_FILTER } from '../../constants/predefinedTags';

/**
 * Category chip configuration.
 */
interface CategoryChip {
  /** Unique identifier */
  id: string;
  /** Full display label */
  label: string;
  /** Abbreviated label (for small screens) */
  abbr: string;
}

/**
 * Available category chips.
 * "All" is a special option that clears all selections.
 * "No Category" filters entries without any predefined tags.
 */
const CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all', label: 'All', abbr: 'All' },
  ...PREDEFINED_TAGS.map((tag) => ({
    id: tag.id,
    label: tag.label,
    abbr: tag.abbr,
  })),
  { id: NO_PREDEFINED_TAG_FILTER, label: 'No Category', abbr: '∅' },
];

/**
 * Props for the CategoryFilter component.
 */
export interface CategoryFilterProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the filter is disabled */
  disabled?: boolean;
}

/**
 * CategoryFilter molecule component (formerly ContentTypeFilter).
 *
 * Features:
 * - Chip-style buttons for each predefined tag category
 * - Multiple selection support
 * - "All" chip that clears other selections
 * - "No Category" chip to find untagged entries
 * - Syncs with uiStore.filters$.predefinedTags
 * - Full dark mode support
 *
 * @param props - Component props
 * @returns CategoryFilter component
 */
export const ContentTypeFilter = ({
  className = '',
  disabled = false,
}: CategoryFilterProps): ReactElement => {
  // Get current filters from store
  const filters = useSelector(uiStore.filters$);
  const selectedTags = filters.predefinedTags;
  const noPredefinedTag = filters.noPredefinedTag;

  // Check if "All" is effectively selected (no specific tags selected and no noPredefinedTag)
  const isAllSelected = selectedTags.length === 0 && !noPredefinedTag;

  /**
   * Handle chip click.
   * - If "All" is clicked, clear all selections
   * - If "No Category" is clicked, toggle noPredefinedTag filter
   * - If a tag is clicked and already selected, remove it
   * - If a tag is clicked and not selected, add it
   */
  const handleChipClick = useCallback(
    (chipId: string) => {
      if (disabled) return;

      if (chipId === 'all') {
        // Clear all selections (show all)
        uiStore.setFilters({ predefinedTags: [], noPredefinedTag: false });
      } else if (chipId === NO_PREDEFINED_TAG_FILTER) {
        // Toggle "No Category" filter
        // When enabling, clear other predefined tag selections
        if (!noPredefinedTag) {
          uiStore.setFilters({ predefinedTags: [], noPredefinedTag: true });
        } else {
          uiStore.setFilters({ noPredefinedTag: false });
        }
      } else {
        // Regular predefined tag
        const isSelected = selectedTags.includes(chipId);
        if (isSelected) {
          // Remove from selection
          const newTags = selectedTags.filter((t) => t !== chipId);
          uiStore.setFilters({ predefinedTags: newTags });
        } else {
          // Add to selection, clear noPredefinedTag
          uiStore.setFilters({ 
            predefinedTags: [...selectedTags, chipId],
            noPredefinedTag: false,
          });
        }
      }
    },
    [disabled, selectedTags, noPredefinedTag]
  );

  /**
   * Check if a chip is selected.
   */
  const isChipSelected = (chipId: string): boolean => {
    if (chipId === 'all') {
      return isAllSelected;
    }
    if (chipId === NO_PREDEFINED_TAG_FILTER) {
      return noPredefinedTag;
    }
    return selectedTags.includes(chipId);
  };

  /**
   * Get chip CSS classes based on selection state.
   */
  const getChipClasses = (chipId: string): string => {
    const isSelected = isChipSelected(chipId);

    const baseClasses = [
      'px-2.5 py-1',
      'flex items-center justify-center',
      'text-xs font-medium',
      'rounded-full',
      'border',
      'whitespace-nowrap',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
    ];

    const selectedClasses = [
      'bg-blue-600 text-white border-blue-600',
      'dark:bg-blue-500 dark:border-blue-500',
    ];

    const unselectedClasses = [
      'bg-white text-gray-700 border-gray-300',
      'hover:bg-gray-50 hover:border-gray-400',
      'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
      'dark:hover:bg-gray-700 dark:hover:border-gray-500',
    ];

    const disabledClasses = disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer';

    return [
      ...baseClasses,
      ...(isSelected ? selectedClasses : unselectedClasses),
      disabledClasses,
    ].join(' ');
  };

  // Inline layout with wrapping
  const containerClasses = [
    'flex flex-wrap gap-1.5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-testid="content-type-filter"
      className={containerClasses}
      role="group"
      aria-label="Filter by category"
    >
      {CATEGORY_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => handleChipClick(chip.id)}
          disabled={disabled}
          className={getChipClasses(chip.id)}
          aria-pressed={isChipSelected(chip.id)}
          data-testid={`content-type-chip-${chip.id}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
};

// Also export as CategoryFilter for clarity
export { ContentTypeFilter as CategoryFilter };
