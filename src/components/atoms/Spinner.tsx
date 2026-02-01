/**
 * Spinner size options
 */
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner color options
 */
export type SpinnerColor = 'primary' | 'secondary' | 'white' | 'current';

/**
 * Props for the Spinner component
 */
export interface SpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Color of the spinner */
  color?: SpinnerColor;
  /** Accessible label for screen readers */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: SpinnerSize): string => {
  const sizes: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };
  return sizes[size];
};

/**
 * Get color-specific CSS classes
 */
const getColorClasses = (color: SpinnerColor): string => {
  const colors: Record<SpinnerColor, string> = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    current: 'text-current',
  };
  return colors[color];
};

/**
 * Loading spinner component with TailwindCSS animation.
 * Supports multiple sizes and colors for different use cases.
 *
 * @example
 * ```tsx
 * // Default spinner
 * <Spinner />
 *
 * // Large spinner with secondary color
 * <Spinner size="lg" color="secondary" />
 *
 * // White spinner for dark backgrounds
 * <Spinner color="white" />
 *
 * // Custom label for accessibility
 * <Spinner label="Saving your changes..." />
 * ```
 */
export const Spinner = ({
  size = 'md',
  color = 'primary',
  label = 'Loading',
  className = '',
}: SpinnerProps) => {
  const sizeClasses = getSizeClasses(size);
  const colorClasses = getColorClasses(color);

  const combinedClasses = [
    'animate-spin',
    sizeClasses,
    colorClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      role="status"
      aria-label={label}
      className={combinedClasses}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
