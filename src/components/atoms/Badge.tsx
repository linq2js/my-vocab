import { HTMLAttributes, ReactNode } from 'react';

/**
 * Badge variant types for different visual styles
 */
export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Badge size options
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Badge component
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge content */
  children: ReactNode;
  /** Visual variant of the badge */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Whether to show a dot indicator */
  dot?: boolean;
  /** Whether to show as a circle (for single characters like V, I, P, Q) */
  circular?: boolean;
}

/**
 * Get variant-specific CSS classes for the badge background and text
 */
const getVariantClasses = (variant: BadgeVariant): string => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  };
  return variants[variant];
};

/**
 * Get variant-specific CSS classes for the dot indicator
 */
const getDotVariantClasses = (variant: BadgeVariant): string => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-500',
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
  };
  return variants[variant];
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: BadgeSize): string => {
  const sizes: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-sm',
    lg: 'px-2.5 py-1 text-base',
  };
  return sizes[size];
};

/**
 * Get circular size-specific CSS classes (fixed width/height for single characters)
 */
const getCircularSizeClasses = (size: BadgeSize): string => {
  const sizes: Record<BadgeSize, string> = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base',
  };
  return sizes[size];
};

/**
 * Reusable Badge component for displaying status indicators, counts, or labels.
 * Supports multiple variants, sizes, and an optional dot indicator.
 *
 * @example
 * ```tsx
 * // Default badge
 * <Badge>New</Badge>
 *
 * // Success variant
 * <Badge variant="success">Active</Badge>
 *
 * // With dot indicator
 * <Badge variant="primary" dot>Online</Badge>
 *
 * // Different sizes
 * <Badge size="sm">Small</Badge>
 * <Badge size="lg">Large</Badge>
 * ```
 */
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  circular = false,
  className = '',
  ...props
}: BadgeProps) => {
  const baseClasses = circular
    ? 'inline-flex items-center justify-center font-semibold rounded-full'
    : 'inline-flex items-center font-medium rounded-full';

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = circular 
    ? getCircularSizeClasses(size) 
    : getSizeClasses(size);

  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const dotClasses = [
    'w-1.5 h-1.5 rounded-full mr-1.5',
    getDotVariantClasses(variant),
  ].join(' ');

  return (
    <span
      className={combinedClasses}
      role="status"
      {...props}
    >
      {dot && (
        <span
          className={dotClasses}
          data-testid="badge-dot"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
