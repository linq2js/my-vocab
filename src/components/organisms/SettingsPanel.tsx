import { useState } from 'react';
import { ApiKeyInput, type TestResult } from '../molecules/ApiKeyInput';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import type { AppSettings } from '../../types/settings';
import type { GptProviderId } from '../../types/gpt';

/**
 * Test results map for each provider
 */
export type ProviderTestResults = Record<GptProviderId, TestResult>;

/**
 * Props for the SettingsPanel component
 */
export interface SettingsPanelProps {
  /** Current application settings */
  settings: AppSettings;
  /** Callback when an API key is changed */
  onApiKeyChange: (providerId: GptProviderId, apiKey: string) => void;
  /** Callback when the active provider is changed */
  onProviderSelect: (providerId: GptProviderId) => void;
  /** Optional callback to test an API key */
  onTestApiKey?: (providerId: GptProviderId) => void;
  /** Provider currently being tested */
  testingProvider?: GptProviderId | null;
  /** Test results for each provider */
  testResults?: ProviderTestResults;
  /** Whether the panel is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Provider configuration for display
 */
interface ProviderConfig {
  id: GptProviderId;
  name: string;
  description: string;
  placeholder: string;
  helperText: string;
}

/**
 * Provider configurations for the settings panel
 */
const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5 models',
    placeholder: 'sk-...',
    helperText: 'Enter your OpenAI API key (starts with sk-)',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google AI Studio models',
    placeholder: 'AIza...',
    helperText: 'Enter your Gemini API key from Google AI Studio',
  },
];

/**
 * SettingsPanel organism component for managing API keys and provider selection.
 *
 * Features:
 * - API key inputs for OpenAI and Gemini providers
 * - Provider selection with radio buttons
 * - Optional API key testing functionality
 * - Loading and result states for API key validation
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Basic usage with settingsStore
 * const settings = useAtomValue(settingsStore.settings$);
 *
 * <SettingsPanel
 *   settings={settings}
 *   onApiKeyChange={(providerId, apiKey) =>
 *     settingsStore.updateProvider(providerId, { apiKey })
 *   }
 *   onProviderSelect={(providerId) =>
 *     settingsStore.setActiveProvider(providerId)
 *   }
 * />
 *
 * // With API key testing
 * <SettingsPanel
 *   settings={settings}
 *   onApiKeyChange={handleApiKeyChange}
 *   onProviderSelect={handleProviderSelect}
 *   onTestApiKey={handleTestApiKey}
 *   testingProvider={testingProvider}
 *   testResults={testResults}
 * />
 * ```
 */
export const SettingsPanel = ({
  settings,
  onApiKeyChange,
  onProviderSelect,
  onTestApiKey,
  testingProvider = null,
  testResults = { openai: null, gemini: null },
  disabled = false,
  className = '',
}: SettingsPanelProps) => {
  // Track which providers are expanded (default: active provider is expanded)
  const [expandedProviders, setExpandedProviders] = useState<Set<GptProviderId>>(
    new Set([settings.activeProviderId])
  );

  /**
   * Get the API key for a provider from settings
   */
  const getApiKey = (providerId: GptProviderId): string => {
    const provider = settings.providers.find((p) => p.id === providerId);
    return provider?.apiKey ?? '';
  };

  /**
   * Toggle provider section expansion
   */
  const toggleExpanded = (providerId: GptProviderId) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  /**
   * Handle API key change for a provider
   */
  const handleApiKeyChange = (providerId: GptProviderId) => (value: string) => {
    onApiKeyChange(providerId, value);
  };

  /**
   * Handle test button click for a provider
   */
  const handleTestApiKey = (providerId: GptProviderId) => () => {
    onTestApiKey?.(providerId);
  };

  /**
   * Handle set active button click
   */
  const handleSetActive = (providerId: GptProviderId) => () => {
    onProviderSelect(providerId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Providers
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure your AI provider for vocabulary enrichment
        </p>
      </div>

      {/* Provider Sections */}
      {PROVIDER_CONFIGS.map((config) => {
        const isActive = settings.activeProviderId === config.id;
        const isExpanded = expandedProviders.has(config.id);
        const hasApiKey = Boolean(getApiKey(config.id));
        const testResult = testResults[config.id];

        return (
          <div
            key={config.id}
            className={`
              rounded-lg border-2 overflow-hidden transition-all duration-200
              ${isActive 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }
            `}
          >
            {/* Provider Header - Clickable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleExpanded(config.id)}
              disabled={disabled}
              className={`
                w-full flex items-center justify-between p-4
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                transition-colors duration-200
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-expanded={isExpanded}
              aria-controls={`provider-${config.id}-content`}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                  size="sm" 
                  className="text-gray-400"
                />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {config.name}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                        Active
                      </span>
                    )}
                    {!hasApiKey && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full">
                        No key
                      </span>
                    )}
                    {hasApiKey && testResult === 'success' && (
                      <Icon name="check" size="sm" className="text-green-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {config.description}
                  </span>
                </div>
              </div>
            </button>

            {/* Provider Content - Collapsible */}
            {isExpanded && (
              <div 
                id={`provider-${config.id}-content`}
                className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700"
              >
                {/* API Key Input */}
                <ApiKeyInput
                  label="API Key"
                  value={getApiKey(config.id)}
                  onChange={handleApiKeyChange(config.id)}
                  placeholder={config.placeholder}
                  helperText={config.helperText}
                  disabled={disabled}
                  onTest={onTestApiKey ? handleTestApiKey(config.id) : undefined}
                  testing={testingProvider === config.id}
                  testResult={testResult}
                />

                {/* Action Button */}
                <div className="mt-4 flex justify-end">
                  {isActive ? (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Icon name="check" size="sm" />
                      Currently active provider
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSetActive(config.id)}
                      disabled={disabled || !hasApiKey}
                    >
                      Set as Active
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
