import { InputHTMLAttributes, forwardRef, useId } from 'react';

/**
 * Input size options
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Input component
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
  /** Size of the input */
  size?: InputSize;
  /** Whether the input should take full width of its container */
  fullWidth?: boolean;
}

/**
 * Get size-specific CSS classes for the input
 */
const getSizeClasses = (size: InputSize): string => {
  const sizes: Record<InputSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };
  return sizes[size];
};

/**
 * Reusable Input component with label, error states, and validation support.
 * Supports multiple sizes, helper text, and full accessibility features.
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input placeholder="Enter text" />
 *
 * // With label
 * <Input label="Email" type="email" />
 *
 * // With error
 * <Input label="Password" error="Password is required" />
 *
 * // With helper text
 * <Input label="Username" helperText="Must be at least 3 characters" />
 *
 * // Full width
 * <Input label="Search" fullWidth />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = 'md',
      fullWidth = false,
      disabled,
      required,
      className = '',
      type = 'text',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = Boolean(error);

    const baseClasses = [
      'border rounded-lg',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'bg-white dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'placeholder-gray-400 dark:placeholder-gray-500',
    ].join(' ');

    const sizeClasses = getSizeClasses(size);

    const stateClasses = disabled
      ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900'
      : 'cursor-text';

    const borderClasses = hasError
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500';

    const widthClasses = fullWidth ? 'w-full' : '';

    const combinedClasses = [
      baseClasses,
      sizeClasses,
      stateClasses,
      borderClasses,
      widthClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          className={combinedClasses}
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />
        {hasError && (
          <p
            id={errorId}
            className="mt-1 text-sm text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
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
  }
);

Input.displayName = 'Input';
