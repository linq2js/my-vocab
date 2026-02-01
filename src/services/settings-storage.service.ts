/**
 * Settings Storage Service for MyVocab PWA
 *
 * Provides secure storage for application settings in localStorage.
 * API keys are encrypted using Web Crypto API (AES-GCM) before storage.
 *
 * Storage keys:
 * - myvocab_settings: Encrypted settings JSON
 * - myvocab_encryption_key: Base64-encoded encryption key
 *
 * @example
 * ```typescript
 * const settingsStorage = settingsStorageService();
 *
 * // Save settings (API keys are automatically encrypted)
 * await settingsStorage.saveSettings({
 *   providers: [{ id: 'openai', apiKey: 'sk-...', ... }],
 *   theme: 'dark',
 *   ...
 * });
 *
 * // Get settings (API keys are automatically decrypted)
 * const settings = await settingsStorage.getSettings();
 * ```
 */

import type { AppSettings } from '../types/settings';
import { DEFAULT_APP_SETTINGS } from '../types/settings';
import type { GptProviderId } from '../types/gpt';
import {
  generateEncryptionKey,
  importEncryptionKey,
  encrypt,
  decrypt,
} from '../utils/encryption';

/** localStorage key for settings data */
export const SETTINGS_STORAGE_KEY = 'myvocab_settings';

/** localStorage key for encryption key */
export const ENCRYPTION_KEY_STORAGE_KEY = 'myvocab_encryption_key';

/**
 * Internal structure for stored settings with encrypted API keys.
 */
interface StoredSettings {
  /** Encrypted API keys mapped by provider ID */
  encryptedApiKeys: Record<string, string>;
  /** Non-sensitive settings stored as-is */
  settings: Omit<AppSettings, 'providers'> & {
    providers: Array<{
      id: GptProviderId;
      name: string;
      isActive: boolean;
      // apiKey is stored separately in encryptedApiKeys
    }>;
    // extraEnrichment is stored as-is (no encryption needed)
  };
}

/**
 * Settings storage service interface type.
 */
export interface SettingsStorageService {
  /** Retrieves settings from localStorage, decrypting API keys */
  getSettings: () => Promise<AppSettings>;
  /** Saves settings to localStorage, encrypting API keys */
  saveSettings: (settings: AppSettings) => Promise<void>;
  /** Clears all settings from localStorage */
  clearSettings: () => Promise<void>;
  /** Checks if settings exist in localStorage */
  hasSettings: () => boolean;
}

/**
 * Converts an ArrayBuffer to a base64 string.
 *
 * @param buffer - The buffer to convert
 * @returns Base64-encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 *
 * @param base64 - The base64 string to convert
 * @returns Uint8Array of decoded bytes
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a settings storage service for managing encrypted app settings.
 *
 * @returns Settings storage service instance
 */
export function settingsStorageService(): SettingsStorageService {
  /**
   * Gets or creates the encryption key.
   * If a key exists in localStorage, imports it.
   * Otherwise, generates a new key and stores it.
   *
   * @returns Promise resolving to a CryptoKey
   */
  const getOrCreateEncryptionKey = async (): Promise<CryptoKey> => {
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);

    if (storedKey) {
      const keyBuffer = base64ToArrayBuffer(storedKey);
      return importEncryptionKey(keyBuffer);
    }

    // Generate new key
    const newKey = await generateEncryptionKey();

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', newKey);
    const keyBase64 = arrayBufferToBase64(exportedKey);
    localStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, keyBase64);

    return newKey;
  };

  /**
   * Retrieves settings from localStorage.
   * Decrypts API keys before returning.
   * Returns default settings if no settings exist or on error.
   *
   * @returns Promise resolving to AppSettings
   */
  const getSettings = async (): Promise<AppSettings> => {
    try {
      const storedData = localStorage.getItem(SETTINGS_STORAGE_KEY);

      if (!storedData) {
        return { ...DEFAULT_APP_SETTINGS };
      }

      const stored: StoredSettings = JSON.parse(storedData);
      const key = await getOrCreateEncryptionKey();

      // Reconstruct providers with decrypted API keys
      const providers = await Promise.all(
        stored.settings.providers.map(async (provider) => {
          const encryptedKey = stored.encryptedApiKeys[provider.id];
          let apiKey = '';

          if (encryptedKey) {
            try {
              apiKey = await decrypt(encryptedKey, key);
            } catch {
              // If decryption fails, return empty key
              apiKey = '';
            }
          }

          return {
            ...provider,
            apiKey,
          };
        })
      );

      return {
        providers,
        activeProviderId: stored.settings.activeProviderId,
        theme: stored.settings.theme,
        defaultLanguage: stored.settings.defaultLanguage,
        extraEnrichment: stored.settings.extraEnrichment ?? {},
        lastUsedLanguage: stored.settings.lastUsedLanguage ?? 'en',
        lastUsedCategories: stored.settings.lastUsedCategories ?? [],
        // Handle migration from string to object
        lastUsedExtraEnrichment: typeof stored.settings.lastUsedExtraEnrichment === 'object' 
          ? stored.settings.lastUsedExtraEnrichment 
          : {},
      };
    } catch {
      // Return default settings on any error
      return { ...DEFAULT_APP_SETTINGS };
    }
  };

  /**
   * Saves settings to localStorage.
   * Encrypts API keys before storing.
   *
   * @param settings - The settings to save
   * @returns Promise resolving when save is complete
   */
  const saveSettings = async (settings: AppSettings): Promise<void> => {
    const key = await getOrCreateEncryptionKey();

    // Encrypt API keys
    const encryptedApiKeys: Record<string, string> = {};
    for (const provider of settings.providers) {
      if (provider.apiKey) {
        encryptedApiKeys[provider.id] = await encrypt(provider.apiKey, key);
      }
    }

    // Create stored structure without plaintext API keys
    const stored: StoredSettings = {
      encryptedApiKeys,
      settings: {
        providers: settings.providers.map((p) => ({
          id: p.id,
          name: p.name,
          isActive: p.isActive,
        })),
        activeProviderId: settings.activeProviderId,
        theme: settings.theme,
        defaultLanguage: settings.defaultLanguage,
        extraEnrichment: settings.extraEnrichment,
        lastUsedLanguage: settings.lastUsedLanguage,
        lastUsedCategories: settings.lastUsedCategories,
        lastUsedExtraEnrichment: settings.lastUsedExtraEnrichment,
      },
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stored));
  };

  /**
   * Clears all settings from localStorage.
   * Does not remove the encryption key.
   *
   * @returns Promise resolving when clear is complete
   */
  const clearSettings = async (): Promise<void> => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  };

  /**
   * Checks if settings exist in localStorage.
   *
   * @returns true if settings exist, false otherwise
   */
  const hasSettings = (): boolean => {
    return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
  };

  return {
    getSettings,
    saveSettings,
    clearSettings,
    hasSettings,
  };
}
