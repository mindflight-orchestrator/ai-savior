import type { Settings } from '../../types/settings';
import { openDatabase } from './indexeddb-schema';

/**
 * Default settings for first run
 */
export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  storageMode: 'local',
  beast_enabled_per_domain: {
    'chat.openai.com': true,
    'chatgpt.com': true,
    'www.chatgpt.com': true,
    'claude.ai': true,
    'www.perplexity.ai': true,
    'chat.mistral.ai': true,
    'chat.deepseek.com': true,
    'chat.qwen.ai': true,
    'manus.im': true,
    'grok.com': true,
  },
  selective_mode_enabled: false,
  devModeEnabled: false,
  xpaths_by_domain: {}, // Configured via Settings UI
};

/**
 * Migrate settings from old PostgREST format to new Go backend format
 */
export async function migrateSettingsFromPostgREST(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');

  return new Promise((resolve, reject) => {
    const request = store.get(1);

    request.onsuccess = () => {
      const settings = request.result;
      if (!settings) {
        // No settings to migrate
        resolve();
        return;
      }

      let needsUpdate = false;
      const updated: any = { ...settings };

      // Migrate postgrest_url to backend_url
      if (settings.postgrest_url && !settings.backend_url) {
        updated.backend_url = settings.postgrest_url;
        delete updated.postgrest_url;
        needsUpdate = true;
      }

      // Migrate postgrest_auth to api_key
      if (settings.postgrest_auth && !settings.api_key) {
        updated.api_key = settings.postgrest_auth;
        delete updated.postgrest_auth;
        needsUpdate = true;
      }

      // Set disable_local_cache default if not set (defaults to false = hybrid mode)
      if (updated.disable_local_cache === undefined) {
        updated.disable_local_cache = false;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const updateRequest = store.put(updated);
        updateRequest.onsuccess = () => {
          console.log('[Migration] Settings migrated from PostgREST to Go backend format');
          resolve();
        };
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Initialize default settings if they don't exist
 * Also runs migration from old PostgREST format
 */
export async function initializeDefaultSettings(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');

  return new Promise((resolve, reject) => {
    const request = store.get(1);

    request.onsuccess = () => {
      if (!request.result) {
        // Settings don't exist, create defaults
        const addRequest = store.add(DEFAULT_SETTINGS);
        addRequest.onsuccess = () => {
          // Run migration (will be no-op for new settings)
          migrateSettingsFromPostgREST().then(() => resolve()).catch(reject);
        };
        addRequest.onerror = () => reject(addRequest.error);
      } else {
        // Settings already exist, run migration
        migrateSettingsFromPostgREST().then(() => resolve()).catch(reject);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
