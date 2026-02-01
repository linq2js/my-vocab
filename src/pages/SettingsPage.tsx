/**
 * SettingsPage component for MyVocab.
 *
 * Settings page for managing API keys and provider selection.
 * Integrates with settingsStore for persistent settings management.
 *
 * Features:
 * - API key management for OpenAI and Gemini providers
 * - Active provider selection
 * - API key testing functionality
 * - Loading state handling
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * // Basic usage in router
 * <Route path="/settings" element={<SettingsPage />} />
 *
 * // Or direct render
 * <SettingsPage />
 * ```
 */

import React, { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "atomirx/react";
import { PageLayout } from "../components/templates/PageLayout";
import {
  SettingsPanel,
  type ProviderTestResults,
} from "../components/organisms/SettingsPanel";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { settingsStore } from "../stores/settings.store";
import { vocabStore } from "../stores/vocab.store";
import { useNetworkStatus, isNetworkError } from "../hooks";
import type { GptProviderId } from "../types/gpt";

/**
 * SettingsPage component - API key and provider management.
 *
 * @returns The SettingsPage component
 */
export const SettingsPage = (): React.ReactElement => {
  // Get reactive state from settings store
  const settings = useSelector(settingsStore.settings$);

  // Get vocabulary count for display
  const vocabularies = useSelector(vocabStore.items$);
  const vocabCount = vocabularies.length;

  // API key testing state
  const [testingProvider, setTestingProvider] = useState<GptProviderId | null>(
    null
  );
  const [testResults, setTestResults] = useState<ProviderTestResults>({
    openai: null,
    gemini: null,
  });

  // Data clearing state
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize stores on mount (fire and forget - UI shows defaults immediately)
  useEffect(() => {
    settingsStore.init().catch(console.error);
    vocabStore.init().catch(console.error);
  }, []);

  /**
   * Handle API key change for a provider.
   * Updates the settings store with the new API key.
   *
   * @param providerId - The provider to update
   * @param apiKey - The new API key value
   */
  const handleApiKeyChange = useCallback(
    async (providerId: GptProviderId, apiKey: string): Promise<void> => {
      // Clear test result when key changes
      setTestResults((prev) => ({
        ...prev,
        [providerId]: null,
      }));

      await settingsStore.updateProvider(providerId, { apiKey });
    },
    []
  );

  /**
   * Handle provider selection change.
   * Sets the active provider in the settings store.
   *
   * @param providerId - The provider to set as active
   */
  const handleProviderSelect = useCallback(
    async (providerId: GptProviderId): Promise<void> => {
      await settingsStore.setActiveProvider(providerId);
    },
    []
  );

  /**
   * Tests OpenAI API key by calling the models endpoint.
   *
   * @param apiKey - The API key to test
   * @returns Promise resolving to success/error result
   */
  const testOpenAIKey = async (
    apiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: "API key is valid" };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string } })?.error?.message ||
      `HTTP ${response.status}: ${response.statusText}`;
    return { success: false, message: errorMessage };
  };

  /**
   * Tests Gemini API key by calling the models endpoint.
   *
   * @param apiKey - The API key to test
   * @returns Promise resolving to success/error result
   */
  const testGeminiKey = async (
    apiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET" }
    );

    if (response.ok) {
      return { success: true, message: "API key is valid" };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string } })?.error?.message ||
      `HTTP ${response.status}: ${response.statusText}`;
    return { success: false, message: errorMessage };
  };

  // Network status for offline detection
  const { isOffline } = useNetworkStatus();

  // Error message state for displaying network errors
  const [testError, setTestError] = useState<string | null>(null);

  /**
   * Handle API key test request.
   * Tests the API key for the specified provider by making a real API call.
   * Handles offline scenarios gracefully.
   *
   * @param providerId - The provider to test
   */
  const handleTestApiKey = useCallback(
    async (providerId: GptProviderId): Promise<void> => {
      // Clear previous error
      setTestError(null);

      // Check offline status first
      if (isOffline) {
        setTestError("You are offline. Please connect to test your API key.");
        return;
      }

      setTestingProvider(providerId);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: null,
      }));

      try {
        const provider = settings.providers.find((p) => p.id === providerId);
        if (!provider?.apiKey) {
          setTestResults((prev) => ({
            ...prev,
            [providerId]: "error",
          }));
          return;
        }

        // Test the API key with the actual provider
        let result: { success: boolean; message: string };

        if (providerId === "openai") {
          result = await testOpenAIKey(provider.apiKey);
        } else if (providerId === "gemini") {
          result = await testGeminiKey(provider.apiKey);
        } else {
          result = { success: false, message: "Unknown provider" };
        }

        // Convert to TestResult type ('success' | 'error' | null)
        setTestResults((prev) => ({
          ...prev,
          [providerId]: result.success ? "success" : "error",
        }));
      } catch (error) {
        // Handle network errors gracefully
        if (isNetworkError(error)) {
          setTestError(
            "Unable to connect. Please check your internet connection."
          );
        } else {
          setTestError("Test failed. Please try again.");
        }
        setTestResults((prev) => ({
          ...prev,
          [providerId]: "error",
        }));
      } finally {
        setTestingProvider(null);
      }
    },
    [settings.providers, isOffline]
  );

  /**
   * Handle clear all vocabulary data.
   * This clears all vocabulary items but keeps settings and API keys.
   */
  const handleClearData = useCallback(async (): Promise<void> => {
    setIsClearing(true);
    try {
      await vocabStore.clear();
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Failed to clear data:", error);
    } finally {
      setIsClearing(false);
    }
  }, []);

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to home"
          >
            <Icon name="chevron-left" size="md" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
        </div>

        {/* Network Error Message */}
        {testError && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            role="alert"
          >
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Icon name="warning" size="sm" />
              <span className="text-sm">{testError}</span>
            </div>
          </div>
        )}

        {/* Settings Panel - renders immediately with default values */}
        <SettingsPanel
          settings={settings}
          onApiKeyChange={handleApiKeyChange}
          onProviderSelect={handleProviderSelect}
          onTestApiKey={isOffline ? undefined : handleTestApiKey}
          testingProvider={testingProvider}
          testResults={testResults}
        />

        {/* Data Management Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Data Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Manage your vocabulary data. API keys and settings are stored
            separately.
          </p>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Vocabulary Data
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {vocabCount} {vocabCount === 1 ? "item" : "items"}{" "}
                  (vocabularies, idioms, phrasal verbs, quotes)
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={vocabCount === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <Icon name="trash" size="sm" className="mr-2" />
                Clear Data
              </Button>
            </div>
          </div>

          {/* Storage Info */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            <Icon name="info" size="sm" className="inline mr-1" />
            Your API keys and settings are stored separately and will not be
            affected.
          </p>
        </div>

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Icon
                    name="warning"
                    size="md"
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Clear All Vocabulary Data?
                </h3>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 mb-4 ml-4 list-disc">
                <li>All vocabularies</li>
                <li>All idioms</li>
                <li>All phrasal verbs</li>
                <li>All quotes</li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Your API keys and settings will be preserved.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleClearData}
                  loading={isClearing}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                >
                  {isClearing ? "Clearing..." : "Clear All Data"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
