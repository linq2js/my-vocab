/**
 * Tests for FilterPanel molecule component.
 * Tests filter controls for language and part of speech.
 * Note: Content type filtering is handled by ContentTypeFilter component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import { uiStore } from '../../stores/ui.store';

// Mock the uiStore
vi.mock('../../stores/ui.store', async () => {
  const actual = await vi.importActual('../../stores/ui.store');
  return {
    ...actual,
    uiStore: {
      filters$: {
        get: vi.fn(() => ({
          language: null,
          contentTypes: [],
          tags: [],
          noCustomTag: false,
        })),
      },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      hasActiveFilters: vi.fn(() => false),
    },
  };
});

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn((atom$) => atom$.get()),
}));

describe('FilterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
      language: null,
      contentTypes: [],
      tags: [],
      noCustomTag: false,
    });
    (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render the filter panel', () => {
      render(<FilterPanel />);
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('should render language filter dropdown', () => {
      render(<FilterPanel />);
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    });

    it('should render part of speech filter dropdown', () => {
      render(<FilterPanel />);
      expect(screen.getByLabelText(/part of speech/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<FilterPanel className="custom-class" />);
      expect(screen.getByTestId('filter-panel')).toHaveClass('custom-class');
    });
  });

  describe('Language Filter', () => {
    it('should display "All Languages" as default option', () => {
      render(<FilterPanel />);
      const languageSelect = screen.getByLabelText(/language/i) as HTMLSelectElement;
      expect(languageSelect.value).toBe('');
    });

    it('should call setFilters when language is selected', () => {
      render(<FilterPanel />);
      const languageSelect = screen.getByLabelText(/language/i);
      fireEvent.change(languageSelect, { target: { value: 'en' } });
      expect(uiStore.setFilters).toHaveBeenCalledWith({ language: 'en' });
    });

    it('should call setFilters with null when "All Languages" is selected', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: 'en',
        contentTypes: [],
        tags: [],
      });
      render(<FilterPanel />);
      const languageSelect = screen.getByLabelText(/language/i);
      fireEvent.change(languageSelect, { target: { value: '' } });
      expect(uiStore.setFilters).toHaveBeenCalledWith({ language: null });
    });

    it('should display all available languages', () => {
      render(<FilterPanel />);
      const languageSelect = screen.getByLabelText(/language/i);
      expect(languageSelect).toContainHTML('English');
      expect(languageSelect).toContainHTML('Spanish');
      expect(languageSelect).toContainHTML('French');
    });
  });

  describe('Part of Speech Filter', () => {
    it('should display "All Parts" as default option', () => {
      render(<FilterPanel />);
      const posSelect = screen.getByLabelText(/part of speech/i) as HTMLSelectElement;
      expect(posSelect.value).toBe('');
    });

    it('should display common parts of speech', () => {
      render(<FilterPanel />);
      const posSelect = screen.getByLabelText(/part of speech/i);
      expect(posSelect).toContainHTML('Noun');
      expect(posSelect).toContainHTML('Verb');
      expect(posSelect).toContainHTML('Adjective');
      expect(posSelect).toContainHTML('Adverb');
    });

    it('should call onChange when part of speech is selected', () => {
      const onChange = vi.fn();
      render(<FilterPanel onPartOfSpeechChange={onChange} />);
      const posSelect = screen.getByLabelText(/part of speech/i);
      fireEvent.change(posSelect, { target: { value: 'noun' } });
      expect(onChange).toHaveBeenCalledWith('noun');
    });
  });

  describe('Reset Filters', () => {
    it('should show reset button when filters are active', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<FilterPanel />);
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('should not show reset button when no filters are active', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<FilterPanel />);
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });

    it('should call resetFilters when reset button is clicked', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<FilterPanel />);
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      expect(uiStore.resetFilters).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onLanguageChange when language changes', () => {
      const onLanguageChange = vi.fn();
      render(<FilterPanel onLanguageChange={onLanguageChange} />);
      const languageSelect = screen.getByLabelText(/language/i);
      fireEvent.change(languageSelect, { target: { value: 'es' } });
      expect(onLanguageChange).toHaveBeenCalledWith('es');
    });

    it('should call onReset when reset button is clicked', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const onReset = vi.fn();
      render(<FilterPanel onReset={onReset} />);
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all filters', () => {
      render(<FilterPanel />);
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/part of speech/i)).toBeInTheDocument();
    });

    it('should have proper aria-label on reset button', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<FilterPanel />);
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toHaveAttribute('aria-label');
    });
  });

  describe('Disabled State', () => {
    it('should disable all filters when disabled prop is true', () => {
      render(<FilterPanel disabled />);
      expect(screen.getByLabelText(/language/i)).toBeDisabled();
      expect(screen.getByLabelText(/part of speech/i)).toBeDisabled();
    });

    it('should disable reset button when disabled prop is true', () => {
      (uiStore.hasActiveFilters as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<FilterPanel disabled />);
      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when compact prop is true', () => {
      render(<FilterPanel compact />);
      const panel = screen.getByTestId('filter-panel');
      expect(panel).toHaveClass('flex-row');
    });

    it('should render in default mode when compact prop is false', () => {
      render(<FilterPanel compact={false} />);
      const panel = screen.getByTestId('filter-panel');
      expect(panel).toHaveClass('flex-col');
    });
  });
});
