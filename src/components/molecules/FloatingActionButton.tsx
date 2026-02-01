/**
 * FloatingActionButton component with speed dial menu.
 *
 * A floating action button that expands to show multiple action options
 * when clicked. Used for adding different content types (vocab, idioms, phrasal verbs).
 *
 * @example
 * ```tsx
 * <FloatingActionButton
 *   actions={[
 *     { id: 'vocab', label: 'Vocabulary', icon: 'book' },
 *     { id: 'idiom', label: 'Idiom', icon: 'globe' },
 *   ]}
 *   onActionClick={(id) => console.log('Selected:', id)}
 * />
 * ```
 */

import { useState, useRef, useEffect } from 'react';
import { Icon, type IconName } from '../atoms/Icon';

/**
 * Action item configuration
 */
export interface FABAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Icon name to display */
  icon: IconName;
}

/**
 * Props for the FloatingActionButton component
 */
export interface FloatingActionButtonProps {
  /** Array of actions to display in the speed dial menu */
  actions: FABAction[];
  /** Callback when an action is clicked */
  onActionClick: (actionId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FloatingActionButton component - FAB with speed dial menu.
 *
 * @param props - Component props
 * @returns The FloatingActionButton component
 */
export const FloatingActionButton = ({
  actions,
  onActionClick,
  className = '',
}: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Toggle the speed dial menu
   */
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Handle action click
   */
  const handleActionClick = (actionId: string) => {
    onActionClick(actionId);
    setIsOpen(false);
  };

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Close menu on escape key
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className={`fixed bottom-6 right-6 z-50 ${className}`}
    >
      {/* Speed Dial Menu */}
      <div
        className={`
          absolute bottom-16 right-0 mb-2
          flex flex-col-reverse gap-2
          transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleActionClick(action.id)}
            className="
              flex items-center gap-3 px-4 py-3
              bg-gray-800 dark:bg-gray-700 
              text-white rounded-lg shadow-lg
              hover:bg-gray-700 dark:hover:bg-gray-600
              transition-colors duration-150
              whitespace-nowrap
              min-w-max
            "
            aria-label={action.label}
          >
            <Icon name={action.icon} size="sm" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          aria-hidden="true"
        />
      )}

      {/* Main FAB Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          w-14 h-14 rounded-full
          bg-blue-600 hover:bg-blue-700
          text-white shadow-lg
          flex items-center justify-center
          transition-all duration-200
          ${isOpen ? 'rotate-45 bg-gray-600 hover:bg-gray-700' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={isOpen ? 'Close menu' : 'Add new item'}
      >
        <Icon name="plus" size="lg" />
      </button>
    </div>
  );
};
