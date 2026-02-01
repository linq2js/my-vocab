import { useState, useId, InputHTMLAttributes } from 'react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import type { InputSize } from '../atoms/Input';

/**
 * Test result state for API key validation
 */
export type TestResult = 'success' | 'error' | null;

/**
 * Props for the ApiKeyInput component
 */
export interface ApiKeyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange' | 'value' | 'type'> {
  /** Current value of the API key input */
  value: string;
  /** Callback when the value changes */
  onChange: (value: string) => void;
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
  /** Size of the input */
  size?: InputSize;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Callback to test the API key */
  onTest?: () => void;
  /** Whether the API key is currently being tested */
  testing?: boolean;
  /** Result of the API key test */
  testResult?: TestResult;
  /** Additional CSS classes */
  className?: string;
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
 * Get right padding based on input size (to accommodate buttons)
 */
const getRightPadding = (size: InputSize, hasTestButton: boolean): string => {
  if (hasTestButton) {
    // Extra padding for both toggle and test button
    const paddings: Record<InputSize, string> = {
      sm: 'pr-24',
      md: 'pr-28',
      lg: 'pr-32',
    };
    return paddings[size];
  }
  // Padding for just toggle button
  const paddings: Record<InputSize, string> = {
    sm: 'pr-8',
    md: 'pr-10',
    lg: 'pr-12',
  };
  return paddings[size];
};

/**
 * Get icon size based on input size
 */
const getIconSize = (size: InputSize): 'sm' | 'md' | 'lg' => {
  return size;
};

/**
 * ApiKeyInput molecule component for secure API key entry with validation.
 *
 * Features:
 * - Password-style input with show/hide toggle
 * - Optional test button to validate API key
 * - Loading state during API key testing
 * - Success/error states after testing
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ApiKeyInput
 *   value={apiKey}
 *   onChange={setApiKey}
 *   label="OpenAI API Key"
 * />
 *
 * // With test functionality
 * <ApiKeyInput
 *   value={apiKey}
 *   onChange={setApiKey}
 *   label="API Key"
 *   onTest={handleTestApiKey}
 *   testing={isTestingKey}
 *   testResult={testResult}
 * />
 *
 * // With validation error
 * <ApiKeyInput
 *   value={apiKey}
 *   onChange={setApiKey}
 *   error="API key must start with sk-"
 * />
 * ```
 */
export const ApiKeyInput = ({
  value,
  onChange,
  label,
  error,
  helperText,
  size = 'md',
  disabled = false,
  onTest,
  testing = false,
  testResult = null,
  className = '',
  placeholder,
  id: providedId,
  ...props
}: ApiKeyInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const testResultId = `${id}-test-result`;

  const hasError = Boolean(error);
  const hasTestButton = Boolean(onTest);
  const isTestButtonDisabled = disabled || testing || !value.trim();

  /**
   * Handle input value change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  /**
   * Toggle password visibility
   */
  const handleToggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  /**
   * Handle test button click
   */
  const handleTest = () => {
    onTest?.();
  };

  // Build input classes
  const baseClasses = [
    'w-full',
    'border rounded-lg',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'bg-white dark:bg-gray-800',
    'text-gray-900 dark:text-gray-100',
    'placeholder-gray-400 dark:placeholder-gray-500',
  ].join(' ');

  const sizeClasses = getSizeClasses(size);
  const rightPadding = getRightPadding(size, hasTestButton);

  const stateClasses = disabled
    ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900'
    : 'cursor-text';

  const borderClasses = hasError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500';

  const inputClasses = [
    baseClasses,
    sizeClasses,
    rightPadding,
    stateClasses,
    borderClasses,
  ]
    .filter(Boolean)
    .join(' ');

  // Build toggle button position classes
  const togglePositionClasses = hasTestButton
    ? size === 'sm'
      ? 'right-16'
      : size === 'lg'
        ? 'right-20'
        : 'right-18'
    : size === 'sm'
      ? 'right-2'
      : size === 'lg'
        ? 'right-3'
        : 'right-2.5';

  // Get aria-describedby value
  const getAriaDescribedBy = (): string | undefined => {
    const describedBy: string[] = [];
    if (hasError) describedBy.push(errorId);
    else if (helperText) describedBy.push(helperId);
    if (testResult) describedBy.push(testResultId);
    return describedBy.length > 0 ? describedBy.join(' ') : undefined;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Input */}
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          role="textbox"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
          aria-invalid={hasError || undefined}
          aria-describedby={getAriaDescribedBy()}
          {...props}
        />

        {/* Action Buttons Container */}
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {/* Toggle Visibility Button */}
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={disabled}
            className={`
              p-1 rounded-md
              hover:bg-gray-100 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={showPassword ? 'Toggle visibility (hide)' : 'Toggle visibility (show)'}
          >
            <Icon
              name={showPassword ? 'eye-off' : 'eye'}
              size={getIconSize(size)}
              color="secondary"
            />
          </button>

          {/* Test Button */}
          {hasTestButton && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={isTestButtonDisabled}
              loading={testing}
              className="text-xs"
            >
              {testing ? 'Testing...' : 'Test'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-500"
          role="alert"
        >
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

      {/* Test Result */}
      {testResult && (
        <p
          id={testResultId}
          className={`mt-1 text-sm ${
            testResult === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500'
          }`}
        >
          {testResult === 'success' ? 'API key is valid' : 'API key is invalid or failed'}
        </p>
      )}
    </div>
  );
};
