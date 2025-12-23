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
 * Initialize default settings if they don't exist
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
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      } else {
        // Settings already exist, no need to create
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}
