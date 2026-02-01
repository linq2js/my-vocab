/**
 * Tests for ContentTypeFilter molecule component.
 * Tests content type chip selection and interaction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ContentTypeFilter } from './ContentTypeFilter';
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
        })),
      },
      setFilters: vi.fn(),
    },
  };
});

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn((atom$) => atom$.get()),
}));

describe('ContentTypeFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
      language: null,
      contentTypes: [],
      tags: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render the filter container', () => {
      render(<ContentTypeFilter />);
      expect(screen.getByTestId('content-type-filter')).toBeInTheDocument();
    });

    it('should render all content type chips', () => {
      render(<ContentTypeFilter />);
      expect(screen.getByTestId('content-type-chip-all')).toBeInTheDocument();
      expect(screen.getByTestId('content-type-chip-vocabulary')).toBeInTheDocument();
      expect(screen.getByTestId('content-type-chip-phrasal-verb')).toBeInTheDocument();
      expect(screen.getByTestId('content-type-chip-idiom')).toBeInTheDocument();
      expect(screen.getByTestId('content-type-chip-quote')).toBeInTheDocument();
    });

    it('should show All chip as selected by default', () => {
      render(<ContentTypeFilter />);
      const allChip = screen.getByTestId('content-type-chip-all');
      expect(allChip).toHaveAttribute('aria-pressed', 'true');
    });

    it('should apply custom className', () => {
      render(<ContentTypeFilter className="custom-class" />);
      expect(screen.getByTestId('content-type-filter')).toHaveClass('custom-class');
    });
  });

  describe('Selection', () => {
    it('should select a content type when clicked', () => {
      render(<ContentTypeFilter />);
      const vocabChip = screen.getByTestId('content-type-chip-vocabulary');
      
      fireEvent.click(vocabChip);
      
      expect(uiStore.setFilters).toHaveBeenCalledWith({
        contentTypes: ['vocabulary'],
      });
    });

    it('should allow multiple selections', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: null,
        contentTypes: ['vocabulary'],
        tags: [],
      });
      
      render(<ContentTypeFilter />);
      const idiomChip = screen.getByTestId('content-type-chip-idiom');
      
      fireEvent.click(idiomChip);
      
      expect(uiStore.setFilters).toHaveBeenCalledWith({
        contentTypes: ['vocabulary', 'idiom'],
      });
    });

    it('should deselect a content type when clicked again', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: null,
        contentTypes: ['vocabulary', 'idiom'],
        tags: [],
      });
      
      render(<ContentTypeFilter />);
      const vocabChip = screen.getByTestId('content-type-chip-vocabulary');
      
      fireEvent.click(vocabChip);
      
      expect(uiStore.setFilters).toHaveBeenCalledWith({
        contentTypes: ['idiom'],
      });
    });

    it('should clear all selections when All is clicked', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: null,
        contentTypes: ['vocabulary', 'idiom'],
        tags: [],
      });
      
      render(<ContentTypeFilter />);
      const allChip = screen.getByTestId('content-type-chip-all');
      
      fireEvent.click(allChip);
      
      expect(uiStore.setFilters).toHaveBeenCalledWith({
        contentTypes: [],
      });
    });

    it('should show All as selected when no content types are selected', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: null,
        contentTypes: [],
        tags: [],
      });
      
      render(<ContentTypeFilter />);
      const allChip = screen.getByTestId('content-type-chip-all');
      
      expect(allChip).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show All as not selected when content types are selected', () => {
      (uiStore.filters$.get as ReturnType<typeof vi.fn>).mockReturnValue({
        language: null,
        contentTypes: ['vocabulary'],
        tags: [],
      });
      
      render(<ContentTypeFilter />);
      const allChip = screen.getByTestId('content-type-chip-all');
      
      expect(allChip).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Disabled State', () => {
    it('should disable all chips when disabled prop is true', () => {
      render(<ContentTypeFilter disabled />);
      
      const allChip = screen.getByTestId('content-type-chip-all');
      const vocabChip = screen.getByTestId('content-type-chip-vocabulary');
      
      expect(allChip).toBeDisabled();
      expect(vocabChip).toBeDisabled();
    });

    it('should not call setFilters when disabled', () => {
      render(<ContentTypeFilter disabled />);
      const vocabChip = screen.getByTestId('content-type-chip-vocabulary');
      
      fireEvent.click(vocabChip);
      
      expect(uiStore.setFilters).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="group" with aria-label', () => {
      render(<ContentTypeFilter />);
      const container = screen.getByTestId('content-type-filter');
      
      expect(container).toHaveAttribute('role', 'group');
      expect(container).toHaveAttribute('aria-label', 'Filter by content type');
    });

    it('should have aria-pressed attribute on chips', () => {
      render(<ContentTypeFilter />);
      const allChip = screen.getByTestId('content-type-chip-all');
      const vocabChip = screen.getByTestId('content-type-chip-vocabulary');
      
      expect(allChip).toHaveAttribute('aria-pressed');
      expect(vocabChip).toHaveAttribute('aria-pressed');
    });
  });
});
