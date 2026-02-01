/**
 * ContentTypeFilter molecule component for filtering by content type.
 *
 * Displays content type options as chips that can be selected.
 * Supports multiple selection with an "All" option that clears other selections.
 *
 * @example
 * ```tsx
 * // Basic usage (connected to uiStore)
 * <ContentTypeFilter />
 *
 * // Disabled state
 * <ContentTypeFilter disabled />
 * ```
 */

import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { useSelector } from 'atomirx/react';
import { uiStore } from '../../stores/ui.store';
import { ContentType, getContentTypeLabel, getContentTypeAbbr } from '../../constants/contentTypes';
import type { ContentType as ContentTypeValue } from '../../types/vocabulary';

/**
 * Content type chip configuration.
 */
interface ContentTypeChip {
  /** Unique identifier */
  id: 'all' | ContentTypeValue;
  /** Full display label (for larger screens) */
  label: string;
  /** Abbreviated label (for small screens) */
  abbr: string;
}

/**
 * Available content type chips.
 * "All" is a special option that clears other selections.
 * Shows abbreviations on mobile, full labels on larger screens.
 */
const CONTENT_TYPE_CHIPS: ContentTypeChip[] = [
  { id: 'all', label: 'All', abbr: 'All' },
  { id: ContentType.VOCABULARY, label: getContentTypeLabel(ContentType.VOCABULARY), abbr: getContentTypeAbbr(ContentType.VOCABULARY) },
  { id: ContentType.PHRASAL_VERB, label: getContentTypeLabel(ContentType.PHRASAL_VERB), abbr: getContentTypeAbbr(ContentType.PHRASAL_VERB) },
  { id: ContentType.IDIOM, label: getContentTypeLabel(ContentType.IDIOM), abbr: getContentTypeAbbr(ContentType.IDIOM) },
  { id: ContentType.QUOTE, label: getContentTypeLabel(ContentType.QUOTE), abbr: getContentTypeAbbr(ContentType.QUOTE) },
];

/**
 * Props for the ContentTypeFilter component.
 */
export interface ContentTypeFilterProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the filter is disabled */
  disabled?: boolean;
}

/**
 * ContentTypeFilter molecule component.
 *
 * Features:
 * - Chip-style buttons for each content type
 * - Multiple selection support
 * - "All" chip that clears other selections
 * - Syncs with uiStore.filters$.contentTypes
 * - Full dark mode support
 *
 * @param props - Component props
 * @returns ContentTypeFilter component
 */
export const ContentTypeFilter = ({
  className = '',
  disabled = false,
}: ContentTypeFilterProps): ReactElement => {
  // Get current filters from store
  const filters = useSelector(uiStore.filters$);
  const selectedTypes = filters.contentTypes;

  // Check if "All" is effectively selected (no specific types selected)
  const isAllSelected = selectedTypes.length === 0;

  /**
   * Handle chip click.
   * - If "All" is clicked, clear all selections
   * - If a type is clicked and already selected, remove it
   * - If a type is clicked and not selected, add it
   */
  const handleChipClick = useCallback(
    (chipId: 'all' | ContentTypeValue) => {
      if (disabled) return;

      if (chipId === 'all') {
        // Clear all selections (show all)
        uiStore.setFilters({ contentTypes: [] });
      } else {
        const isSelected = selectedTypes.includes(chipId);
        if (isSelected) {
          // Remove from selection
          const newTypes = selectedTypes.filter((t) => t !== chipId);
          uiStore.setFilters({ contentTypes: newTypes });
        } else {
          // Add to selection
          uiStore.setFilters({ contentTypes: [...selectedTypes, chipId] });
        }
      }
    },
    [disabled, selectedTypes]
  );

  /**
   * Check if a chip is selected.
   */
  const isChipSelected = (chipId: 'all' | ContentTypeValue): boolean => {
    if (chipId === 'all') {
      return isAllSelected;
    }
    return selectedTypes.includes(chipId);
  };

  /**
   * Get chip CSS classes based on selection state.
   * On small screens: pill buttons with full text, 2 per row
   * On larger screens: inline pill-shaped buttons
   */
  const getChipClasses = (chipId: 'all' | ContentTypeValue): string => {
    const isSelected = isChipSelected(chipId);

    const baseClasses = [
      'px-3 py-1.5',
      'flex items-center justify-center',
      'text-sm font-medium',
      'rounded-full',
      'border',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
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

  // Grid layout: 2 columns on small screens, flex wrap on larger screens
  const containerClasses = [
    'grid grid-cols-2 gap-2',
    'sm:flex sm:flex-wrap',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-testid="content-type-filter"
      className={containerClasses}
      role="group"
      aria-label="Filter by content type"
    >
      {CONTENT_TYPE_CHIPS.map((chip) => (
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
