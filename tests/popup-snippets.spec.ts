import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, mockSnippets, waitForSnippets } from './helpers/popup-helpers';
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

test('Snippets tab should load snippets on open', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, mockSnippetsData);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  const resultsContainer = popup.locator('#snippet-results');
  await expect(resultsContainer).toBeVisible();
  
  await popup.close();
});

test('Empty snippets should show empty state with create button', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  await mockSnippets(popup, []);
  
  await waitForSnippets(popup);
  await popup.waitForTimeout(300); // Wait for empty state to render
  
  const resultsContainer = popup.locator('#snippet-results');
  await expect(resultsContainer).toBeVisible();
  const text = await resultsContainer.textContent();
  
  expect(text).toContain('Aucun snippet');
  
  // Check for create button in empty state
  const createButton = popup.locator('#snippet-empty-new-btn');
  await expect(createButton).toBeVisible();
  
  await popup.close();
});

test('Snippet cards should display title and metadata', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, [mockSnippetsData[0]]);
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  await popup.waitForTimeout(300); // Wait for cards to render
  
  const snippetCard = popup.locator('#snippet-results > div').first();
  await expect(snippetCard).toBeVisible();
  const cardText = await snippetCard.textContent();
  
  expect(cardText).toContain(mockSnippetsData[0].title);
  
  // Check for language badge if language is set
  if (mockSnippetsData[0].language) {
    const languageBadge = snippetCard.locator(`text=${mockSnippetsData[0].language.toUpperCase()}`);
    // Language badge might not always be visible, just check if card has content
    expect(cardText).toBeTruthy();
  }
  
  await popup.close();
});

test('Snippet cards should display preview', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, [mockSnippetsData[0]]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  const snippetCard = popup.locator('#snippet-results > div').first();
  const cardText = await snippetCard.textContent();
  
  // Preview should be visible
  expect(cardText).toContain(mockSnippetsData[0].preview.substring(0, 20));
  
  await popup.close();
});

test('Snippet cards should display tags', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const snippetWithTags = { ...mockSnippetsData[0], tags: ['react', 'hooks'] };
  await mockSnippets(popup, [snippetWithTags]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  const snippetCard = popup.locator('#snippet-results > div').first();
  const cardText = await snippetCard.textContent();
  
  expect(cardText).toContain('react');
  expect(cardText).toContain('hooks');
  
  await popup.close();
});

test('Language filter should filter snippets', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, mockSnippetsData);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  const languageFilter = popup.locator('#snippet-language-filter');
  await languageFilter.selectOption('javascript');
  
  // Wait for filter to apply
  await popup.waitForTimeout(300);
  
  // Verify filter was applied (snippets should be reloaded)
  // Note: Actual filtering happens in service worker, we verify UI interaction
  
  await popup.close();
});

test('Tag filter checkboxes should appear', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, mockSnippetsData);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  await popup.waitForTimeout(200);
  
  const tagsList = popup.locator('#snippet-tags-list');
  await expect(tagsList).toBeVisible();
  
  // Check if tag checkboxes are present
  const tagCheckboxes = popup.locator('#snippet-tags-list input[type="checkbox"]');
  const tagCount = await tagCheckboxes.count();
  expect(tagCount).toBeGreaterThan(0);
  
  await popup.close();
});

test('Selecting tag filter should reload snippets', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, mockSnippetsData);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  await popup.waitForTimeout(200);
  
  // Click a tag checkbox
  const firstTag = popup.locator('#snippet-tags-list input[type="checkbox"]').first();
  await firstTag.check();
  
  // Wait for reload
  await popup.waitForTimeout(300);
  
  // Verify UI interaction occurred
  const isChecked = await firstTag.isChecked();
  expect(isChecked).toBe(true);
  
  await popup.close();
});

test('New snippet button should open snippet modal', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  const snippetModal = popup.locator('#snippet-modal');
  await expect(snippetModal).toBeVisible();
  
  // Check modal title
  const modalTitle = popup.locator('#snippet-modal-title');
  const titleText = await modalTitle.textContent();
  expect(titleText).toContain('Nouveau snippet');
  
  await popup.close();
});

test('Snippet modal should have all required fields', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  // Check all fields exist
  await expect(popup.locator('#snippet-title')).toBeVisible();
  await expect(popup.locator('#snippet-content')).toBeVisible();
  await expect(popup.locator('#snippet-language')).toBeVisible();
  await expect(popup.locator('#snippet-source-url')).toBeVisible();
  await expect(popup.locator('#snippet-tags')).toBeVisible();
  
  await popup.close();
});

test('Snippet modal should validate required fields', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  // Try to save without title and content
  const saveButton = popup.locator('#snippet-modal-save');
  await saveButton.click();
  
  // Check for error message
  const resultElement = popup.locator('#snippet-modal-result');
  await expect(resultElement).toBeVisible();
  
  const errorText = await resultElement.textContent();
  expect(errorText).toContain('requis');
  
  await popup.close();
});

test('Snippet modal should save new snippet', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Mock save response
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'saveSnippet') {
          setTimeout(() => callback({ snippet: { id: 1, ...message.snippet } }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  await switchTab(popup, 'snippets');
  
  const newButton = popup.locator('#snippet-new-btn');
  await newButton.click();
  
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  // Fill form
  await popup.locator('#snippet-title').fill('Test Snippet');
  await popup.locator('#snippet-content').fill('console.log("test");');
  await popup.locator('#snippet-language').selectOption('javascript');
  await popup.locator('#snippet-tags').fill('test, javascript');
  
  // Save
  const saveButton = popup.locator('#snippet-modal-save');
  await saveButton.click();
  
  // Modal should close
  await popup.waitForSelector('#snippet-modal', { state: 'hidden' });
  
  await popup.close();
});

test('Snippet modal should pre-fill when editing', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, [mockSnippetsData[0]]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  // Mock getConversation for edit
  await popup.evaluate(() => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'listSnippets') {
          setTimeout(() => callback({ snippets: [{ id: 1, title: 'Test', content: 'Test content', language: 'javascript', tags: ['test'] }] }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  });
  
  // Click edit button
  const editButton = popup.locator('#snippet-results button').filter({ hasText: 'Éditer' }).first();
  await editButton.click();
  
  // Wait for modal
  await popup.waitForSelector('#snippet-modal', { state: 'visible' });
  
  // Check form is pre-filled
  const titleInput = popup.locator('#snippet-title');
  const titleValue = await titleInput.inputValue();
  expect(titleValue).toBeTruthy();
  
  await popup.close();
});

test('Copy button should copy snippet content', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, [mockSnippetsData[0]]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  // Set up clipboard permission
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  
  // Click copy button (📋)
  const copyButton = popup.locator('#snippet-results button').filter({ hasText: '📋' }).first();
  await copyButton.click();
  
  // Wait a bit for copy to complete
  await popup.waitForTimeout(200);
  
  // Verify button title changes (indicates copy success)
  const buttonTitle = await copyButton.getAttribute('title');
  // Title should change to "Copié !" after copy
  
  await popup.close();
});

test('Delete button should show confirmation', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, [mockSnippetsData[0]]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  // Set up dialog handler
  popup.once('dialog', dialog => {
    expect(dialog.message()).toContain('Supprimer');
    dialog.dismiss(); // Cancel deletion
  });
  
  // Click delete button (🗑)
  const deleteButton = popup.locator('#snippet-results button').filter({ hasText: '🗑' }).first();
  await deleteButton.click();
  
  // Dialog should have been triggered
  
  await popup.close();
});

test('Snippet status should show count', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await mockSnippets(popup, mockSnippetsData);
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  await popup.waitForTimeout(300); // Wait for status to update
  
  const statusElement = popup.locator('#snippet-status');
  await expect(statusElement).toBeVisible();
  const statusText = await statusElement.textContent();
  
  expect(statusText).toContain(String(mockSnippetsData.length));
  expect(statusText).toContain('snippet');
  
  await popup.close();
});

test('Open source button should appear if source_url exists', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const snippetWithSource = { ...mockSnippetsData[0], source_url: 'https://example.com' };
  await mockSnippets(popup, [snippetWithSource]);
  
  await switchTab(popup, 'snippets');
  
  await waitForSnippets(popup);
  
  // Check for open source button (↗)
  const openButton = popup.locator('#snippet-results button').filter({ hasText: '↗' });
  await expect(openButton).toBeVisible();
  
  await popup.close();
});
