/**
 * FloatingActionButton component for adding new vocabulary.
 *
 * A simple floating action button that navigates to the add page.
 *
 * @example
 * ```tsx
 * <FloatingActionButton onClick={() => navigate('/add')} />
 * ```
 */

import { Icon } from '../atoms/Icon';

/**
 * Props for the FloatingActionButton component
 */
export interface FloatingActionButtonProps {
  /** Callback when the button is clicked */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for the button */
  'aria-label'?: string;
}

/**
 * FloatingActionButton component - simple FAB for adding new items.
 *
 * @param props - Component props
 * @returns The FloatingActionButton component
 */
export const FloatingActionButton = ({
  onClick,
  className = '',
  'aria-label': ariaLabel = 'Add new vocabulary',
}: FloatingActionButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        bg-blue-600 hover:bg-blue-700
        text-white shadow-lg
        flex items-center justify-center
        transition-colors duration-200
        ${className}
      `}
      aria-label={ariaLabel}
    >
      <Icon name="plus" size="lg" />
    </button>
  );
};
