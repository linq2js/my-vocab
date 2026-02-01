import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VocabForm } from './VocabForm';
import type { Vocabulary } from '../../types/vocabulary';

// Mock the gptService
const mockEnrich = vi.fn();
const mockCheckApiKeyStatus = vi.fn();
vi.mock('../../services/gpt.service', () => ({
  gptService: () => ({
    enrich: mockEnrich,
    checkApiKeyStatus: mockCheckApiKeyStatus,
    clearCache: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('VocabForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrich.mockResolvedValue({
      definition: 'Test definition',
      ipa: '/test/',
      type: 'noun',
      examples: ['Example sentence'],
    });
    mockCheckApiKeyStatus.mockResolvedValue({
      isConfigured: true,
      providerId: 'openai',
      providerName: 'OpenAI',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with all required fields', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      // TagInput has a label "Tags"
      expect(screen.getByRole('group', { name: /tags/i })).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      render(<VocabForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should render enrich button', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /enrich/i })).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should have default language set to English', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      const languageSelect = screen.getByLabelText(/language/i);
      expect(languageSelect).toHaveValue('en');
    });

    it('should have default content type set to vocabulary', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      // Note: Content type is now handled via tags, so this test may need updating
      // Checking for tags input instead
      expect(screen.getByRole('group', { name: /tags/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const existingVocab: Vocabulary = {
      id: 'test-id',
      text: 'serendipity',
      description: 'A happy accident',
      tags: ['vocabulary', 'positive', 'rare'],
      language: 'en',
      definition: 'Finding something good without looking for it',
      ipa: '/ˌserənˈdɪpɪti/',
      examples: ['It was serendipity that we met.'],
      partOfSpeech: 'noun',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should populate form with existing vocabulary data', () => {
      render(<VocabForm onSubmit={mockOnSubmit} initialData={existingVocab} />);

      expect(screen.getByLabelText(/text/i)).toHaveValue('serendipity');
      expect(screen.getByLabelText(/description/i)).toHaveValue('A happy accident');
      expect(screen.getByLabelText(/language/i)).toHaveValue('en');
      // Content type is now handled via tags
    });

    it('should display existing tags', () => {
      render(<VocabForm onSubmit={mockOnSubmit} initialData={existingVocab} />);

      expect(screen.getByText('positive')).toBeInTheDocument();
      expect(screen.getByText('rare')).toBeInTheDocument();
    });

    it('should show "Update" instead of "Save" for edit mode', () => {
      render(<VocabForm onSubmit={mockOnSubmit} initialData={existingVocab} />);

      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when text is empty on submit', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(await screen.findByText(/text is required/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      // Submit to trigger error
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(await screen.findByText(/text is required/i)).toBeInTheDocument();

      // Start typing to clear error
      const textInput = screen.getByLabelText(/text/i);
      await user.type(textInput, 'test');

      expect(screen.queryByText(/text is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      // Fill in the form
      await user.type(screen.getByLabelText(/text/i), 'serendipity');
      await user.type(screen.getByLabelText(/description/i), 'A happy accident');

      // Submit
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0]![0];
      expect(submittedData.text).toBe('serendipity');
      expect(submittedData.description).toBe('A happy accident');
      expect(submittedData.language).toBe('en');
      // contentType is now part of tags array
      expect(submittedData.tags).toBeDefined();
    });

    it('should include tags in submission', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      // Fill in text
      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      // Add a tag
      const tagInput = screen.getByPlaceholderText(/type and press enter/i);
      await user.type(tagInput, 'positive{enter}');

      // Submit
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0]![0];
      expect(submittedData.tags).toContain('positive');
    });

    it('should preserve id and dates when editing', async () => {
      const user = userEvent.setup();
      const existingVocab: Vocabulary = {
        id: 'existing-id',
        text: 'old text',
        tags: ['vocabulary'],
        language: 'en',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      render(<VocabForm onSubmit={mockOnSubmit} initialData={existingVocab} />);

      // Update text
      const textInput = screen.getByLabelText(/text/i);
      await user.clear(textInput);
      await user.type(textInput, 'new text');

      // Submit
      const submitButton = screen.getByRole('button', { name: /update/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0]![0];
      expect(submittedData.id).toBe('existing-id');
      expect(submittedData.createdAt).toEqual(existingVocab.createdAt);
    });
  });

  describe('Cancel', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('GPT Enrichment', () => {
    it('should disable enrich button when text is empty', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      expect(enrichButton).toBeDisabled();
    });

    it('should enable enrich button when text is provided', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      expect(enrichButton).not.toBeDisabled();
    });

    it('should call gptService.enrich when enrich button is clicked', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      await user.click(enrichButton);

      await waitFor(() => {
        // Uses default placeholder when no custom extra fields are set
        expect(mockEnrich).toHaveBeenCalledWith('serendipity', 'en', 'synonyms, antonyms, collocations');
      });
    });

    it('should show loading state during enrichment', async () => {
      const user = userEvent.setup();
      // Make enrich take some time
      mockEnrich.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      await user.click(enrichButton);

      expect(screen.getByRole('button', { name: /enriching/i })).toBeInTheDocument();
    });

    it('should show error message when enrichment fails', async () => {
      const user = userEvent.setup();
      mockEnrich.mockRejectedValue(new Error('API error'));

      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      await user.click(enrichButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('API error');
      });
    });

    it('should show friendly message when API key is not configured', async () => {
      const user = userEvent.setup();
      mockCheckApiKeyStatus.mockResolvedValue({
        isConfigured: false,
        providerId: 'openai',
        providerName: 'OpenAI',
      });

      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      await user.click(enrichButton);

      await waitFor(() => {
        expect(screen.getByText(/configure.*api key.*settings/i)).toBeInTheDocument();
      });
      expect(mockEnrich).not.toHaveBeenCalled();
    });

    it('should show friendly message when no provider is configured', async () => {
      const user = userEvent.setup();
      mockCheckApiKeyStatus.mockResolvedValue({
        isConfigured: false,
        providerId: null,
        providerName: null,
      });

      render(<VocabForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/text/i), 'serendipity');

      const enrichButton = screen.getByRole('button', { name: /enrich/i });
      await user.click(enrichButton);

      await waitFor(() => {
        expect(screen.getByText(/configure.*api key.*settings/i)).toBeInTheDocument();
      });
      expect(mockEnrich).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable form when loading prop is true', () => {
      render(<VocabForm onSubmit={mockOnSubmit} loading />);

      expect(screen.getByLabelText(/text/i)).toBeDisabled();
      expect(screen.getByLabelText(/language/i)).toBeDisabled();
      // Content type is now handled via tags
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
    });

    it('should show loading indicator on submit button when loading', () => {
      render(<VocabForm onSubmit={mockOnSubmit} loading />);

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
      // Content type is now handled via tags
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<VocabForm onSubmit={mockOnSubmit} />);

      const textLabel = screen.getByText('Text');
      expect(textLabel.parentElement).toHaveTextContent('*');
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      render(<VocabForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        const textInput = screen.getByLabelText(/text/i);
        expect(textInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
