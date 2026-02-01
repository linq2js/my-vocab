/**
 * Settings Store Tests
 *
 * Tests for the settings store using atomirx patterns.
 * Verifies reactive state management and localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AppSettings } from '../types/settings';
import { DEFAULT_APP_SETTINGS } from '../types/settings';
import type { GptProviderId } from '../types/gpt';
import type { SettingsStore } from './settings.store';

// Hoist mock functions so they're available before module imports
const { mockGetSettings, mockSaveSettings, mockClearSettings, mockHasSettings } =
  vi.hoisted(() => ({
    mockGetSettings: vi.fn<() => Promise<AppSettings>>(),
    mockSaveSettings: vi.fn<(settings: AppSettings) => Promise<void>>(),
    mockClearSettings: vi.fn<() => Promise<void>>(),
    mockHasSettings: vi.fn<() => boolean>(),
  }));

vi.mock('../services/settings-storage.service', () => ({
  settingsStorageService: () => ({
    getSettings: mockGetSettings,
    saveSettings: mockSaveSettings,
    clearSettings: mockClearSettings,
    hasSettings: mockHasSettings,
  }),
}));

// Import after mock setup
import { createSettingsStore, settingsStore } from './settings.store';

describe('Settings Store', () => {
  let store: SettingsStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({ ...DEFAULT_APP_SETTINGS });
    mockSaveSettings.mockResolvedValue(undefined);
    mockClearSettings.mockResolvedValue(undefined);
    mockHasSettings.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSettingsStore', () => {
    it('should create a store with default settings', () => {
      store = createSettingsStore();

      expect(store.settings$).toBeDefined();
      expect(store.init).toBeDefined();
      expect(store.updateProvider).toBeDefined();
      expect(store.setActiveProvider).toBeDefined();
      expect(store.setTheme).toBeDefined();
      expect(store.setDefaultLanguage).toBeDefined();
    });

    it('should initialize with default settings in atom', () => {
      store = createSettingsStore();
      const settings = store.settings$.get();

      expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe('init', () => {
    it('should load settings from storage on init', async () => {
      const storedSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
        defaultLanguage: 'fr',
      };
      mockGetSettings.mockResolvedValue(storedSettings);

      store = createSettingsStore();
      await store.init();

      expect(mockGetSettings).toHaveBeenCalledTimes(1);
      expect(store.settings$.get()).toEqual(storedSettings);
    });

    it('should only initialize once', async () => {
      store = createSettingsStore();

      await store.init();
      await store.init();
      await store.init();

      expect(mockGetSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle storage errors gracefully', async () => {
      mockGetSettings.mockRejectedValue(new Error('Storage error'));

      store = createSettingsStore();
      await store.init();

      // Should keep default settings on error
      expect(store.settings$.get()).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe('updateProvider', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should update provider API key', async () => {
      await store.updateProvider('openai', { apiKey: 'sk-test-key' });

      const settings = store.settings$.get();
      const openaiProvider = settings.providers.find((p) => p.id === 'openai');

      expect(openaiProvider?.apiKey).toBe('sk-test-key');
      expect(mockSaveSettings).toHaveBeenCalledTimes(1);
    });

    it('should update provider isActive status', async () => {
      await store.updateProvider('openai', { isActive: true });

      const settings = store.settings$.get();
      const openaiProvider = settings.providers.find((p) => p.id === 'openai');

      expect(openaiProvider?.isActive).toBe(true);
    });

    it('should update multiple provider properties at once', async () => {
      await store.updateProvider('gemini', {
        apiKey: 'gemini-key',
        isActive: true,
      });

      const settings = store.settings$.get();
      const geminiProvider = settings.providers.find((p) => p.id === 'gemini');

      expect(geminiProvider?.apiKey).toBe('gemini-key');
      expect(geminiProvider?.isActive).toBe(true);
    });

    it('should not modify other providers when updating one', async () => {
      const initialSettings = store.settings$.get();
      const initialGemini = initialSettings.providers.find(
        (p) => p.id === 'gemini'
      );

      await store.updateProvider('openai', { apiKey: 'new-key' });

      const settings = store.settings$.get();
      const geminiProvider = settings.providers.find((p) => p.id === 'gemini');

      expect(geminiProvider).toEqual(initialGemini);
    });

    it('should persist changes to storage', async () => {
      await store.updateProvider('openai', { apiKey: 'persist-key' });

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.arrayContaining([
            expect.objectContaining({
              id: 'openai',
              apiKey: 'persist-key',
            }),
          ]),
        })
      );
    });
  });

  describe('setActiveProvider', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should set the active provider ID', async () => {
      await store.setActiveProvider('gemini');

      const settings = store.settings$.get();
      expect(settings.activeProviderId).toBe('gemini');
    });

    it('should persist active provider change to storage', async () => {
      await store.setActiveProvider('gemini');

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          activeProviderId: 'gemini',
        })
      );
    });

    it('should allow switching between providers', async () => {
      await store.setActiveProvider('gemini');
      expect(store.settings$.get().activeProviderId).toBe('gemini');

      await store.setActiveProvider('openai');
      expect(store.settings$.get().activeProviderId).toBe('openai');
    });
  });

  describe('setTheme', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should set theme to light', async () => {
      await store.setTheme('light');

      expect(store.settings$.get().theme).toBe('light');
    });

    it('should set theme to dark', async () => {
      await store.setTheme('dark');

      expect(store.settings$.get().theme).toBe('dark');
    });

    it('should set theme to system', async () => {
      await store.setTheme('system');

      expect(store.settings$.get().theme).toBe('system');
    });

    it('should persist theme change to storage', async () => {
      await store.setTheme('dark');

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      );
    });
  });

  describe('setDefaultLanguage', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should set default language', async () => {
      await store.setDefaultLanguage('fr');

      expect(store.settings$.get().defaultLanguage).toBe('fr');
    });

    it('should persist language change to storage', async () => {
      await store.setDefaultLanguage('de');

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLanguage: 'de',
        })
      );
    });
  });

  describe('getActiveProvider', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should return the active provider', () => {
      const activeProvider = store.getActiveProvider();

      expect(activeProvider).toBeDefined();
      expect(activeProvider?.id).toBe('openai');
    });

    it('should return the correct provider after switching', async () => {
      await store.setActiveProvider('gemini');

      const activeProvider = store.getActiveProvider();
      expect(activeProvider?.id).toBe('gemini');
    });

    it('should return undefined if no matching provider', async () => {
      // Manually set an invalid provider ID
      store.settings$.set((prev) => ({
        ...prev,
        activeProviderId: 'invalid' as GptProviderId,
      }));

      const activeProvider = store.getActiveProvider();
      expect(activeProvider).toBeUndefined();
    });
  });

  describe('getProviderById', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should return provider by ID', () => {
      const provider = store.getProviderById('openai');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('openai');
      expect(provider?.name).toBe('OpenAI');
    });

    it('should return undefined for non-existent provider', () => {
      const provider = store.getProviderById('invalid' as GptProviderId);

      expect(provider).toBeUndefined();
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should reset settings to defaults', async () => {
      // Make some changes first
      await store.setTheme('dark');
      await store.setDefaultLanguage('fr');
      await store.updateProvider('openai', { apiKey: 'test-key' });

      // Reset
      await store.reset();

      expect(store.settings$.get()).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should clear storage on reset', async () => {
      await store.reset();

      expect(mockClearSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('extraEnrichment', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should return empty string for content type with no saved preference', () => {
      // When no custom value is set, returns empty string (not defaults)
      // Defaults are provided by getExtraEnrichmentPlaceholder
      expect(store.getExtraEnrichment('vocabulary')).toBe('');
      expect(store.getExtraEnrichment('idiom')).toBe('');
      expect(store.getExtraEnrichment('phrasal-verb')).toBe('');
      expect(store.getExtraEnrichment('quote')).toBe('');
    });

    it('should return default suggestions from placeholder function', () => {
      // Placeholder function returns default suggestions for each content type
      expect(store.getExtraEnrichmentPlaceholder('vocabulary')).toBe('synonyms, antonyms, collocations');
      expect(store.getExtraEnrichmentPlaceholder('idiom')).toBe('origin, literal meaning, similar expressions');
      expect(store.getExtraEnrichmentPlaceholder('phrasal-verb')).toBe('synonyms, formal alternative, separable');
      expect(store.getExtraEnrichmentPlaceholder('quote')).toBe('author, context, interpretation');
    });

    it('should set extra enrichment for a content type', async () => {
      await store.setExtraEnrichment('vocabulary', 'synonyms, antonyms');

      expect(store.getExtraEnrichment('vocabulary')).toBe('synonyms, antonyms');
    });

    it('should persist extra enrichment to storage', async () => {
      await store.setExtraEnrichment('idiom', 'origin, similar expressions');

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          extraEnrichment: expect.objectContaining({
            idiom: 'origin, similar expressions',
          }),
        })
      );
    });

    it('should maintain separate preferences for different content types', async () => {
      await store.setExtraEnrichment('vocabulary', 'synonyms, etymology');
      await store.setExtraEnrichment('idiom', 'origin, usage');
      await store.setExtraEnrichment('phrasal-verb', 'formal alternatives');

      expect(store.getExtraEnrichment('vocabulary')).toBe('synonyms, etymology');
      expect(store.getExtraEnrichment('idiom')).toBe('origin, usage');
      expect(store.getExtraEnrichment('phrasal-verb')).toBe('formal alternatives');
      // quote was not set, so returns empty string (placeholder available separately)
      expect(store.getExtraEnrichment('quote')).toBe('');
    });

    it('should allow clearing a custom preference', async () => {
      // Set a custom value
      await store.setExtraEnrichment('vocabulary', 'my custom fields');
      expect(store.getExtraEnrichment('vocabulary')).toBe('my custom fields');

      // Clear it by setting empty string
      await store.setExtraEnrichment('vocabulary', '');
      expect(store.getExtraEnrichment('vocabulary')).toBe('');
    });

    it('should return all extra enrichment preferences', async () => {
      await store.setExtraEnrichment('vocabulary', 'synonyms');
      await store.setExtraEnrichment('idiom', 'origin');

      const prefs = store.getExtraEnrichmentPrefs();

      expect(prefs).toEqual({
        vocabulary: 'synonyms',
        idiom: 'origin',
      });
    });
  });

  describe('default settingsStore instance', () => {
    it('should export a default store instance', () => {
      expect(settingsStore).toBeDefined();
      expect(settingsStore.settings$).toBeDefined();
      expect(settingsStore.init).toBeDefined();
    });
  });
});
