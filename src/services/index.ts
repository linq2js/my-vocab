/**
 * Services module exports.
 * Contains all application services for data management and external integrations.
 */

export { storageService, DB_NAME, DB_VERSION } from './storage.service';
export type { StorageService, GptCacheEntry } from './storage.service';

export { cacheService, generateCacheKey } from './cache.service';
export type { CacheService } from './cache.service';

export {
  settingsStorageService,
  SETTINGS_STORAGE_KEY,
  ENCRYPTION_KEY_STORAGE_KEY,
} from './settings-storage.service';
export type { SettingsStorageService } from './settings-storage.service';

export type { IGptProvider, GptEnrichmentRequest } from './gpt-provider.interface';

export { OpenAIProvider, GeminiProvider } from './providers';

export { gptService } from './gpt.service';
export type { GptService, GptServiceOptions, ProviderFactory } from './gpt.service';
