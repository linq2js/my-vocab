/**
 * FilterPanel molecule component for filtering vocabulary entries.
 *
 * Provides filter controls for:
 * - Language selection
 * - Part of speech selection
 *
 * Note: Content type filtering is handled separately by ContentTypeFilter component.
 *
 * Integrates with uiStore for reactive filter state management.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FilterPanel />
 *
 * // With callbacks
 * <FilterPanel
 *   onLanguageChange={(lang) => console.log('Language:', lang)}
 *   onPartOfSpeechChange={(pos) => console.log('POS:', pos)}
 *   onReset={() => console.log('Filters reset')}
 * />
 *
 * // Compact mode for horizontal layout
 * <FilterPanel compact />
 *
 * // Disabled state
 * <FilterPanel disabled />
 * ```
 */

import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { useSelector } from 'atomirx/react';
import { uiStore } from '../../stores/ui.store';
import { LANGUAGES } from '../../constants/languages';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';

/**
 * Common parts of speech for filtering.
 */
const PART_OF_SPEECH_OPTIONS: { value: string; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'pronoun', label: 'Pronoun' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'interjection', label: 'Interjection' },
  { value: 'determiner', label: 'Determiner' },
  { value: 'phrase', label: 'Phrase' },
];

/**
 * Props for the FilterPanel component.
 */
export interface FilterPanelProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the filter panel is disabled */
  disabled?: boolean;
  /** Whether to use compact horizontal layout */
  compact?: boolean;
  /** Current part of speech filter value (controlled externally) */
  partOfSpeech?: string | null;
  /** Callback when language filter changes */
  onLanguageChange?: (language: string | null) => void;
  /** Callback when part of speech filter changes */
  onPartOfSpeechChange?: (partOfSpeech: string | null) => void;
  /** Callback when filters are reset */
  onReset?: () => void;
}

/**
 * Base CSS classes for select elements.
 */
const selectBaseClasses = [
  'w-full',
  'px-3 py-2',
  'border rounded-lg',
  'text-sm',
  'transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'bg-white dark:bg-gray-800',
  'text-gray-900 dark:text-gray-100',
  'border-gray-300 dark:border-gray-600',
  'focus:ring-blue-500 focus:border-blue-500',
].join(' ');

/**
 * Disabled state classes for select elements.
 */
const selectDisabledClasses = 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900';

/**
 * FilterPanel molecule component for filtering vocabulary entries.
 *
 * Features:
 * - Language filter dropdown with all supported languages
 * - Part of speech filter dropdown
 * - Reset button when filters are active
 * - Syncs with uiStore.filters$
 * - Compact mode for horizontal layout
 * - Full accessibility support
 *
 * Note: Content type filtering is handled by ContentTypeFilter component.
 *
 * @param props - Component props
 * @returns FilterPanel component
 */
export const FilterPanel = ({
  className = '',
  disabled = false,
  compact = false,
  partOfSpeech: controlledPartOfSpeech,
  onLanguageChange,
  onPartOfSpeechChange,
  onReset,
}: FilterPanelProps): ReactElement => {
  // Get current filters from store
  const filters = useSelector(uiStore.filters$);

  // Track part of speech locally (not in uiStore since it's not in UiFilters)
  // Use controlled value if provided, otherwise use empty string
  const partOfSpeechValue = controlledPartOfSpeech ?? '';

  /**
   * Handle language filter change.
   */
  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || null;
      uiStore.setFilters({ language: value });
      onLanguageChange?.(value);
    },
    [onLanguageChange]
  );

  /**
   * Handle part of speech filter change.
   */
  const handlePartOfSpeechChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || null;
      onPartOfSpeechChange?.(value);
    },
    [onPartOfSpeechChange]
  );

  /**
   * Handle reset button click.
   */
  const handleReset = useCallback(() => {
    uiStore.resetFilters();
    onPartOfSpeechChange?.(null);
    onReset?.();
  }, [onPartOfSpeechChange, onReset]);

  // Check if any filters are active
  const hasActiveFilters = uiStore.hasActiveFilters() || !!partOfSpeechValue;

  // Build container classes
  const containerClasses = [
    'flex gap-3',
    compact ? 'flex-row flex-wrap items-end' : 'flex-col',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Build select classes
  const selectClasses = [selectBaseClasses, disabled ? selectDisabledClasses : '']
    .filter(Boolean)
    .join(' ');

  // Filter item wrapper classes
  const filterItemClasses = compact ? 'flex-1 min-w-[150px]' : 'w-full';

  return (
    <div data-testid="filter-panel" className={containerClasses}>
      {/* Language Filter */}
      <div className={filterItemClasses}>
        <label
          htmlFor="filter-language"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Language
        </label>
        <select
          id="filter-language"
          value={filters.language ?? ''}
          onChange={handleLanguageChange}
          disabled={disabled}
          className={selectClasses}
          aria-label="Filter by language"
        >
          <option value="">All Languages</option>
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Part of Speech Filter */}
      <div className={filterItemClasses}>
        <label
          htmlFor="filter-part-of-speech"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Part of Speech
        </label>
        <select
          id="filter-part-of-speech"
          value={partOfSpeechValue}
          onChange={handlePartOfSpeechChange}
          disabled={disabled}
          className={selectClasses}
          aria-label="Filter by part of speech"
        >
          <option value="">All Parts</option>
          {PART_OF_SPEECH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className={compact ? 'flex items-end' : 'w-full'}>
          {!compact && <div className="h-6" />} {/* Spacer for label alignment */}
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            aria-label="Reset all filters"
            className="whitespace-nowrap"
          >
            <Icon name="close" size="sm" className="mr-1" />
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
};
