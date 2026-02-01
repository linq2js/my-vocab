import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { settingsStore } from '../stores/settings.store';
import type { AppSettings } from '../types/settings';
import type { GptProviderId } from '../types/gpt';

// Mock the settings store
vi.mock('../stores/settings.store', () => ({
  settingsStore: {
    settings$: {
      get: vi.fn(),
    },
    init: vi.fn().mockResolvedValue(undefined),
    updateProvider: vi.fn().mockResolvedValue(undefined),
    setActiveProvider: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn((atom$) => {
    if (atom$ === settingsStore.settings$) {
      return settingsStore.settings$.get();
    }
    return null;
  }),
}));

describe('SettingsPage', () => {
  const mockSettings: AppSettings = {
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'sk-test-key-123',
        isActive: true,
      },
      {
        id: 'gemini',
        name: 'Gemini',
        apiKey: '',
        isActive: false,
      },
    ],
    activeProviderId: 'openai',
    theme: 'system',
    defaultLanguage: 'en',
  };

  /**
   * Helper to render with Router context and wait for loading to complete.
   */
  const renderAndWait = async (): Promise<void> => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <SettingsPage />
        </MemoryRouter>
      );
    });
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('settings-loading')).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsStore.settings$.get).mockReturnValue(mockSettings);
    vi.mocked(settingsStore.init).mockResolvedValue(undefined);
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

    it('should render the page title', async () => {
      await renderAndWait();
      
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });

    it('should render the SettingsPanel', async () => {
      await renderAndWait();
      
      expect(screen.getByText('API Settings')).toBeInTheDocument();
    });

    it('should render API key inputs for both providers', async () => {
      await renderAndWait();
      
      expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
    });

    it('should render provider selection radio buttons', async () => {
      await renderAndWait();
      
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'OpenAI' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Gemini' })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      // Make init take longer
      vi.mocked(settingsStore.init).mockImplementation(() => new Promise(() => {}));
      
      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/settings']}>
            <SettingsPage />
          </MemoryRouter>
        );
      });
      
      expect(screen.getByTestId('settings-loading')).toBeInTheDocument();
    });
  });

  describe('API Key Management', () => {
    it('should call updateProvider when API key is changed', async () => {
      await renderAndWait();
      
      const openaiInput = screen.getByLabelText(/openai api key/i);
      fireEvent.change(openaiInput, { target: { value: 'sk-new-key' } });
      
      await waitFor(() => {
        expect(settingsStore.updateProvider).toHaveBeenCalledWith('openai', { apiKey: 'sk-new-key' });
      });
    });

    it('should display existing API keys', async () => {
      await renderAndWait();
      
      const openaiInput = screen.getByLabelText(/openai api key/i);
      expect(openaiInput).toHaveValue('sk-test-key-123');
    });
  });

  describe('Provider Selection', () => {
    it('should have OpenAI selected as active provider', async () => {
      await renderAndWait();
      
      const openaiRadio = screen.getByRole('radio', { name: 'OpenAI' });
      expect(openaiRadio).toBeChecked();
    });

    it('should call setActiveProvider when provider is changed', async () => {
      await renderAndWait();
      
      const geminiRadio = screen.getByRole('radio', { name: 'Gemini' });
      fireEvent.click(geminiRadio);
      
      await waitFor(() => {
        expect(settingsStore.setActiveProvider).toHaveBeenCalledWith('gemini');
      });
    });
  });

  describe('Page Layout', () => {
    it('should set settings as the active page', async () => {
      await renderAndWait();
      
      // The settings link should have aria-current="page"
      const settingsLinks = screen.getAllByRole('link', { name: /settings/i });
      expect(settingsLinks[0]).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      await renderAndWait();
      
      // Main app title
      expect(screen.getByRole('heading', { name: 'MyVocab' })).toBeInTheDocument();
      // Page title
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      // Section title
      expect(screen.getByRole('heading', { name: 'API Settings' })).toBeInTheDocument();
    });

    it('should have accessible form controls', async () => {
      await renderAndWait();
      
      // API key inputs should have labels
      expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
      
      // Radio group should have accessible name
      expect(screen.getByRole('radiogroup')).toHaveAccessibleName(/active provider/i);
    });
  });
});
