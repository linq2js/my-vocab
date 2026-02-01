import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VocabCard } from './VocabCard';
import type { Vocabulary } from '../../types/vocabulary';

// Mock the useSpeech hook
const mockSpeak = vi.fn();
const mockStop = vi.fn();
vi.mock('../../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: mockSpeak,
    stop: mockStop,
    isSpeaking: false,
    isSupported: true,
  }),
}));

/**
 * Creates a mock vocabulary entry for testing
 */
const createMockVocab = (overrides: Partial<Vocabulary> = {}): Vocabulary => ({
  id: 'test-id-123',
  text: 'serendipity',
  description: 'A happy accident',
  tags: ['positive', 'rare'],
  language: 'en',
  contentType: 'vocabulary',
  definition: 'The occurrence of events by chance in a happy way',
  ipa: '/ˌserənˈdɪpɪti/',
  examples: ['Finding that book was pure serendipity.', 'It was serendipity that we met.'],
  partOfSpeech: 'noun',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('VocabCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders vocabulary text', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('serendipity')).toBeInTheDocument();
    });

    it('renders definition when provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('The occurrence of events by chance in a happy way')).toBeInTheDocument();
    });

    it('renders IPA pronunciation when provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('/ˌserənˈdɪpɪti/')).toBeInTheDocument();
    });

    it('renders part of speech when provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('noun')).toBeInTheDocument();
    });

    it('renders examples when provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('Finding that book was pure serendipity.')).toBeInTheDocument();
      expect(screen.getByText('It was serendipity that we met.')).toBeInTheDocument();
    });

    it('renders tags when provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('positive')).toBeInTheDocument();
      expect(screen.getByText('rare')).toBeInTheDocument();
    });

    it('renders content type badge', () => {
      const vocab = createMockVocab({ contentType: 'idiom' });
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByText('idiom')).toBeInTheDocument();
    });

    it('does not render definition section when not provided', () => {
      const vocab = createMockVocab({ definition: undefined });
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByTestId('vocab-definition')).not.toBeInTheDocument();
    });

    it('does not render IPA section when not provided', () => {
      const vocab = createMockVocab({ ipa: undefined });
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByTestId('vocab-ipa')).not.toBeInTheDocument();
    });

    it('does not render examples section when not provided', () => {
      const vocab = createMockVocab({ examples: undefined });
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByTestId('vocab-examples')).not.toBeInTheDocument();
    });

    it('does not render examples section when empty array', () => {
      const vocab = createMockVocab({ examples: [] });
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByTestId('vocab-examples')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders edit button when onEdit is provided', () => {
      const vocab = createMockVocab();
      const onEdit = vi.fn();
      render(<VocabCard vocabulary={vocab} onEdit={onEdit} />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('renders delete button when onDelete is provided', () => {
      const vocab = createMockVocab();
      const onDelete = vi.fn();
      render(<VocabCard vocabulary={vocab} onDelete={onDelete} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onEdit with vocabulary when edit button is clicked', () => {
      const vocab = createMockVocab();
      const onEdit = vi.fn();
      render(<VocabCard vocabulary={vocab} onEdit={onEdit} />);

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(vocab);
    });

    it('calls onDelete with vocabulary when delete button is clicked', () => {
      const vocab = createMockVocab();
      const onDelete = vi.fn();
      render(<VocabCard vocabulary={vocab} onDelete={onDelete} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(vocab);
    });

    it('does not render edit button when onEdit is not provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('does not render delete button when onDelete is not provided', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('hides examples in compact mode', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} compact />);

      expect(screen.queryByTestId('vocab-examples')).not.toBeInTheDocument();
    });

    it('still shows text and definition in compact mode', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} compact />);

      expect(screen.getByText('serendipity')).toBeInTheDocument();
      expect(screen.getByText('The occurrence of events by chance in a happy way')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has article role', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has accessible name from vocabulary text', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Vocabulary: serendipity');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} className="custom-class" />);

      const article = screen.getByRole('article');
      expect(article).toHaveClass('custom-class');
    });
  });

  describe('speech', () => {
    it('renders speak button when speech is supported', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument();
    });

    it('calls speak with text and language when speak button is clicked', () => {
      const vocab = createMockVocab({ text: 'hello', language: 'en' });
      render(<VocabCard vocabulary={vocab} />);

      fireEvent.click(screen.getByRole('button', { name: /read aloud/i }));

      expect(mockSpeak).toHaveBeenCalledWith('hello', 'en');
    });

    it('renders speak button in both collapsed and expanded views', () => {
      const vocab = createMockVocab();
      render(<VocabCard vocabulary={vocab} />);

      // Collapsed view - should have speak button
      expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument();

      // Expand the card
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Expanded view - should still have speak button
      expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument();
    });
  });
});
