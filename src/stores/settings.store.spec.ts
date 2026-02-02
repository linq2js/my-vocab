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

  describe('setNativeLanguage', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    it('should set native language', async () => {
      await store.setNativeLanguage('vi');

      expect(store.settings$.get().nativeLanguage).toBe('vi');
    });

    it('should persist native language change to storage', async () => {
      await store.setNativeLanguage('ja');

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          nativeLanguage: 'ja',
        })
      );
    });

    it('should default to en', () => {
      expect(store.settings$.get().nativeLanguage).toBe('en');
    });
  });

  describe('translationStyles CRUD', () => {
    beforeEach(async () => {
      store = createSettingsStore();
      await store.init();
    });

    describe('addTranslationStyle', () => {
      it('should add a new translation style', async () => {
        await store.addTranslationStyle({
          name: 'Formal Email',
          prompt: 'Translate using formal business language.',
        });

        const styles = store.getTranslationStyles();
        expect(styles).toHaveLength(1);
        expect(styles[0]!.name).toBe('Formal Email');
        expect(styles[0]!.prompt).toBe('Translate using formal business language.');
      });

      it('should generate unique id for each style', async () => {
        await store.addTranslationStyle({
          name: 'Style 1',
          prompt: 'Prompt 1',
        });
        await store.addTranslationStyle({
          name: 'Style 2',
          prompt: 'Prompt 2',
        });

        const styles = store.getTranslationStyles();
        expect(styles[0]!.id).not.toBe(styles[1]!.id);
      });

      it('should set createdAt and updatedAt timestamps', async () => {
        const beforeAdd = Date.now();
        await store.addTranslationStyle({
          name: 'Test Style',
          prompt: 'Test prompt',
        });
        const afterAdd = Date.now();

        const styles = store.getTranslationStyles();
        expect(styles[0]!.createdAt).toBeGreaterThanOrEqual(beforeAdd);
        expect(styles[0]!.createdAt).toBeLessThanOrEqual(afterAdd);
        expect(styles[0]!.updatedAt).toBe(styles[0]!.createdAt);
      });

      it('should persist new style to storage', async () => {
        await store.addTranslationStyle({
          name: 'Casual Chat',
          prompt: 'Translate casually.',
        });

        expect(mockSaveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            translationStyles: expect.arrayContaining([
              expect.objectContaining({
                name: 'Casual Chat',
                prompt: 'Translate casually.',
              }),
            ]),
          })
        );
      });
    });

    describe('updateTranslationStyle', () => {
      it('should update style name', async () => {
        await store.addTranslationStyle({
          name: 'Original Name',
          prompt: 'Original prompt',
        });
        const styles = store.getTranslationStyles();
        const styleId = styles[0]!.id;

        await store.updateTranslationStyle(styleId, { name: 'Updated Name' });

        const updatedStyles = store.getTranslationStyles();
        expect(updatedStyles[0]!.name).toBe('Updated Name');
        expect(updatedStyles[0]!.prompt).toBe('Original prompt');
      });

      it('should update style prompt', async () => {
        await store.addTranslationStyle({
          name: 'Test Style',
          prompt: 'Original prompt',
        });
        const styleId = store.getTranslationStyles()[0]!.id;

        await store.updateTranslationStyle(styleId, { prompt: 'Updated prompt' });

        const updatedStyles = store.getTranslationStyles();
        expect(updatedStyles[0]!.prompt).toBe('Updated prompt');
      });

      it('should update updatedAt timestamp', async () => {
        await store.addTranslationStyle({
          name: 'Test Style',
          prompt: 'Test prompt',
        });
        const styleId = store.getTranslationStyles()[0]!.id;
        const originalUpdatedAt = store.getTranslationStyles()[0]!.updatedAt;

        // Small delay to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        await store.updateTranslationStyle(styleId, { name: 'New Name' });

        const updatedStyles = store.getTranslationStyles();
        expect(updatedStyles[0]!.updatedAt).toBeGreaterThan(originalUpdatedAt);
      });

      it('should not modify other styles when updating one', async () => {
        await store.addTranslationStyle({ name: 'Style 1', prompt: 'Prompt 1' });
        await store.addTranslationStyle({ name: 'Style 2', prompt: 'Prompt 2' });

        const styles = store.getTranslationStyles();
        const style1Id = styles[0]!.id;

        await store.updateTranslationStyle(style1Id, { name: 'Updated Style 1' });

        const updatedStyles = store.getTranslationStyles();
        expect(updatedStyles[1]!.name).toBe('Style 2');
        expect(updatedStyles[1]!.prompt).toBe('Prompt 2');
      });

      it('should persist update to storage', async () => {
        await store.addTranslationStyle({ name: 'Test', prompt: 'Test' });
        const styleId = store.getTranslationStyles()[0]!.id;
        vi.clearAllMocks();

        await store.updateTranslationStyle(styleId, { name: 'Updated' });

        expect(mockSaveSettings).toHaveBeenCalled();
      });
    });

    describe('deleteTranslationStyle', () => {
      it('should delete a style by id', async () => {
        await store.addTranslationStyle({ name: 'To Delete', prompt: 'Delete me' });
        const styleId = store.getTranslationStyles()[0]!.id;

        await store.deleteTranslationStyle(styleId);

        expect(store.getTranslationStyles()).toHaveLength(0);
      });

      it('should only delete the specified style', async () => {
        await store.addTranslationStyle({ name: 'Keep', prompt: 'Keep this' });
        await store.addTranslationStyle({ name: 'Delete', prompt: 'Delete this' });

        const styles = store.getTranslationStyles();
        const deleteId = styles[1]!.id;

        await store.deleteTranslationStyle(deleteId);

        const remainingStyles = store.getTranslationStyles();
        expect(remainingStyles).toHaveLength(1);
        expect(remainingStyles[0]!.name).toBe('Keep');
      });

      it('should persist deletion to storage', async () => {
        await store.addTranslationStyle({ name: 'Test', prompt: 'Test' });
        const styleId = store.getTranslationStyles()[0]!.id;
        vi.clearAllMocks();

        await store.deleteTranslationStyle(styleId);

        expect(mockSaveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            translationStyles: [],
          })
        );
      });
    });

    describe('getTranslationStyles', () => {
      it('should return empty array when no styles exist', () => {
        expect(store.getTranslationStyles()).toEqual([]);
      });

      it('should return all styles', async () => {
        await store.addTranslationStyle({ name: 'Style 1', prompt: 'Prompt 1' });
        await store.addTranslationStyle({ name: 'Style 2', prompt: 'Prompt 2' });

        const styles = store.getTranslationStyles();
        expect(styles).toHaveLength(2);
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
