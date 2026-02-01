import { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Button variant types for different visual styles
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

/**
 * Button size options
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Button component
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode;
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button should take full width of its container */
  fullWidth?: boolean;
}

/**
 * Spinner component for loading state
 */
const Spinner = () => (
  <svg
    data-testid="button-spinner"
    className="animate-spin -ml-1 mr-2 h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
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

/**
 * Get variant-specific CSS classes
 */
const getVariantClasses = (variant: ButtonVariant): string => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:hover:bg-blue-900/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return variants[variant];
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: ButtonSize): string => {
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  return sizes[size];
};

/**
 * Reusable Button component with multiple variants and sizes.
 * Supports loading state, disabled state, and full-width option.
 *
 * @example
 * ```tsx
 * // Primary button (default)
 * <Button onClick={handleClick}>Click me</Button>
 *
 * // Secondary button
 * <Button variant="secondary">Cancel</Button>
 *
 * // Loading state
 * <Button loading>Saving...</Button>
 *
 * // Full width
 * <Button fullWidth>Submit</Button>
 * ```
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
  ].join(' ');

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  const stateClasses = isDisabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  const widthClasses = fullWidth ? 'w-full' : '';

  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    widthClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={combinedClasses}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
};
