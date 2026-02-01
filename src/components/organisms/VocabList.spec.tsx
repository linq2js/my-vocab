import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VocabList } from './VocabList';
import type { Vocabulary } from '../../types/vocabulary';

/**
 * Creates a mock vocabulary entry for testing
 */
const createMockVocab = (overrides: Partial<Vocabulary> = {}): Vocabulary => ({
  id: `test-id-${Math.random().toString(36).slice(2, 9)}`,
  text: 'serendipity',
  description: 'A happy accident',
  tags: ['positive', 'rare'],
  language: 'en',
  contentType: 'vocabulary',
  definition: 'The occurrence of events by chance in a happy way',
  ipa: '/ˌserənˈdɪpɪti/',
  examples: ['Finding that book was pure serendipity.'],
  partOfSpeech: 'noun',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('VocabList', () => {
  describe('rendering', () => {
    it('renders a list of vocabulary cards', () => {
      const items = [
        createMockVocab({ id: '1', text: 'serendipity' }),
        createMockVocab({ id: '2', text: 'ephemeral' }),
        createMockVocab({ id: '3', text: 'ubiquitous' }),
      ];
      render(<VocabList items={items} />);

      expect(screen.getByText('serendipity')).toBeInTheDocument();
      expect(screen.getByText('ephemeral')).toBeInTheDocument();
      expect(screen.getByText('ubiquitous')).toBeInTheDocument();
    });

    it('renders vocabulary cards as articles', () => {
      const items = [
        createMockVocab({ id: '1' }),
        createMockVocab({ id: '2' }),
      ];
      render(<VocabList items={items} />);

      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(2);
    });

    it('renders with correct list role', () => {
      const items = [createMockVocab({ examples: [] })]; // No examples to avoid nested list
      render(<VocabList items={items} />);

      expect(screen.getByRole('list', { name: 'Vocabulary list' })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when items array is empty', () => {
      render(<VocabList items={[]} />);

      expect(screen.getByTestId('vocab-list-empty')).toBeInTheDocument();
    });

    it('shows default empty message', () => {
      render(<VocabList items={[]} />);

      expect(screen.getByText(/no vocabulary items/i)).toBeInTheDocument();
    });

    it('shows custom empty message when provided', () => {
      render(<VocabList items={[]} emptyMessage="No results found" />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('shows filter hint when hasActiveFilters is true', () => {
      render(<VocabList items={[]} hasActiveFilters />);

      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });

    it('does not show filter hint when hasActiveFilters is false', () => {
      render(<VocabList items={[]} hasActiveFilters={false} />);

      expect(screen.queryByText(/try adjusting your filters/i)).not.toBeInTheDocument();
    });

    it('does not render list when empty', () => {
      render(<VocabList items={[]} />);

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('passes onEdit to VocabCard components', () => {
      const items = [createMockVocab({ id: '1', text: 'test-word' })];
      const onEdit = vi.fn();
      render(<VocabList items={items} onEdit={onEdit} />);

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(items[0]);
    });

    it('passes onDelete to VocabCard components', () => {
      const items = [createMockVocab({ id: '1', text: 'test-word' })];
      const onDelete = vi.fn();
      render(<VocabList items={items} onDelete={onDelete} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(items[0]);
    });

    it('does not render action buttons when handlers not provided', () => {
      const items = [createMockVocab()];
      render(<VocabList items={items} />);

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('passes compact prop to VocabCard components', () => {
      const items = [createMockVocab({ examples: ['Example sentence'] })];
      render(<VocabList items={items} compact />);

      // In compact mode, examples should not be visible
      expect(screen.queryByText('Example sentence')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loading spinner when loading is true', () => {
      render(<VocabList items={[]} loading />);

      expect(screen.getByTestId('vocab-list-loading')).toBeInTheDocument();
    });

    it('does not render items when loading', () => {
      const items = [createMockVocab({ text: 'test-word' })];
      render(<VocabList items={items} loading />);

      expect(screen.queryByText('test-word')).not.toBeInTheDocument();
    });

    it('does not render empty state when loading', () => {
      render(<VocabList items={[]} loading />);

      expect(screen.queryByTestId('vocab-list-empty')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const items = [createMockVocab({ examples: [] })]; // No examples to avoid nested list
      render(<VocabList items={items} className="custom-class" />);

      const list = screen.getByRole('list', { name: 'Vocabulary list' });
      expect(list).toHaveClass('custom-class');
    });

    it('applies custom className to empty state container', () => {
      render(<VocabList items={[]} className="custom-class" />);

      const emptyContainer = screen.getByTestId('vocab-list-empty');
      expect(emptyContainer).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('has accessible label on list', () => {
      const items = [createMockVocab({ examples: [] })]; // No examples to avoid nested list
      render(<VocabList items={items} />);

      const list = screen.getByRole('list', { name: 'Vocabulary list' });
      expect(list).toHaveAttribute('aria-label', 'Vocabulary list');
    });

    it('has accessible label on empty state', () => {
      render(<VocabList items={[]} />);

      const emptyState = screen.getByTestId('vocab-list-empty');
      expect(emptyState).toHaveAttribute('aria-label', 'Empty vocabulary list');
    });
  });
});
