import { HTMLAttributes, ReactNode, MouseEvent } from 'react';

/**
 * Tag variant types for different visual styles
 */
export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

/**
 * Tag size options
 */
export type TagSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Tag component
 */
export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  /** Tag content */
  children: ReactNode;
  /** Visual variant of the tag */
  variant?: TagVariant;
  /** Size of the tag */
  size?: TagSize;
  /** Whether the tag can be removed */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Callback when tag is clicked */
  onClick?: () => void;
}

/**
 * Remove icon component (X icon)
 */
const RemoveIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * Get variant-specific CSS classes
 */
const getVariantClasses = (variant: TagVariant): string => {
  const variants: Record<TagVariant, string> = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return variants[variant];
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: TagSize): string => {
  const sizes: Record<TagSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  return sizes[size];
};

/**
 * Reusable Tag component for displaying labels, categories, or keywords.
 * Supports multiple variants, sizes, and a removable option.
 *
 * @example
 * ```tsx
 * // Default tag
 * <Tag>JavaScript</Tag>
 *
 * // Primary variant
 * <Tag variant="primary">Featured</Tag>
 *
 * // Removable tag
 * <Tag removable onRemove={() => handleRemove(id)}>
 *   React
 * </Tag>
 *
 * // Clickable tag
 * <Tag onClick={() => handleFilter('typescript')}>
 *   TypeScript
 * </Tag>
 * ```
 */
export const Tag = ({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  className = '',
  ...props
}: TagProps) => {
  const baseClasses = [
    'inline-flex items-center',
    'font-medium rounded-full',
    'transition-opacity duration-200',
  ].join(' ');

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80' : '';

  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    interactiveClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * Handle tag click - only triggers if onClick is provided
   */
  const handleTagClick = () => {
    if (onClick) {
      onClick();
    }
  };

  /**
   * Handle remove button click - stops propagation to prevent tag click
   */
  const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span
      className={combinedClasses}
      onClick={handleTagClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={handleRemoveClick}
          className="ml-1 -mr-0.5 inline-flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-current p-0.5"
          aria-label="Remove tag"
        >
          <RemoveIcon />
        </button>
      )}
    </span>
  );
};
