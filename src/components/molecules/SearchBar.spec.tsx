import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { uiStore } from '../../stores/ui.store';

describe('SearchBar', () => {
  beforeEach(() => {
    // Reset UI store before each test
    uiStore.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      render(<SearchBar />);
      // Icon should be present (aria-hidden for decorative)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<SearchBar />);
      expect(screen.getByPlaceholderText('Search vocabularies...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SearchBar placeholder="Find words..." />);
      expect(screen.getByPlaceholderText('Find words...')).toBeInTheDocument();
    });

    it('should be full width by default', () => {
      render(<SearchBar />);
      const container = screen.getByRole('searchbox').closest('div');
      expect(container).toHaveClass('w-full');
    });
  });

  describe('debouncing', () => {
    it('should not update store immediately on input', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });

      // Store should not be updated immediately
      expect(uiStore.searchQuery$.get()).toBe('');
    });

    it('should update store after debounce delay', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'hello' } });

      // Advance timers by debounce delay (300ms default)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(uiStore.searchQuery$.get()).toBe('hello');
    });

    it('should use custom debounce delay when provided', async () => {
      render(<SearchBar debounceMs={500} />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });

      // After 300ms, should not be updated yet
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(uiStore.searchQuery$.get()).toBe('');

      // After 500ms total, should be updated
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(uiStore.searchQuery$.get()).toBe('test');
    });

    it('should cancel previous debounce on new input', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'first' } });

      // Wait partial time
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Type again before debounce completes
      fireEvent.change(input, { target: { value: 'second' } });

      // Complete first debounce time - should not trigger first value
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(uiStore.searchQuery$.get()).toBe('');

      // Complete second debounce time
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(uiStore.searchQuery$.get()).toBe('second');
    });
  });

  describe('clear functionality', () => {
    it('should not show clear button when input is empty', () => {
      render(<SearchBar />);
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('should show clear button when input has value', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      expect(input).toHaveValue('');
    });

    it('should clear store when clear button is clicked', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      // Set initial value and wait for debounce
      fireEvent.change(input, { target: { value: 'test' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(uiStore.searchQuery$.get()).toBe('test');

      // Click clear
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      // Store should be cleared immediately (no debounce for clear)
      expect(uiStore.searchQuery$.get()).toBe('');
    });
  });

  describe('store integration', () => {
    it('should initialize with store value', () => {
      uiStore.setSearchQuery('initial');
      render(<SearchBar />);

      expect(screen.getByRole('searchbox')).toHaveValue('initial');
    });

    it('should sync with external store updates', () => {
      const { rerender } = render(<SearchBar />);

      act(() => {
        uiStore.setSearchQuery('external');
      });

      // Re-render to pick up store changes
      rerender(<SearchBar />);

      expect(screen.getByRole('searchbox')).toHaveValue('external');
    });
  });

  describe('callbacks', () => {
    it('should call onChange callback with debounced value', () => {
      const handleChange = vi.fn();
      render(<SearchBar onChange={handleChange} />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(handleChange).toHaveBeenCalledWith('test');
    });

    it('should call onClear callback when cleared', () => {
      const handleClear = vi.fn();
      render(<SearchBar onClear={handleClear} />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      expect(handleClear).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have search role', () => {
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<SearchBar aria-label="Search vocabulary" />);
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search vocabulary');
    });

    it('should support keyboard navigation', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('should clear on Escape key', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).toHaveValue('');
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<SearchBar disabled />);
      expect(screen.getByRole('searchbox')).toBeDisabled();
    });

    it('should not show clear button when disabled', () => {
      render(<SearchBar disabled />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'test' } });

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<SearchBar className="custom-class" />);
      const container = screen.getByRole('searchbox').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<SearchBar size="sm" />);
      expect(screen.getByRole('searchbox')).toHaveClass('py-1.5');

      rerender(<SearchBar size="lg" />);
      expect(screen.getByRole('searchbox')).toHaveClass('py-3');
    });
  });
});
