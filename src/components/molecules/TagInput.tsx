import {
  useState,
  useRef,
  useCallback,
  useId,
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
  ...props
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const hasError = Boolean(error);
  const isMaxReached = maxTags !== undefined && tags.length >= maxTags;

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
   * Handle keyboard events for adding/removing tags
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const value = inputValue;

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
    [inputValue, addTag, removeTag, tags.length]
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
        } else {
          setInputValue(tagValue);
        }
        return;
      }

      setInputValue(value);
    },
    [addTag]
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

      {/* Tag Input Container */}
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
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={isMaxReached ? "" : placeholder}
          disabled={disabled || isMaxReached}
          className={inputClasses}
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />
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
