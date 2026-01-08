import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, mockSearchResults, mockConversation, waitForModal, closeModal } from './helpers/popup-helpers';
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

test('Preview modal should open from search results', async () => {
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
  
  // Mock getConversation
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Click preview button
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  await waitForModal(popup, 'preview-modal');
  
  const previewModal = popup.locator('#preview-modal');
  await expect(previewModal).toBeVisible();
  
  await popup.close();
});

test('Preview modal should display conversation data', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await popup.waitForTimeout(200); // Wait for results to render
  
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  await waitForModal(popup, 'preview-modal');
  await popup.waitForTimeout(300); // Wait for modal content to load
  
  // Check modal content
  const previewTitle = popup.locator('#preview-title');
  await expect(previewTitle).toBeVisible();
  const titleText = await previewTitle.textContent();
  expect(titleText).toBeTruthy();
  
  const previewSource = popup.locator('#preview-source');
  await expect(previewSource).toBeVisible();
  const sourceText = await previewSource.textContent();
  expect(sourceText).toBeTruthy();
  
  const previewContent = popup.locator('#preview-content');
  await expect(previewContent).toBeVisible();
  
  await popup.close();
});

test('Preview modal close button should close modal', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  await popup.waitForTimeout(200); // Wait for results
  
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  await waitForModal(popup, 'preview-modal');
  await popup.waitForTimeout(300); // Wait for content to load
  
  // Close modal using direct selector
  const closeButton = popup.locator('#preview-close');
  await closeButton.click();
  
  await popup.waitForTimeout(200);
  
  const previewModal = popup.locator('#preview-modal');
  const isVisible = await previewModal.isVisible();
  expect(isVisible).toBe(false);
  
  await popup.close();
});

test('Preview modal should close on backdrop click', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  const previewButton = popup.locator('#search-results button').filter({ hasText: '👁' }).first();
  await previewButton.click();
  
  await waitForModal(popup, 'preview-modal');
  
  // Click backdrop (modal itself, not content)
  const previewModal = popup.locator('#preview-modal');
  await previewModal.click({ position: { x: 10, y: 10 } });
  
  await popup.waitForTimeout(200);
  
  // Modal should be hidden
  const isVisible = await previewModal.isVisible();
  expect(isVisible).toBe(false);
  
  await popup.close();
});

test('Edit modal should open from search results', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  // Click edit button
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await waitForModal(popup, 'edit-modal');
  
  const editModal = popup.locator('#edit-modal');
  await expect(editModal).toBeVisible();
  
  await popup.close();
});

test('Edit modal should pre-fill form with conversation data', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await waitForModal(popup, 'edit-modal');
  
  // Check form fields
  const editTitle = popup.locator('#edit-title');
  const titleValue = await editTitle.inputValue();
  expect(titleValue).toBe(mockConversations[0].title);
  
  const editDescription = popup.locator('#edit-description');
  const descriptionValue = await editDescription.inputValue();
  expect(descriptionValue).toBe(mockConversations[0].description);
  
  const editTags = popup.locator('#edit-tags');
  const tagsValue = await editTags.inputValue();
  expect(tagsValue).toBe(mockConversations[0].tags.join(', '));
  
  await popup.close();
});

test('Edit modal should save changes', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  // Mock update response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({ conversation: { id: 1, title: 'Original', description: 'Original desc', tags: [] } }), 0);
        } else if (message.action === 'updateConversation') {
          setTimeout(() => callback({ conversation: { id: 1 } }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await waitForModal(popup, 'edit-modal');
  
  // Edit fields
  await popup.locator('#edit-title').fill('Updated Title');
  await popup.locator('#edit-description').fill('Updated Description');
  
  // Save
  const saveButton = popup.locator('#edit-save');
  await saveButton.click();
  
  // Wait for success message
  await popup.waitForTimeout(500);
  
  const resultElement = popup.locator('#edit-result');
  const resultText = await resultElement.textContent();
  expect(resultText).toContain('✅');
  
  await popup.close();
});

test('Edit modal cancel button should close modal', async () => {
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
  await mockConversation(popup, mockConversations[0]);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(400);
  
  const editButton = popup.locator('#search-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  await waitForModal(popup, 'edit-modal');
  
  // Click cancel
  const cancelButton = popup.locator('#edit-cancel');
  await cancelButton.click();
  
  const editModal = popup.locator('#edit-modal');
  await expect(editModal).not.toBeVisible();
  
  await popup.close();
});

test('Snippet modal should open for new snippet', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await waitForModal(popup, 'snippet-modal');
  
  const snippetModal = popup.locator('#snippet-modal');
  await expect(snippetModal).toBeVisible();
  
  // Check title
  const modalTitle = popup.locator('#snippet-modal-title');
  const titleText = await modalTitle.textContent();
  expect(titleText).toContain('Nouveau snippet');
  
  await popup.close();
});

test('Snippet modal should have empty form for new snippet', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await waitForModal(popup, 'snippet-modal');
  
  // Check fields are empty
  const titleInput = popup.locator('#snippet-title');
  const titleValue = await titleInput.inputValue();
  expect(titleValue).toBe('');
  
  const contentInput = popup.locator('#snippet-content');
  const contentValue = await contentInput.inputValue();
  expect(contentValue).toBe('');
  
  await popup.close();
});

test('Snippet modal should validate required fields', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await waitForModal(popup, 'snippet-modal');
  
  // Try to save without filling required fields
  const saveButton = popup.locator('#snippet-modal-save');
  await saveButton.click();
  
  // Check for error message
  const resultElement = popup.locator('#snippet-modal-result');
  await expect(resultElement).toBeVisible();
  
  const errorText = await resultElement.textContent();
  expect(errorText).toContain('requis');
  
  await popup.close();
});

test('Snippet modal should close on cancel', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await waitForModal(popup, 'snippet-modal');
  
  // Click cancel
  const cancelButton = popup.locator('#snippet-modal-cancel');
  await cancelButton.click();
  
  const snippetModal = popup.locator('#snippet-modal');
  await expect(snippetModal).not.toBeVisible();
  
  await popup.close();
});
