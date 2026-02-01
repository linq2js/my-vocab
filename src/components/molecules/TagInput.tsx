import {
  useState,
  useRef,
  useCallback,
  useId,
  useEffect,
  KeyboardEvent,
  FocusEvent,
  InputHTMLAttributes,
} from "react";
import { Tag, TagVariant, TagSize } from "../atoms/Tag";

/**
 * Input size options matching the Input atom
 */
export type TagInputSize = "sm" | "md" | "lg";

/**
 * Props for the TagInput component
 */
export interface TagInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size" | "onChange" | "value"
  > {
  /** Current array of tags */
  tags: string[];
  /** Callback when tags change (add or remove) */
  onChange: (tags: string[]) => void;
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
  /** Size of the input and tags */
  size?: TagInputSize;
  /** Variant for the tags */
  tagVariant?: TagVariant;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Callback when input loses focus */
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  /** Callback when input gains focus */
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  /** Available tag suggestions for autocomplete */
  suggestions?: string[];
}

/**
 * Get size-specific CSS classes for the input
 */
const getSizeClasses = (size: TagInputSize): string => {
  const sizes: Record<TagInputSize, string> = {
    sm: "py-1 text-sm",
    md: "py-1.5 text-base",
    lg: "py-2 text-lg",
  };
  return sizes[size];
};

/**
 * Get tag size based on input size
 */
const getTagSize = (size: TagInputSize): TagSize => {
  const tagSizes: Record<TagInputSize, TagSize> = {
    sm: "sm",
    md: "sm",
    lg: "md",
  };
  return tagSizes[size];
};

/**
 * TagInput molecule component for managing a list of tags.
 * Integrates Input and Tag atoms to provide add/remove functionality.
 *
 * Features:
 * - Add tags by pressing Enter or comma
 * - Remove tags by clicking the remove button or pressing Backspace
 * - Prevents duplicate tags
 * - Optional maximum tag limit
 * - Full accessibility support
 * - Multiple sizes and tag variants
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [tags, setTags] = useState<string[]>([]);
 * <TagInput tags={tags} onChange={setTags} />
 *
 * // With label and placeholder
 * <TagInput
 *   tags={tags}
 *   onChange={setTags}
 *   label="Tags"
 *   placeholder="Add a tag..."
 * />
 *
 * // With max tags limit
 * <TagInput
 *   tags={tags}
 *   onChange={setTags}
 *   maxTags={5}
 *   helperText="Maximum 5 tags"
 * />
 *
 * // With custom tag variant
 * <TagInput
 *   tags={tags}
 *   onChange={setTags}
 *   tagVariant="primary"
 * />
 * ```
 */
export const TagInput = ({
  tags,
  onChange,
  label,
  error,
  helperText,
  size = "md",
  tagVariant = "default",
  maxTags,
  disabled = false,
  className = "",
  placeholder = "Type and press Enter...",
  onBlur,
  onFocus,
  id: providedId,
  suggestions = [],
  ...props
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const hasError = Boolean(error);
  const isMaxReached = maxTags !== undefined && tags.length >= maxTags;

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !tags.includes(suggestion.toLowerCase()) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Reset selected index when filtered suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [inputValue]);

  /**
   * Add a new tag if it's valid and not a duplicate
   */
  const addTag = useCallback(
    (value: string) => {
      const trimmedValue = value.trim().toLowerCase();

      // Don't add empty tags
      if (!trimmedValue) {
        return false;
      }

      // Don't add duplicates
      if (tags.includes(trimmedValue)) {
        return false;
      }

      // Don't exceed max tags
      if (maxTags !== undefined && tags.length >= maxTags) {
        return false;
      }

      onChange([...tags, trimmedValue]);
      return true;
    },
    [tags, onChange, maxTags]
  );

  /**
   * Remove a tag by index
   */
  const removeTag = useCallback(
    (index: number) => {
      const newTags = tags.filter((_, i) => i !== index);
      onChange(newTags);
    },
    [tags, onChange]
  );

  /**
   * Select a suggestion and add it as a tag
   */
  const selectSuggestion = useCallback(
    (suggestion: string) => {
      if (addTag(suggestion)) {
        setInputValue("");
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.focus();
      }
    },
    [addTag]
  );

  /**
   * Handle keyboard events for adding/removing tags
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const value = inputValue;

      // Navigate suggestions with arrow keys
      if (showSuggestions && filteredSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          return;
        }
        // Select suggestion on Enter if one is highlighted
        if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[selectedSuggestionIndex]!);
          return;
        }
        // Close suggestions on Escape
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          return;
        }
      }

      // Add tag on Enter
      if (e.key === "Enter") {
        e.preventDefault();
        if (addTag(value)) {
          setInputValue("");
        }
        return;
      }

      // Remove last tag on Backspace when input is empty
      if (e.key === "Backspace" && value === "" && tags.length > 0) {
        removeTag(tags.length - 1);
        return;
      }
    },
    [inputValue, addTag, removeTag, tags.length, showSuggestions, filteredSuggestions, selectedSuggestionIndex, selectSuggestion]
  );

  /**
   * Handle input change - also check for comma to add tag
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Check for comma separator
      if (value.endsWith(",")) {
        const tagValue = value.slice(0, -1);
        if (addTag(tagValue)) {
          setInputValue("");
          setShowSuggestions(false);
        } else {
          setInputValue(tagValue);
        }
        return;
      }

      setInputValue(value);
      // Show suggestions when typing and there are matches
      setShowSuggestions(value.length > 0 && suggestions.length > 0);
    },
    [addTag, suggestions.length]
  );

  /**
   * Handle input focus - show suggestions if input has value
   */
  const handleInputFocus = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      if (inputValue.length > 0 && suggestions.length > 0) {
        setShowSuggestions(true);
      }
      onFocus?.(e);
    },
    [inputValue, suggestions.length, onFocus]
  );

  /**
   * Handle input blur - hide suggestions after a delay (to allow click)
   */
  const handleInputBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }, 200);
      onBlur?.(e);
    },
    [onBlur]
  );

  /**
   * Focus the input when clicking the container
   */
  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Build container classes
  const containerClasses = [
    "flex flex-wrap items-center gap-2",
    "px-3 border rounded-lg",
    "transition-colors duration-200",
    "bg-white dark:bg-gray-800",
    "cursor-text",
    hasError
      ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500"
      : "border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
    disabled
      ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900"
      : "",
    getSizeClasses(size),
  ]
    .filter(Boolean)
    .join(" ");

  // Build input classes
  const inputClasses = [
    "flex-1 min-w-[120px]",
    "bg-transparent",
    "outline-none",
    "text-gray-900 dark:text-gray-100",
    "placeholder-gray-400 dark:placeholder-gray-500",
    disabled ? "cursor-not-allowed" : "",
    getSizeClasses(size),
  ]
    .filter(Boolean)
    .join(" ");

  const tagCount = tags.length;
  const tagCountText = `${tagCount} tag${tagCount !== 1 ? "s" : ""}`;

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}

      {/* Tag Input Container - wrapped in relative for dropdown positioning */}
      <div className="relative">
        <div
          className={containerClasses}
          onClick={handleContainerClick}
          role="group"
          aria-label={label || "Tag input"}
        >
          {/* Existing Tags */}
          {tags.map((tag, index) => (
            <Tag
              key={`${tag}-${index}`}
              variant={tagVariant}
              size={getTagSize(size)}
              removable={!disabled}
              onRemove={() => removeTag(index)}
            >
              {tag}
            </Tag>
          ))}

          {/* Input Field */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            placeholder={isMaxReached ? "" : placeholder}
            disabled={disabled || isMaxReached}
            className={inputClasses}
            aria-invalid={hasError || undefined}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            aria-autocomplete={suggestions.length > 0 ? "list" : undefined}
            aria-expanded={showSuggestions && filteredSuggestions.length > 0}
            {...props}
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            role="listbox"
            aria-label="Tag suggestions"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedSuggestionIndex
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Screen reader tag count */}
      <span className="sr-only" aria-live="polite">
        {tagCountText}
      </span>

      {/* Visible tag count for sighted users */}
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
        {tagCountText}
      </span>

      {/* Error Message */}
      {hasError && (
        <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <p
          id={helperId}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
