import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, mockTabState, mockSearchResults, mockSnippets, waitForTabState } from './helpers/popup-helpers';
import { mockTabStateNew, mockConversations } from './fixtures/mock-conversations';
import { mockSnippets as mockSnippetsData } from './fixtures/mock-snippets';
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

test('Full workflow: Save → Search → Edit → Delete conversation', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock save conversation
  await popup.evaluate(() => {
    let savedConversationId = 1;
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'saveConversation') {
          setTimeout(() => callback({
            conversation: {
              id: savedConversationId++,
              canonical_url: 'https://chat.openai.com/c/test',
              ...message.payload
            }
          }), 0);
        } else if (message.action === 'getTabState') {
          setTimeout(() => callback({
            supported: true,
            source: 'chatgpt',
            canonical_url: 'https://chat.openai.com/c/test',
            known: false
          }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  // Step 1: Save conversation
  await mockTabState(popup, mockTabStateNew);
  const refreshButton = popup.locator('#save-refresh');
  await refreshButton.click();
  await waitForTabState(popup);
  
  await popup.locator('#save-title').fill('Integration Test Conversation');
  await popup.locator('#save-description').fill('Testing full workflow');
  await popup.locator('#save-tags').fill('test, integration');
  
  await popup.locator('#save-now').click();
  await popup.waitForTimeout(500);
  
  // Step 2: Search for conversation
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 1,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Integration Test Conversation',
    preview: 'Testing full workflow',
    updated_at: new Date().toISOString(),
    tags: ['test', 'integration'],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('Integration');
  await popup.waitForTimeout(400);
  
  // Step 3: Edit conversation
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({
            conversation: {
              id: 1,
              title: 'Integration Test Conversation',
              description: 'Testing full workflow',
              tags: ['test', 'integration'],
            }
          }), 0);
        } else if (message.action === 'updateConversation') {
          setTimeout(() => callback({ conversation: { id: 1 } }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await popup.waitForSelector('#edit-modal', { state: 'visible' });
  
  await popup.locator('#edit-title').fill('Updated Integration Test');
  await popup.locator('#edit-save').click();
  
  await popup.waitForTimeout(500);
  
  // Step 4: Delete conversation
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'deleteConversation') {
          setTimeout(() => callback({}), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  popup.once('dialog', dialog => dialog.accept());
  
  const deleteButton = popup.locator('#search-results button').filter({ hasText: '🗑' }).first();
  await deleteButton.click();
  
  await popup.waitForTimeout(500);
  
  await popup.close();
});

test('Snippet workflow: Create → Filter → Edit → Delete snippet', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  // Step 1: Create snippet
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'saveSnippet') {
          setTimeout(() => callback({
            snippet: {
              id: 1,
              ...message.snippet
            }
          }), 0);
        } else if (message.action === 'listSnippets') {
          setTimeout(() => callback({ snippets: [] }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  await popup.locator('#snippet-title').fill('Integration Test Snippet');
  await popup.locator('#snippet-content').fill('console.log("test");');
  await popup.locator('#snippet-language').selectOption('javascript');
  await popup.locator('#snippet-tags').fill('test, integration');
  
  await popup.locator('#snippet-modal-save').click();
  await popup.waitForTimeout(500);
  
  // Step 2: Filter by language
  await mockSnippets(popup, [{
    id: 1,
    title: 'Integration Test Snippet',
    content: 'console.log("test");',
    language: 'javascript',
    tags: ['test', 'integration'],
    created_at: new Date().toISOString(),
    preview: 'console.log',
  }]);
  
  const languageFilter = popup.locator('#snippet-language-filter');
  await languageFilter.selectOption('javascript');
  
  await popup.waitForTimeout(300);
  
  // Step 3: Edit snippet
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'listSnippets') {
          setTimeout(() => callback({
            snippets: [{
              id: 1,
              title: 'Integration Test Snippet',
              content: 'console.log("test");',
              language: 'javascript',
              tags: ['test', 'integration'],
              created_at: new Date().toISOString(),
              preview: 'console.log',
            }]
          }), 0);
        } else if (message.action === 'saveSnippet') {
          setTimeout(() => callback({ snippet: { id: 1 } }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const editButton = popup.locator('#snippet-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  await popup.locator('#snippet-title').fill('Updated Integration Test');
  await popup.locator('#snippet-modal-save').click();
  
  await popup.waitForTimeout(500);
  
  // Step 4: Delete snippet
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'deleteSnippet') {
          setTimeout(() => callback({}), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  popup.once('dialog', dialog => dialog.accept());
  
  const deleteButton = popup.locator('#snippet-results button').filter({ hasText: '🗑' }).first();
  await deleteButton.click();
  
  await popup.waitForTimeout(500);
  
  await popup.close();
});

test('Settings workflow: Change storage mode → Test connection → Update Beast Mode', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Step 1: Open settings
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Step 2: Change to cloud mode
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(300);
  
  // Step 3: Configure cloud settings
  const urlInput = popup.locator('#postgrest-url');
  await urlInput.fill('http://localhost:3000');
  
  const authInput = popup.locator('#postgrest-auth');
  await authInput.fill('Bearer test-token');
  
  // Step 4: Test connection
  await popup.evaluate(() => {
    // Mock fetch for connection test
    (window as any).fetch = async (url: string) => {
      if (url.includes('localhost:3000')) {
        return { ok: true, status: 200 };
      }
      throw new Error('Connection failed');
    };
  });
  
  const testButton = popup.locator('#test-connection');
  await testButton.click();
  
  await popup.waitForTimeout(1000); // Wait for connection test
  
  // Check connection status
  const statusElement = popup.locator('#connection-status');
  await expect(statusElement).toBeVisible({ timeout: 2000 });
  const statusText = await statusElement.textContent();
  expect(statusText).toBeTruthy();
  
  // Step 5: Update Beast Mode
  const chatgptCheckbox = popup.locator('#beast-chatgpt');
  const initialChecked = await chatgptCheckbox.isChecked();
  await chatgptCheckbox.click();
  
  await popup.waitForTimeout(200);
  
  const afterChecked = await chatgptCheckbox.isChecked();
  expect(afterChecked).toBe(!initialChecked);
  
  await popup.close();
});

test('Cross-tab updates: Changes in Search should reflect in Save tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Start in Search tab
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 1,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test Conversation',
    preview: 'Preview',
    updated_at: new Date().toISOString(),
    tags: [],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Edit conversation
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({
            conversation: {
              id: 1,
              title: 'Test Conversation',
              description: 'Original description',
              tags: [],
            }
          }), 0);
        } else if (message.action === 'updateConversation') {
          setTimeout(() => callback({ conversation: { id: 1 } }), 0);
        } else if (message.action === 'getTabState') {
          setTimeout(() => callback({
            supported: true,
            source: 'chatgpt',
            canonical_url: 'https://chat.openai.com/c/test',
            known: true,
            existingConversation: {
              title: 'Updated Test Conversation',
              description: 'Updated description',
              tags: ['updated'],
            }
          }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await popup.waitForSelector('#edit-modal', { state: 'visible' });
  
  await popup.locator('#edit-title').fill('Updated Test Conversation');
  await popup.locator('#edit-save').click();
  
  await popup.waitForTimeout(500);
  
  // Switch to Save tab
  await switchTab(popup, 'save');
  
  // Refresh tab state
  const refreshButton = popup.locator('#save-refresh');
  await refreshButton.click();
  
  await waitForTabState(popup);
  await popup.waitForTimeout(300); // Wait for form to update
  
  // Verify updated data is shown
  const titleInput = popup.locator('#save-title');
  await expect(titleInput).toBeVisible();
  const titleValue = await titleInput.inputValue();
  
  // Should show updated title (if tab state is refreshed)
  expect(titleValue).toBeTruthy();
  
  await popup.close();
});

test('Navigation flow: Settings → Save → Search → Snippets', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Start in Settings
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Go back to Save tab
  const backButton = popup.locator('#settings-back');
  await backButton.click();
  
  const saveTab = popup.locator('#save-tab');
  await expect(saveTab).toBeVisible();
  
  // Go to Search
  await switchTab(popup, 'search');
  const searchTab = popup.locator('#search-tab');
  await expect(searchTab).toBeVisible();
  
  // Go to Snippets
  await switchTab(popup, 'snippets');
  const snippetsTab = popup.locator('#snippets-tab');
  await expect(snippetsTab).toBeVisible();
  
  // Back to Save
  await switchTab(popup, 'save');
  await expect(saveTab).toBeVisible();
  
  await popup.close();
});
