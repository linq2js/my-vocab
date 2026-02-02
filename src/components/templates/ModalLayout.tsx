import React, { ReactNode, useEffect, useId, MouseEvent } from 'react';
import { Icon } from '../atoms';

/**
 * Modal size options
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Props for the ModalLayout component
 */
export interface ModalLayoutProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Optional title for the modal header */
  title?: string;
  /** Optional custom header content (replaces title if provided) */
  headerContent?: ReactNode;
  /** Size of the modal (default: 'md') */
  size?: ModalSize;
}

/**
 * Size class mapping for modal widths
 * Using dvh (dynamic viewport height) for full modal to handle mobile browser chrome
 */
const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-lg h-[calc(100dvh-2rem)]',
};

/**
 * Modal dialog layout component with overlay, close button, and ESC key handling.
 * Provides a consistent modal structure with:
 * - Semi-transparent overlay backdrop
 * - Centered modal container
 * - Optional title header with close button
 * - ESC key to close
 * - Click outside to close
 * - Responsive sizing
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ModalLayout isOpen={isOpen} onClose={() => setIsOpen(false)}>
 *   <p>Modal content here</p>
 * </ModalLayout>
 *
 * // With title and size
 * <ModalLayout
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Confirm Action"
 *   size="lg"
 * >
 *   <p>Are you sure you want to proceed?</p>
 *   <div className="flex gap-2 mt-4">
 *     <Button onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
 *   </div>
 * </ModalLayout>
 * ```
 */
export const ModalLayout = ({
  isOpen,
  onClose,
  children,
  title,
  headerContent,
  size = 'md',
}: ModalLayoutProps): React.ReactElement | null => {
  const titleId = useId();

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (): void => {
    onClose();
  };

  const handleContainerClick = (event: MouseEvent): void => {
    // Stop propagation to prevent overlay click handler
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Overlay */}
      <div
        data-testid="modal-overlay"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        data-testid="modal-container"
        className={`${sizeClasses[size]} w-full relative bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all flex flex-col`}
        onClick={handleContainerClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {headerContent ? (
            <div className="flex-1">{headerContent}</div>
          ) : title ? (
            <h2
              id={titleId}
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h2>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors ml-2 shrink-0"
            aria-label="Close modal"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {/* Content */}
        <div className={`${size === 'full' ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : 'p-4'}`}>{children}</div>
      </div>
    </div>
  );
};
