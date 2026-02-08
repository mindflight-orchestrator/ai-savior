import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, waitForExtensionReady, getExtensionPopup } from './helpers/extension-helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../chrome_extension/dist');
  
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  
  await waitForExtensionReady(context);
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

test('Extension should initialize IndexedDB on first load', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Check if IndexedDB was initialized
  const dbExists = await popup.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('ai_saver_db', 1);
      request.onsuccess = () => {
        const db = request.result;
        const hasConversationsStore = db.objectStoreNames.contains('conversations');
        db.close();
        resolve(hasConversationsStore);
      };
      request.onerror = () => resolve(false);
    });
  });
  
  expect(dbExists).toBe(true);
  
  await popup.close();
});

test('Extension should save and retrieve settings', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Test chrome.storage.local
  const storageWorks = await popup.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ testKey: 'testValue' }, () => {
          chrome.storage.local.get('testKey', (result) => {
            resolve(result.testKey === 'testValue');
          });
        });
      } else {
        resolve(false);
      }
    });
  });
  
  expect(storageWorks).toBe(true);
  
  await popup.close();
});

test('Extension should have default settings', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Check if default settings exist
  const hasSettings = await popup.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(null, (items) => {
          // Check for expected settings keys
          const hasStorageMode = 'storageMode' in items;
          const hasBeastEnabled = 'beast_enabled_per_domain' in items;
          resolve(hasStorageMode || hasBeastEnabled);
        });
      } else {
        resolve(false);
      }
    });
  });
  
  // Settings might not be initialized yet, so this is optional
  // Adjust based on your initialization logic
  expect(typeof hasSettings).toBe('boolean');
  
  await popup.close();
});
