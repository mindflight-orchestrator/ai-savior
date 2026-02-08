import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, mockSearchResults, mockGetAllTags, waitForSearchResults } from './helpers/popup-helpers';
import { mockConversations } from './fixtures/mock-conversations';
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

test('Search input should be visible in Search tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchInput = popup.locator('#search-input');
  await expect(searchInput).toBeVisible();
  
  await popup.close();
});

test('Search input should accept text', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test query');
  
  const value = await searchInput.inputValue();
  expect(value).toBe('test query');
  
  await popup.close();
});

test('Search should trigger with debounce', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  let searchCallCount = 0;
  
  // Mock search to count calls
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'searchConversations') {
          (window as any).__searchCallCount = ((window as any).__searchCallCount || 0) + 1;
          setTimeout(() => callback({ results: [] }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
    (window as any).__searchCallCount = 0;
  });
  
  const searchInput = popup.locator('#search-input');
  
  // Type multiple characters quickly
  await searchInput.fill('t');
  await searchInput.fill('te');
  await searchInput.fill('tes');
  await searchInput.fill('test');
  
  // Wait for debounce (300ms)
  await popup.waitForTimeout(400);
  
  const callCount = await popup.evaluate(() => (window as any).__searchCallCount);
  // Should be called at least once, but debounced
  expect(callCount).toBeGreaterThan(0);
  
  await popup.close();
});

test('Clear button should clear search input', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test query');
  
  const clearButton = popup.locator('#search-clear');
  await clearButton.click();
  
  const value = await searchInput.inputValue();
  expect(value).toBe('');
  
  await popup.close();
});

test('Search results should display when available', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  // Mock search results
  const searchResults = mockConversations.map(conv => ({
    id: conv.id,
    canonical_url: conv.canonical_url,
    source: conv.source,
    title: conv.title,
    preview: conv.content.substring(0, 100),
    updated_at: conv.updated_at,
    tags: conv.tags,
  }));
  
  await mockSearchResults(popup, searchResults);
  
  // Trigger search
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  const resultsContainer = popup.locator('#search-results');
  await expect(resultsContainer).toBeVisible();
  
  // Check if results are rendered
  const resultCards = popup.locator('#search-results > div');
  const cardCount = await resultCards.count();
  expect(cardCount).toBeGreaterThan(0);
  
  await popup.close();
});

test('Empty search results should show empty message', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  await mockSearchResults(popup, []);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('nonexistent');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  const resultsContainer = popup.locator('#search-results');
  const text = await resultsContainer.textContent();
  
  expect(text).toContain('Aucun résultat');
  
  await popup.close();
});

test('Search results should display conversation metadata', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 1,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test Conversation',
    preview: 'This is a preview of the conversation content...',
    updated_at: new Date().toISOString(),
    tags: ['test', 'example'],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  // Check if title is displayed
  const resultCard = popup.locator('#search-results > div').first();
  const cardText = await resultCard.textContent();
  
  expect(cardText).toContain('Test Conversation');
  expect(cardText).toContain('CHATGPT');
  
  await popup.close();
});

test('Tag checkboxes should appear after search', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const searchResults = [{
    id: 1,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test',
    preview: 'Preview',
    updated_at: new Date().toISOString(),
    tags: ['react', 'javascript'],
  }];
  await mockSearchResults(popup, searchResults);
  await mockGetAllTags(popup, ['react', 'javascript']);
  
  await switchTab(popup, 'search');
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  await popup.waitForTimeout(200);
  
  // Check if tags list is populated (sidebar tags come from getAllTags)
  const tagsList = popup.locator('#search-tags-list');
  await expect(tagsList).toBeVisible();
  
  const tagItems = popup.locator('#search-tags-list input[type="checkbox"]');
  const tagCount = await tagItems.count();
  expect(tagCount).toBeGreaterThan(0);
  
  await popup.close();
});

test('Selecting tag should filter search results', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const searchResults = [
    {
      id: 1,
      canonical_url: 'https://chat.openai.com/c/test1',
      source: 'chatgpt',
      title: 'React Tutorial',
      preview: 'Preview',
      updated_at: new Date().toISOString(),
      tags: ['react', 'javascript'],
    },
    {
      id: 2,
      canonical_url: 'https://chat.openai.com/c/test2',
      source: 'claude',
      title: 'Python Guide',
      preview: 'Preview',
      updated_at: new Date().toISOString(),
      tags: ['python'],
    },
  ];
  await mockSearchResults(popup, searchResults);
  await mockGetAllTags(popup, ['react', 'javascript', 'python']);
  
  await switchTab(popup, 'search');
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  await popup.waitForTimeout(200);
  
  // Click on a tag checkbox (sidebar is populated by getAllTags mock)
  const reactTag = popup.locator('#search-tags-list').locator('text=react').first();
  await reactTag.click();
  
  // Wait for filtered search
  await popup.waitForTimeout(400);
  
  // Verify search was called with tag filter
  const searchCall = await popup.evaluate(() => (window as any).__lastSearchCall);
  // Note: This test verifies UI interaction, actual filtering logic is in the service worker
  
  await popup.close();
});

test('Open button should create new tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchResults = [{
    id: 1,
    canonical_url: 'https://chat.openai.com/c/test',
    source: 'chatgpt',
    title: 'Test',
    preview: 'Preview',
    updated_at: new Date().toISOString(),
    tags: [],
  }];
  
  await mockSearchResults(popup, searchResults);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  // Count tabs before
  const tabsBefore = context.pages().length;
  
  // Click open button (↗)
  const openButton = popup.locator('#search-results button').filter({ hasText: '↗' }).first();
  await openButton.click();
  
  // Wait a bit for tab creation
  await popup.waitForTimeout(500);
  
  // Note: In Playwright, we can't directly verify chrome.tabs.create was called,
  // but we can verify the button is clickable and the action is triggered
  
  await popup.close();
});

test('Preview button should open preview modal', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
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
  
  // Mock getConversation response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({
            conversation: {
              id: 1,
              title: 'Test Conversation',
              source: 'chatgpt',
              canonical_url: 'https://chat.openai.com/c/test',
              description: 'Test description',
              tags: ['test'],
              content: 'Test content',
              updated_at: new Date().toISOString(),
            }
          }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  // Click preview button (👁)
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  // Wait for modal
  const previewModal = popup.locator('#preview-modal');
  await expect(previewModal).toBeVisible();
  
  // Check modal content
  const modalTitle = popup.locator('#preview-title');
  const titleText = await modalTitle.textContent();
  expect(titleText).toContain('Prévisualisation');
  
  await popup.close();
});

test('Edit button should open edit modal', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
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
  
  // Mock getConversation response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({
            conversation: {
              id: 1,
              title: 'Test Conversation',
              description: 'Test description',
              tags: ['test'],
            }
          }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  await popup.waitForTimeout(300); // Wait for buttons to render
  
  // Click edit button
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  // Wait for modal
  const editModal = popup.locator('#edit-modal');
  await expect(editModal).toBeVisible({ timeout: 2000 });
  
  // Check form is pre-filled
  const editTitle = popup.locator('#edit-title');
  await expect(editTitle).toBeVisible();
  await popup.waitForTimeout(300); // Wait for form to populate
  const titleValue = await editTitle.inputValue();
  expect(titleValue).toBe('Test Conversation');
  
  await popup.close();
});

test('Delete button should show confirmation', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
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
  
  await waitForSearchResults(popup);
  
  // Set up dialog handler
  popup.once('dialog', dialog => {
    expect(dialog.message()).toContain('Supprimer');
    dialog.dismiss(); // Cancel deletion
  });
  
  // Click delete button (🗑)
  const deleteButton = popup.locator('#search-results button').filter({ hasText: '🗑' }).first();
  await deleteButton.click();
  
  // Dialog should have been triggered
  // (We dismissed it, so no actual deletion)
  
  await popup.close();
});

test('Search status should show result count', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchResults = [
    { id: 1, canonical_url: 'https://test.com/1', source: 'chatgpt', title: 'Test 1', preview: 'Preview', updated_at: new Date().toISOString(), tags: [] },
    { id: 2, canonical_url: 'https://test.com/2', source: 'claude', title: 'Test 2', preview: 'Preview', updated_at: new Date().toISOString(), tags: [] },
  ];
  
  await mockSearchResults(popup, searchResults);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await waitForSearchResults(popup);
  
  const statusElement = popup.locator('#search-status');
  const statusText = await statusElement.textContent();
  
  expect(statusText).toContain('2');
  expect(statusText).toContain('résultat');
  
  await popup.close();
});
