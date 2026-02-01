import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { vocabStore } from '../stores/vocab.store';
import { uiStore } from '../stores/ui.store';
import type { Vocabulary } from '../types/vocabulary';

// Mock the stores
vi.mock('../stores/vocab.store', () => ({
  vocabStore: {
    items$: {
      get: vi.fn(),
    },
    init: vi.fn().mockResolvedValue(undefined),
    filter: vi.fn(),
  },
}));

vi.mock('../stores/ui.store', () => ({
  uiStore: {
    searchQuery$: {
      get: vi.fn(() => ''),
    },
    filters$: {
      get: vi.fn(() => ({ language: null, contentTypes: [], tags: [] })),
    },
    modalState$: {
      get: vi.fn(() => ({ isOpen: false, type: null, data: null })),
    },
    setSearchQuery: vi.fn(),
    clearSearchQuery: vi.fn(),
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    hasActiveFilters: vi.fn(() => false),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    isModalOpen: vi.fn(() => false),
    reset: vi.fn(),
  },
}));

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn((atom$) => {
    if (atom$ === vocabStore.items$) {
      return vocabStore.items$.get();
    }
    if (atom$ === uiStore.searchQuery$) {
      return uiStore.searchQuery$.get();
    }
    if (atom$ === uiStore.filters$) {
      return uiStore.filters$.get();
    }
    return null;
  }),
}));

describe('HomePage', () => {
  const mockVocabularies: Vocabulary[] = [
    {
      id: 'vocab_1',
      text: 'serendipity',
      description: 'A pleasant surprise',
      tags: ['positive'],
      language: 'en',
      contentType: 'vocabulary',
      definition: 'The occurrence of events by chance in a happy way',
      ipa: '/ˌserənˈdipədē/',
      examples: ['Finding that book was pure serendipity'],
      partOfSpeech: 'noun',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'vocab_2',
      text: 'ephemeral',
      description: 'Short-lived',
      tags: ['time'],
      language: 'en',
      contentType: 'vocabulary',
      definition: 'Lasting for a very short time',
      ipa: '/əˈfem(ə)rəl/',
      examples: ['The ephemeral beauty of cherry blossoms'],
      partOfSpeech: 'adjective',
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    },
  ];

  /**
   * Helper to render with Router context and wait for loading to complete.
   */
  const renderAndWait = async (): Promise<void> => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      );
    });
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('vocab-list-loading')).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vocabStore.items$.get).mockReturnValue(mockVocabularies);
    vi.mocked(vocabStore.filter).mockReturnValue(mockVocabularies);
    vi.mocked(vocabStore.init).mockResolvedValue(undefined);
    vi.mocked(uiStore.hasActiveFilters).mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page with PageLayout', async () => {
      await renderAndWait();
      
      // Should have the MyVocab title from PageLayout
      expect(screen.getByText('MyVocab')).toBeInTheDocument();
    });

    it('should render the search bar', async () => {
      await renderAndWait();
      
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render the filter panel', async () => {
      await renderAndWait();
      
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('should render the vocabulary list', async () => {
      await renderAndWait();
      
      expect(screen.getByRole('list', { name: 'Vocabulary list' })).toBeInTheDocument();
    });

    it('should render the add vocabulary button', async () => {
      await renderAndWait();
      
      // Get all buttons with "Add vocabulary" label (desktop and mobile)
      const addButtons = screen.getAllByRole('button', { name: /add vocabulary/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should display vocabulary items', async () => {
      await renderAndWait();
      
      expect(screen.getByText('serendipity')).toBeInTheDocument();
      expect(screen.getByText('ephemeral')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      // Make init take longer
      vi.mocked(vocabStore.init).mockImplementation(() => new Promise(() => {}));
      
      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/']}>
            <HomePage />
          </MemoryRouter>
        );
      });
      
      expect(screen.getByTestId('vocab-list-loading')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no vocabularies exist', async () => {
      vi.mocked(vocabStore.items$.get).mockReturnValue([]);
      vi.mocked(vocabStore.filter).mockReturnValue([]);
      
      await renderAndWait();
      
      expect(screen.getByTestId('vocab-list-empty')).toBeInTheDocument();
    });

    it('should show filter hint when filters are active but no results', async () => {
      vi.mocked(vocabStore.items$.get).mockReturnValue([]);
      vi.mocked(vocabStore.filter).mockReturnValue([]);
      vi.mocked(uiStore.hasActiveFilters).mockReturnValue(true);
      
      await renderAndWait();
      
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });

  describe('Add Vocabulary Button', () => {
    it('should open add vocabulary modal when clicked', async () => {
      await renderAndWait();
      
      // Get the first add button (desktop version)
      const addButtons = screen.getAllByRole('button', { name: /add vocabulary/i });
      const firstButton = addButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }
      
      expect(uiStore.openModal).toHaveBeenCalledWith('addVocab');
    });
  });

  describe('Filtering', () => {
    it('should filter vocabularies based on search query', async () => {
      vi.mocked(uiStore.searchQuery$.get).mockReturnValue('serendipity');
      const firstVocab = mockVocabularies[0];
      vi.mocked(vocabStore.filter).mockReturnValue(firstVocab ? [firstVocab] : []);
      
      await renderAndWait();
      
      expect(vocabStore.filter).toHaveBeenCalled();
    });

    it('should filter vocabularies based on filters', async () => {
      vi.mocked(uiStore.filters$.get).mockReturnValue({
        language: 'en',
        contentTypes: [],
        tags: [],
      });
      
      await renderAndWait();
      
      expect(vocabStore.filter).toHaveBeenCalled();
    });
  });

  describe('Page Layout', () => {
    it('should set home as the active page', async () => {
      await renderAndWait();
      
      // The home link should have aria-current="page" - get all and check first one
      const homeLinks = screen.getAllByRole('link', { name: /home/i });
      expect(homeLinks[0]).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      await renderAndWait();
      
      // Main app title
      expect(screen.getByRole('heading', { name: 'MyVocab' })).toBeInTheDocument();
    });

    it('should have accessible search input', async () => {
      await renderAndWait();
      
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('placeholder');
    });

    it('should have accessible filter controls', async () => {
      await renderAndWait();
      
      expect(screen.getByLabelText(/filter by language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by content type/i)).toBeInTheDocument();
    });
  });
});
