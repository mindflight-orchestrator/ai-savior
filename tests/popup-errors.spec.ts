import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, mockSearchResults, mockSnippets } from './helpers/popup-helpers';
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

test('Save tab should handle service worker errors gracefully', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock chrome.runtime.lastError
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getTabState') {
          (window as any).chrome.runtime.lastError = { message: 'Service worker error' };
          setTimeout(() => callback(undefined), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  // Trigger refresh
  const refreshButton = popup.locator('#save-refresh');
  await refreshButton.click();
  
  await popup.waitForTimeout(500);
  
  // Check for error message
  const statusText = popup.locator('#save-status-text');
  const text = await statusText.textContent();
  
  expect(text).toContain('❌');
  
  await popup.close();
});

test('Save button should handle save errors', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock error response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'saveConversation') {
          setTimeout(() => callback({ error: 'Failed to save conversation' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  // Fill form and save
  await popup.locator('#save-title').fill('Test');
  await popup.locator('#save-now').click();
  
  await popup.waitForTimeout(500);
  
  // Check for error message
  const resultElement = popup.locator('#save-result');
  const resultText = await resultElement.textContent();
  
  expect(resultText).toContain('❌');
  
  await popup.close();
});

test('Search should handle empty results gracefully', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  await mockSearchResults(popup, []);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('nonexistent query');
  await popup.waitForTimeout(400);
  
  // Check for empty state message
  const resultsContainer = popup.locator('#search-results');
  const text = await resultsContainer.textContent();
  
  expect(text).toContain('Aucun résultat');
  
  await popup.close();
});

test('Search should handle error responses', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  // Mock error response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'searchConversations') {
          setTimeout(() => callback({ error: 'Search failed' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Check for error status
  const statusElement = popup.locator('#search-status');
  const statusText = await statusElement.textContent();
  
  expect(statusText).toContain('❌');
  
  await popup.close();
});

test('Snippets should handle empty list', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  await mockSnippets(popup, []);
  
  await popup.waitForTimeout(500);
  
  // Check for empty state
  const resultsContainer = popup.locator('#snippet-results');
  const text = await resultsContainer.textContent();
  
  expect(text).toContain('Aucun snippet');
  
  await popup.close();
});

test('Snippets should handle load errors', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock error response before switching so the first listSnippets call uses it
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'listSnippets') {
          setTimeout(() => callback({ error: 'Failed to load snippets' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  await switchTab(popup, 'snippets');
  
  await popup.waitForTimeout(1000); // Wait for error to appear
  
  // Check for error status
  const statusElement = popup.locator('#snippet-status');
  await expect(statusElement).toBeVisible();
  const statusText = await statusElement.textContent();
  
  expect(statusText).toContain('❌');
  
  await popup.close();
});

test('Edit modal should handle invalid conversation ID', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 999,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test',
    preview: 'Preview',
    updated_at: new Date().toISOString(),
    tags: [],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  // Mock error for getConversation
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({ error: 'Conversation not found' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Set up dialog handler for alert
  popup.once('dialog', dialog => {
    expect(dialog.message()).toContain('Erreur');
    dialog.accept();
  });
  
  // Click edit button
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  // Alert should be shown
  
  await popup.close();
});

test('Preview modal should handle missing conversation data', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 999,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test',
    preview: 'Preview',
    updated_at: new Date().toISOString(),
    tags: [],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  // Mock error for getConversation
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({ error: 'Not found' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Set up dialog handler
  popup.once('dialog', dialog => {
    expect(dialog.message()).toContain('Erreur');
    dialog.accept();
  });
  
  // Click preview button
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  // Alert should be shown, modal should close
  
  await popup.close();
});

test('Snippet modal should handle save errors', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  // Mock error response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'saveSnippet') {
          setTimeout(() => callback({ error: 'Failed to save snippet' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  // Fill and save
  await popup.locator('#snippet-title').fill('Test');
  await popup.locator('#snippet-content').fill('Test content');
  await popup.locator('#snippet-modal-save').click();
  
  await popup.waitForTimeout(500);
  
  // Check for error message
  const resultElement = popup.locator('#snippet-modal-result');
  const resultText = await resultElement.textContent();
  
  expect(resultText).toContain('❌');
  
  await popup.close();
});

test('Invalid tab state should show appropriate error', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock invalid tab state
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getTabState') {
          setTimeout(() => callback({ error: 'Invalid tab state' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const refreshButton = popup.locator('#save-refresh');
  await refreshButton.click();
  
  await popup.waitForTimeout(500);
  
  const statusText = popup.locator('#save-status-text');
  const text = await statusText.textContent();
  
  expect(text).toContain('❌');
  
  await popup.close();
});

test('Malformed search response should be handled', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  // Mock malformed response (not an array)
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'searchConversations') {
          setTimeout(() => callback({ results: 'invalid' }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Should handle gracefully (empty results or error)
  const resultsContainer = popup.locator('#search-results');
  await expect(resultsContainer).toBeVisible();
  
  await popup.close();
});
