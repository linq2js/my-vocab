import { useState, useEffect, useRef, useCallback, InputHTMLAttributes } from 'react';
import { useSelector } from 'atomirx/react';
import { Icon } from '../atoms/Icon';
import { uiStore } from '../../stores/ui.store';
import type { InputSize } from '../atoms/Input';

/**
 * Props for the SearchBar component
 */
export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Size of the search input */
  size?: InputSize;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether the search bar is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when search value changes (debounced) */
  onChange?: (value: string) => void;
  /** Callback when search is cleared */
  onClear?: () => void;
}

/**
 * Get size-specific CSS classes for the input
 */
const getSizeClasses = (size: InputSize): string => {
  const sizes: Record<InputSize, string> = {
    sm: 'py-1.5 text-sm',
    md: 'py-2 text-base',
    lg: 'py-3 text-lg',
  };
  return sizes[size];
};

/**
 * Get icon size based on input size
 */
const getIconSize = (size: InputSize): 'sm' | 'md' | 'lg' => {
  const iconSizes: Record<InputSize, 'sm' | 'md' | 'lg'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  };
  return iconSizes[size];
};

/**
 * Get left padding based on input size (to accommodate icon)
 */
const getLeftPadding = (size: InputSize): string => {
  const paddings: Record<InputSize, string> = {
    sm: 'pl-8',
    md: 'pl-10',
    lg: 'pl-12',
  };
  return paddings[size];
};

/**
 * Get right padding based on input size (to accommodate clear button)
 */
const getRightPadding = (size: InputSize): string => {
  const paddings: Record<InputSize, string> = {
    sm: 'pr-8',
    md: 'pr-10',
    lg: 'pr-12',
  };
  return paddings[size];
};

/**
 * SearchBar molecule component with search icon and debouncing.
 * Integrates with uiStore for reactive search state management.
 *
 * Features:
 * - Search icon on the left
 * - Clear button when input has value
 * - Debounced input to prevent excessive updates
 * - Syncs with uiStore.searchQuery$
 * - Keyboard support (Escape to clear)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SearchBar />
 *
 * // With custom placeholder
 * <SearchBar placeholder="Find words..." />
 *
 * // With custom debounce delay
 * <SearchBar debounceMs={500} />
 *
 * // With callbacks
 * <SearchBar
 *   onChange={(value) => console.log('Search:', value)}
 *   onClear={() => console.log('Cleared')}
 * />
 * ```
 */
export const SearchBar = ({
  placeholder = 'Search...',
  size = 'md',
  debounceMs = 300,
  disabled = false,
  className = '',
  onChange,
  onClear,
  ...props
}: SearchBarProps) => {
  // Get current search query from store
  const storeQuery = useSelector(uiStore.searchQuery$);

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(storeQuery);

  // Ref for debounce timeout
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value with store when store changes externally
  useEffect(() => {
    setLocalValue(storeQuery);
  }, [storeQuery]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Handle input change with debouncing
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new debounce
      debounceRef.current = setTimeout(() => {
        uiStore.setSearchQuery(value);
        onChange?.(value);
      }, debounceMs);
    },
    [debounceMs, onChange]
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    // Clear debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Clear immediately (no debounce for clear action)
    setLocalValue('');
    uiStore.clearSearchQuery();
    onClear?.();
  }, [onClear]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleClear]
  );

  const hasValue = localValue.length > 0;

  // Build input classes
  const inputClasses = [
    'w-full',
    'border rounded-lg',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'bg-white dark:bg-gray-800',
    'text-gray-900 dark:text-gray-100',
    'placeholder-gray-400 dark:placeholder-gray-500',
    'border-gray-300 dark:border-gray-600',
    'focus:ring-blue-500 focus:border-blue-500',
    getSizeClasses(size),
    getLeftPadding(size),
    hasValue && !disabled ? getRightPadding(size) : 'pr-4',
    disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Icon position classes
  const iconContainerClasses = [
    'absolute inset-y-0 left-0 flex items-center',
    size === 'sm' ? 'pl-2' : size === 'lg' ? 'pl-4' : 'pl-3',
    'pointer-events-none',
  ].join(' ');

  // Clear button position classes
  const clearButtonClasses = [
    'absolute inset-y-0 right-0 flex items-center',
    size === 'sm' ? 'pr-2' : size === 'lg' ? 'pr-4' : 'pr-3',
  ].join(' ');

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Icon */}
      <div className={iconContainerClasses}>
        <Icon
          name="search"
          size={getIconSize(size)}
          color="secondary"
          aria-hidden="true"
        />
      </div>

      {/* Search Input */}
      <input
        type="search"
        role="searchbox"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />

      {/* Clear Button */}
      {hasValue && !disabled && (
        <div className={clearButtonClasses}>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Clear search"
          >
            <Icon
              name="close"
              size={getIconSize(size)}
              color="secondary"
            />
          </button>
        </div>
      )}
    </div>
  );
};
