/**
 * Settings Store for MyVocab PWA
 *
 * Reactive state management for application settings using atomirx patterns.
 * Provides methods to manage GPT providers, theme, and language preferences
 * with automatic localStorage persistence via the settings storage service.
 *
 * Features:
 * - Reactive atom-based state (settings$)
 * - localStorage persistence with encrypted API keys
 * - Provider management (update, set active)
 * - Theme and language preference management
 *
 * @example
 * ```typescript
 * import { settingsStore } from './settings.store';
 * import { useAtomValue } from 'atomirx/react';
 *
 * // Initialize on app start
 * await settingsStore.init();
 *
 * // Update provider API key
 * await settingsStore.updateProvider('openai', { apiKey: 'sk-...' });
 *
 * // Set active provider
 * await settingsStore.setActiveProvider('gemini');
 *
 * // In React component
 * const settings = useAtomValue(settingsStore.settings$);
 * ```
 */

import { atom } from 'atomirx';
import type { AppSettings, Theme } from '../types/settings';
import { DEFAULT_APP_SETTINGS } from '../types/settings';
import type { GptProvider, GptProviderId } from '../types/gpt';
import {
  settingsStorageService,
  type SettingsStorageService,
} from '../services/settings-storage.service';

/**
 * Configuration options for the settings store.
 */
export interface SettingsStoreOptions {
  /** Optional storage service instance (for testing) */
  storage?: SettingsStorageService;
}

/**
 * Settings store interface type.
 */
export interface SettingsStore {
  /** Reactive atom containing application settings */
  settings$: ReturnType<typeof atom<AppSettings>>;

  /**
   * Initializes the store by loading settings from storage.
   * Safe to call multiple times - only loads once.
   *
   * @returns Promise resolving when initialization is complete
   */
  init: () => Promise<void>;

  /**
   * Updates a specific GPT provider's configuration.
   * Only updates the specified properties, preserving others.
   *
   * @param providerId - The ID of the provider to update
   * @param updates - Partial provider properties to update
   * @returns Promise resolving when update is persisted
   */
  updateProvider: (
    providerId: GptProviderId,
    updates: Partial<Omit<GptProvider, 'id' | 'name'>>
  ) => Promise<void>;

  /**
   * Sets the active GPT provider.
   *
   * @param providerId - The ID of the provider to set as active
   * @returns Promise resolving when change is persisted
   */
  setActiveProvider: (providerId: GptProviderId) => Promise<void>;

  /**
   * Sets the UI theme preference.
   *
   * @param theme - The theme to set ('light', 'dark', or 'system')
   * @returns Promise resolving when change is persisted
   */
  setTheme: (theme: Theme) => Promise<void>;

  /**
   * Sets the default language for new vocabulary entries.
   *
   * @param language - ISO 639-1 language code
   * @returns Promise resolving when change is persisted
   */
  setDefaultLanguage: (language: string) => Promise<void>;

  /**
   * Gets the currently active GPT provider.
   *
   * @returns The active provider or undefined if not found
   */
  getActiveProvider: () => GptProvider | undefined;

  /**
   * Gets a GPT provider by ID.
   *
   * @param providerId - The ID of the provider to get
   * @returns The provider or undefined if not found
   */
  getProviderById: (providerId: GptProviderId) => GptProvider | undefined;

  /**
   * Resets all settings to defaults and clears storage.
   *
   * @returns Promise resolving when reset is complete
   */
  reset: () => Promise<void>;
}

/**
 * Creates a settings store with reactive state and localStorage persistence.
 *
 * @param options - Optional configuration options
 * @returns Settings store instance
 */
export function createSettingsStore(
  options: SettingsStoreOptions = {}
): SettingsStore {
  const storage = options.storage ?? settingsStorageService();

  // Reactive atom for settings - initialize with defaults
  const settings$ = atom<AppSettings>({ ...DEFAULT_APP_SETTINGS }, {
    meta: { key: 'settings.app' },
  });

  // Track initialization state
  let initialized = false;

  /**
   * Initializes the store by loading settings from storage.
   */
  const init = async (): Promise<void> => {
    if (initialized) {
      return;
    }

    try {
      const storedSettings = await storage.getSettings();
      settings$.set(storedSettings);
    } catch {
      // Keep default settings on error
      // Error is already logged by storage service
    }

    initialized = true;
  };

  /**
   * Persists current settings to storage.
   */
  const persistSettings = async (): Promise<void> => {
    const currentSettings = settings$.get();
    await storage.saveSettings(currentSettings);
  };

  /**
   * Updates a specific GPT provider's configuration.
   */
  const updateProvider = async (
    providerId: GptProviderId,
    updates: Partial<Omit<GptProvider, 'id' | 'name'>>
  ): Promise<void> => {
    settings$.set((prev) => ({
      ...prev,
      providers: prev.providers.map((provider) =>
        provider.id === providerId ? { ...provider, ...updates } : provider
      ),
    }));

    await persistSettings();
  };

  /**
   * Sets the active GPT provider.
   */
  const setActiveProvider = async (providerId: GptProviderId): Promise<void> => {
    settings$.set((prev) => ({
      ...prev,
      activeProviderId: providerId,
    }));

    await persistSettings();
  };

  /**
   * Sets the UI theme preference.
   */
  const setTheme = async (theme: Theme): Promise<void> => {
    settings$.set((prev) => ({
      ...prev,
      theme,
    }));

    await persistSettings();
  };

  /**
   * Sets the default language for new vocabulary entries.
   */
  const setDefaultLanguage = async (language: string): Promise<void> => {
    settings$.set((prev) => ({
      ...prev,
      defaultLanguage: language,
    }));

    await persistSettings();
  };

  /**
   * Gets the currently active GPT provider.
   */
  const getActiveProvider = (): GptProvider | undefined => {
    const currentSettings = settings$.get();
    return currentSettings.providers.find(
      (p) => p.id === currentSettings.activeProviderId
    );
  };

  /**
   * Gets a GPT provider by ID.
   */
  const getProviderById = (providerId: GptProviderId): GptProvider | undefined => {
    return settings$.get().providers.find((p) => p.id === providerId);
  };

  /**
   * Resets all settings to defaults and clears storage.
   */
  const reset = async (): Promise<void> => {
    settings$.set({ ...DEFAULT_APP_SETTINGS });
    await storage.clearSettings();
  };

  return {
    settings$,
    init,
    updateProvider,
    setActiveProvider,
    setTheme,
    setDefaultLanguage,
    getActiveProvider,
    getProviderById,
    reset,
  };
}

/**
 * Default settings store instance.
 * Use this for the main application store.
 *
 * @example
 * ```typescript
 * import { settingsStore } from './settings.store';
 *
 * // Initialize on app start
 * await settingsStore.init();
 *
 * // Use throughout the app
 * const settings = settingsStore.settings$.get();
 * const activeProvider = settingsStore.getActiveProvider();
 * ```
 */
export const settingsStore = createSettingsStore();
