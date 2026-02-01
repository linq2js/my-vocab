import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddVocabPage } from './AddVocabPage';
import { vocabStore } from '../stores/vocab.store';

// Mock the stores
vi.mock('../stores/vocab.store', () => ({
  vocabStore: {
    items$: {
      get: vi.fn(() => []),
    },
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn(() => []),
}));

// Mock the gpt service
vi.mock('../services/gpt.service', () => ({
  gptService: vi.fn(() => ({
    enrich: vi.fn().mockResolvedValue({
      definition: 'Test definition',
      ipa: '/test/',
      type: 'noun',
      examples: ['Example 1'],
    }),
  })),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Helper to render AddVocabPage with Router context.
 */
const renderWithRouter = () => {
  return render(
    <MemoryRouter initialEntries={['/add']}>
      <AddVocabPage />
    </MemoryRouter>
  );
};

describe('AddVocabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page with PageLayout', () => {
      renderWithRouter();
      
      // Should have the MyVocab title from PageLayout
      expect(screen.getByText('MyVocab')).toBeInTheDocument();
    });

    it('should render the page title', () => {
      renderWithRouter();
      
      expect(screen.getByRole('heading', { name: /add vocabulary/i })).toBeInTheDocument();
    });

    it('should render the VocabForm', () => {
      renderWithRouter();
      
      // Form should have text input
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    });

    it('should render the back to home link', () => {
      renderWithRouter();
      
      expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
    });

    it('should set add as the active page', () => {
      renderWithRouter();
      
      // The add link should have aria-current="page" - get all and check first one
      const addLinks = screen.getAllByRole('link', { name: /add/i });
      expect(addLinks[0]).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Navigation', () => {
    it('should navigate home when back button is clicked', () => {
      renderWithRouter();
      
      const backButton = screen.getByRole('button', { name: /back to home/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate home when cancel button is clicked', () => {
      renderWithRouter();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Form Submission', () => {
    it('should add vocabulary and navigate home on successful submit', async () => {
      renderWithRouter();
      
      // Fill in the required text field
      const textInput = screen.getByLabelText(/text/i);
      fireEvent.change(textInput, { target: { value: 'serendipity' } });
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(vocabStore.add).toHaveBeenCalledTimes(1);
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should pass form data to vocabStore.add', async () => {
      renderWithRouter();
      
      // Fill in the text field
      const textInput = screen.getByLabelText(/text/i);
      fireEvent.change(textInput, { target: { value: 'serendipity' } });
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(vocabStore.add).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'serendipity',
            language: expect.any(String),
            contentType: expect.any(String),
            tags: expect.any(Array),
          })
        );
      });
    });

    it('should not submit if text field is empty', async () => {
      renderWithRouter();
      
      // Submit without filling text
      const submitButton = screen.getByRole('button', { name: /save/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Should not call add
      expect(vocabStore.add).not.toHaveBeenCalled();
      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while saving', async () => {
      // Make add take longer
      vi.mocked(vocabStore.add).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      renderWithRouter();
      
      // Fill in the text field
      const textInput = screen.getByLabelText(/text/i);
      fireEvent.change(textInput, { target: { value: 'test' } });
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save/i });
      
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Should show saving state
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithRouter();
      
      // Main app title
      expect(screen.getByRole('heading', { name: 'MyVocab' })).toBeInTheDocument();
      // Page title
      expect(screen.getByRole('heading', { name: /add vocabulary/i })).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      renderWithRouter();
      
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content type/i)).toBeInTheDocument();
    });

    it('should have accessible navigation button', () => {
      renderWithRouter();
      
      const backButton = screen.getByRole('button', { name: /back to home/i });
      expect(backButton).toBeInTheDocument();
    });
  });
});
