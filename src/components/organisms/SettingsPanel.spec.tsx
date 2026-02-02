import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import type { AppSettings } from '../../types/settings';

// Mock settings for testing
const mockSettings: AppSettings = {
  providers: [
    { id: 'openai', name: 'OpenAI', apiKey: 'sk-test-key', isActive: true },
    { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
  ],
  activeProviderId: 'openai',
  theme: 'system',
  defaultLanguage: 'en',
  extraEnrichment: {},
  lastUsedLanguage: 'en',
  lastUsedCategories: [],
  lastUsedExtraEnrichment: {},
  nativeLanguage: 'en',
  translationStyles: [],
};

describe('SettingsPanel', () => {
  const mockOnApiKeyChange = vi.fn();
  const mockOnProviderSelect = vi.fn();
  const mockOnTestApiKey = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings panel with title', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(screen.getByText('API Settings')).toBeInTheDocument();
  });

  it('renders API key inputs for both providers', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument();
  });

  it('displays existing API key values', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    const openaiInput = screen.getByLabelText(/OpenAI API Key/i) as HTMLInputElement;
    expect(openaiInput.value).toBe('sk-test-key');
  });

  it('calls onApiKeyChange when API key is modified', async () => {
    const user = userEvent.setup();

    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    const geminiInput = screen.getByLabelText(/Gemini API Key/i);
    await user.type(geminiInput, 'new-gemini-key');

    expect(mockOnApiKeyChange).toHaveBeenCalledWith('gemini', expect.any(String));
  });

  it('renders provider selection radio buttons', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(screen.getByRole('radio', { name: /OpenAI/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Gemini/i })).toBeInTheDocument();
  });

  it('shows the active provider as selected', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    const openaiRadio = screen.getByRole('radio', { name: /OpenAI/i }) as HTMLInputElement;
    const geminiRadio = screen.getByRole('radio', { name: /Gemini/i }) as HTMLInputElement;

    expect(openaiRadio.checked).toBe(true);
    expect(geminiRadio.checked).toBe(false);
  });

  it('calls onProviderSelect when provider selection changes', async () => {
    const user = userEvent.setup();

    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    const geminiRadio = screen.getByRole('radio', { name: /Gemini/i });
    await user.click(geminiRadio);

    expect(mockOnProviderSelect).toHaveBeenCalledWith('gemini');
  });

  it('renders test buttons when onTestApiKey is provided', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        onTestApiKey={mockOnTestApiKey}
      />
    );

    const testButtons = screen.getAllByRole('button', { name: /Test/i });
    expect(testButtons.length).toBeGreaterThan(0);
  });

  it('calls onTestApiKey when test button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        onTestApiKey={mockOnTestApiKey}
      />
    );

    // Find the test button for OpenAI (which has an API key)
    const testButtons = screen.getAllByRole('button', { name: /Test/i });
    await user.click(testButtons[0]!);

    expect(mockOnTestApiKey).toHaveBeenCalledWith('openai');
  });

  it('shows loading state when testing a provider', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        onTestApiKey={mockOnTestApiKey}
        testingProvider="openai"
      />
    );

    expect(screen.getByText(/Testing.../i)).toBeInTheDocument();
  });

  it('shows test result for providers', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        testResults={{ openai: 'success', gemini: null }}
      />
    );

    expect(screen.getByText(/API key is valid/i)).toBeInTheDocument();
  });

  it('shows error test result', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        testResults={{ openai: 'error', gemini: null }}
      />
    );

    expect(screen.getByText(/API key is invalid/i)).toBeInTheDocument();
  });

  it('disables provider selection when disabled prop is true', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        disabled
      />
    );

    const openaiRadio = screen.getByRole('radio', { name: /OpenAI/i }) as HTMLInputElement;
    const geminiRadio = screen.getByRole('radio', { name: /Gemini/i }) as HTMLInputElement;

    expect(openaiRadio.disabled).toBe(true);
    expect(geminiRadio.disabled).toBe(true);
  });

  it('applies custom className', () => {
    const { container } = render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows helper text for API key inputs', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(screen.getByText(/Enter your OpenAI API key/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter your Gemini API key/i)).toBeInTheDocument();
  });

  it('indicates which provider is active in the selection', () => {
    render(
      <SettingsPanel
        settings={mockSettings}
        onApiKeyChange={mockOnApiKeyChange}
        onProviderSelect={mockOnProviderSelect}
      />
    );

    // The active provider section should exist
    expect(screen.getByText(/Active Provider/i)).toBeInTheDocument();
  });
});
