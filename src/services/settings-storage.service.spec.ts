import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  settingsStorageService,
  SETTINGS_STORAGE_KEY,
  ENCRYPTION_KEY_STORAGE_KEY,
  type SettingsStorageService,
} from './settings-storage.service';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../types/settings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('settingsStorageService', () => {
  let service: SettingsStorageService;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    service = settingsStorageService();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('constants', () => {
    it('should export correct storage keys', () => {
      expect(SETTINGS_STORAGE_KEY).toBe('myvocab_settings');
      expect(ENCRYPTION_KEY_STORAGE_KEY).toBe('myvocab_encryption_key');
    });
  });

  describe('getSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await service.getSettings();
      expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should return stored settings when they exist', async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
        defaultLanguage: 'es',
      };
      await service.saveSettings(customSettings);
      const settings = await service.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.defaultLanguage).toBe('es');
    });

    it('should decrypt API keys when retrieving settings', async () => {
      const settingsWithKey: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        providers: [
          { id: 'openai', name: 'OpenAI', apiKey: 'sk-test-key-123', isActive: true },
          { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
        ],
      };
      await service.saveSettings(settingsWithKey);
      const retrieved = await service.getSettings();
      const openaiProvider = retrieved.providers.find((p) => p.id === 'openai');
      expect(openaiProvider?.apiKey).toBe('sk-test-key-123');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to localStorage', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'light',
      };
      await service.saveSettings(settings);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should encrypt API keys before saving', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        providers: [
          { id: 'openai', name: 'OpenAI', apiKey: 'sk-secret-key', isActive: true },
          { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
        ],
      };
      await service.saveSettings(settings);

      // The stored value should not contain the plaintext API key
      const storedValue = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === SETTINGS_STORAGE_KEY
      )?.[1];
      expect(storedValue).toBeDefined();
      expect(storedValue).not.toContain('sk-secret-key');
    });

    it('should preserve non-sensitive settings without encryption', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
        defaultLanguage: 'fr',
      };
      await service.saveSettings(settings);
      const retrieved = await service.getSettings();
      expect(retrieved.theme).toBe('dark');
      expect(retrieved.defaultLanguage).toBe('fr');
    });
  });

  describe('clearSettings', () => {
    it('should remove settings from localStorage', async () => {
      await service.saveSettings(DEFAULT_APP_SETTINGS);
      await service.clearSettings();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY);
    });

    it('should return default settings after clearing', async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
      };
      await service.saveSettings(customSettings);
      await service.clearSettings();
      const settings = await service.getSettings();
      expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe('hasSettings', () => {
    it('should return false when no settings exist', () => {
      const result = service.hasSettings();
      expect(result).toBe(false);
    });

    it('should return true when settings exist', async () => {
      await service.saveSettings(DEFAULT_APP_SETTINGS);
      const result = service.hasSettings();
      expect(result).toBe(true);
    });
  });

  describe('encryption key management', () => {
    it('should generate and store encryption key on first save', async () => {
      await service.saveSettings(DEFAULT_APP_SETTINGS);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        ENCRYPTION_KEY_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should reuse existing encryption key for subsequent saves', async () => {
      await service.saveSettings(DEFAULT_APP_SETTINGS);
      const firstKeyCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === ENCRYPTION_KEY_STORAGE_KEY
      );
      const firstKey = firstKeyCall?.[1];

      vi.clearAllMocks();
      await service.saveSettings({ ...DEFAULT_APP_SETTINGS, theme: 'dark' });

      // Should not set a new encryption key
      const secondKeyCall = localStorageMock.setItem.mock.calls.find(
        (call) => call[0] === ENCRYPTION_KEY_STORAGE_KEY
      );
      // Either no call or same key
      if (secondKeyCall) {
        expect(secondKeyCall[1]).toBe(firstKey);
      }
    });
  });

  describe('error handling', () => {
    it('should return default settings if stored data is corrupted', async () => {
      localStorageMock.setItem(SETTINGS_STORAGE_KEY, 'invalid-json');
      const settings = await service.getSettings();
      expect(settings).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should handle missing encryption key gracefully', async () => {
      // Save settings first
      await service.saveSettings({
        ...DEFAULT_APP_SETTINGS,
        providers: [
          { id: 'openai', name: 'OpenAI', apiKey: 'sk-test', isActive: true },
          { id: 'gemini', name: 'Gemini', apiKey: '', isActive: false },
        ],
      });

      // Remove encryption key - this will cause a new key to be generated
      // which won't be able to decrypt the old encrypted API keys
      localStorageMock.removeItem(ENCRYPTION_KEY_STORAGE_KEY);

      // Should return settings with empty API keys since decryption fails
      // but other settings are preserved
      const settings = await service.getSettings();
      expect(settings.theme).toBe(DEFAULT_APP_SETTINGS.theme);
      expect(settings.defaultLanguage).toBe(DEFAULT_APP_SETTINGS.defaultLanguage);
      // API keys should be empty since decryption failed
      const openaiProvider = settings.providers.find((p) => p.id === 'openai');
      expect(openaiProvider?.apiKey).toBe('');
    });
  });
});
