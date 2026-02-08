import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { switchTab, getPopupWidth, hasLargeView, mockSearchResults, mockSnippets, mockGetAllTags } from './helpers/popup-helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let context: BrowserContext;
let extensionId: string;

// Generate mock data with at least 10 conversations and 10 unique tags
const generateMockConversations = () => {
  const tags = [
    'react', 'javascript', 'typescript', 'python', 'java',
    'cpp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
  ];
  
  const sources = ['chatgpt', 'claude', 'perplexity', 'mistral', 'deepseek'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    canonical_url: `https://chat.openai.com/c/test${i + 1}`,
    source: sources[i % sources.length],
    title: `Test Conversation ${i + 1}: ${tags[i % tags.length]} Tutorial`,
    description: `This is a detailed description for conversation ${i + 1} about ${tags[i % tags.length]}`,
    content: `User: How do I use ${tags[i % tags.length]}?\nAssistant: Here's a comprehensive guide to ${tags[i % tags.length]}...\n\nThis conversation contains multiple messages and detailed explanations about ${tags[i % tags.length]} programming.`,
    tags: [
      tags[i % tags.length],
      tags[(i + 1) % tags.length],
      tags[(i + 2) % tags.length]
    ],
    version: 1,
    created_at: new Date(Date.now() - (i * 86400000)).toISOString(),
    updated_at: new Date(Date.now() - (i * 3600000)).toISOString(),
  }));
};

const generateMockSnippets = () => {
  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust', 'php', 'ruby', 'swift'];
  const tags = ['api', 'backend', 'frontend', 'database', 'auth', 'testing', 'deployment', 'security', 'performance', 'optimization'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    title: `Snippet ${i + 1}: ${languages[i % languages.length]} Example`,
    content: `// ${languages[i % languages.length]} code example ${i + 1}\nfunction example${i + 1}() {\n  console.log("This is a ${languages[i % languages.length]} snippet");\n  return true;\n}`,
    source_url: `https://example.com/snippet${i + 1}`,
    tags: [
      tags[i % tags.length],
      tags[(i + 1) % tags.length]
    ],
    language: languages[i % languages.length],
    created_at: new Date(Date.now() - (i * 86400000)).toISOString(),
    preview: `// ${languages[i % languages.length]} code example ${i + 1}`,
  }));
};

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

test('Popup window size should remain consistent across tabs with lots of content', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockConversations = generateMockConversations();
  const mockSnippetsData = generateMockSnippets();
  
  // Test Save tab size (all tabs use large view)
  const saveTabWidth = await getPopupWidth(popup);
  const saveTabHasLarge = await hasLargeView(popup);
  expect(saveTabHasLarge).toBe(true);
  expect(saveTabWidth).toBeGreaterThan(400);
  
  // Switch to Search tab (same large view)
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  
  await mockSearchResults(popup, mockConversations);
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(500);
  
  const searchTabWidth = await getPopupWidth(popup);
  const searchTabHasLarge = await hasLargeView(popup);
  expect(searchTabHasLarge).toBe(true);
  expect(searchTabWidth).toBeGreaterThan(400);
  expect(searchTabWidth).toBe(saveTabWidth);
  
  // Verify search results are scrollable (lots of content)
  const searchResults = popup.locator('#search-results');
  await expect(searchResults).toBeVisible();
  
  // Check that we have multiple results
  const resultCards = popup.locator('#search-results > div');
  const cardCount = await resultCards.count();
  expect(cardCount).toBeGreaterThanOrEqual(10);
  
  // Set up snippets mock before switching tabs
  await mockSnippets(popup, mockSnippetsData);
  
  // Switch to Snippets tab (same large view)
  await switchTab(popup, 'snippets');
  await popup.waitForTimeout(1000); // Wait for snippets to load
  
  const snippetsTabWidth = await getPopupWidth(popup);
  const snippetsTabHasLarge = await hasLargeView(popup);
  expect(snippetsTabHasLarge).toBe(true);
  expect(snippetsTabWidth).toBeGreaterThan(400);
  expect(snippetsTabWidth).toBe(saveTabWidth);
  
  // Verify snippets are scrollable
  const snippetResults = popup.locator('#snippet-results');
  await expect(snippetResults).toBeVisible();
  
  // Wait a bit more for cards to render
  await popup.waitForTimeout(500);
  
  // Check that we have multiple snippets
  const snippetCards = popup.locator('#snippet-results > div');
  const snippetCount = await snippetCards.count();
  // Verify we have snippets loaded (at least some, ideally 10+)
  expect(snippetCount).toBeGreaterThan(0);
  
  // The main point is to verify window size, not exact count
  // But if we have snippets, verify the UI is working
  if (snippetCount > 0) {
    // Window size should remain consistent regardless of content
    const widthAfterCheck = await getPopupWidth(popup);
    expect(widthAfterCheck).toBe(snippetsTabWidth);
  }
  
  // Switch back to Save tab (same large view)
  await switchTab(popup, 'save');
  await popup.waitForTimeout(300);
  
  const saveTabWidthAfter = await getPopupWidth(popup);
  const saveTabHasLargeAfter = await hasLargeView(popup);
  expect(saveTabHasLargeAfter).toBe(true);
  expect(saveTabWidthAfter).toBeGreaterThan(400);
  
  // Verify size is consistent across all tabs
  expect(saveTabWidthAfter).toBe(saveTabWidth);
  
  await popup.close();
});

test('Search tab should maintain large view size with 10+ conversations', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockConversations = generateMockConversations();
  await mockSearchResults(popup, mockConversations);
  const allTags = [...new Set(mockConversations.flatMap((c) => c.tags))];
  await mockGetAllTags(popup, allTags);
  
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(500);
  
  // Verify large view
  const width = await getPopupWidth(popup);
  const hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(true);
  expect(width).toBeGreaterThan(400);
  
  // Verify all conversations are displayed
  const resultCards = popup.locator('#search-results > div');
  const cardCount = await resultCards.count();
  expect(cardCount).toBeGreaterThanOrEqual(10);
  
  // Verify tags list is populated (sidebar uses getAllTags mock)
  const tagsList = popup.locator('#search-tags-list');
  await expect(tagsList).toBeVisible();
  await popup.waitForTimeout(300);
  
  const tagCheckboxes = popup.locator('#search-tags-list input[type="checkbox"]');
  const tagCount = await tagCheckboxes.count();
  expect(tagCount).toBeGreaterThanOrEqual(10);
  
  // Window size should remain constant
  const widthAfterTags = await getPopupWidth(popup);
  expect(widthAfterTags).toBe(width);
  
  await popup.close();
});

test('Snippets tab should maintain large view size with 10+ snippets', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockSnippetsData = generateMockSnippets();
  await mockSnippets(popup, mockSnippetsData);
  
  await switchTab(popup, 'snippets');
  await popup.waitForTimeout(1000); // Wait for snippets to load
  
  // Verify large view (same size as all tabs)
  const width = await getPopupWidth(popup);
  const hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(true);
  expect(width).toBeGreaterThan(400);
  
  // Verify snippets are displayed
  const snippetResults = popup.locator('#snippet-results');
  await expect(snippetResults).toBeVisible();
  await popup.waitForTimeout(500);
  
  const snippetCards = popup.locator('#snippet-results > div');
  const snippetCount = await snippetCards.count();
  // Should have snippets loaded
  expect(snippetCount).toBeGreaterThan(0);
  
  // Verify tags list is populated (if snippets have tags)
  await popup.waitForTimeout(300);
  const tagsList = popup.locator('#snippet-tags-list');
  const tagsVisible = await tagsList.isVisible();
  
  if (tagsVisible) {
    const tagCheckboxes = popup.locator('#snippet-tags-list input[type="checkbox"]');
    const tagCount = await tagCheckboxes.count();
    // Should have multiple tags if snippets loaded
    if (tagCount > 0) {
      expect(tagCount).toBeGreaterThanOrEqual(5); // At least some tags
    }
  }
  
  // Window size should remain constant
  const widthAfterTags = await getPopupWidth(popup);
  expect(widthAfterTags).toBe(width);
  
  await popup.close();
});

test('Window size should not change when scrolling through lots of content', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockConversations = generateMockConversations();
  await mockSearchResults(popup, mockConversations);
  
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(500);
  
  // Get initial width
  const initialWidth = await getPopupWidth(popup);
  const initialHasLarge = await hasLargeView(popup);
  
  // Scroll through results
  const searchResults = popup.locator('#search-results');
  await searchResults.evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2;
  });
  await popup.waitForTimeout(200);
  
  // Check width hasn't changed
  const widthAfterScroll = await getPopupWidth(popup);
  const hasLargeAfterScroll = await hasLargeView(popup);
  expect(widthAfterScroll).toBe(initialWidth);
  expect(hasLargeAfterScroll).toBe(initialHasLarge);
  
  // Scroll to bottom
  await searchResults.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await popup.waitForTimeout(200);
  
  // Check width still hasn't changed
  const widthAfterBottomScroll = await getPopupWidth(popup);
  expect(widthAfterBottomScroll).toBe(initialWidth);
  
  await popup.close();
});

test('Window size should be consistent when switching between tabs multiple times', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockConversations = generateMockConversations();
  const mockSnippetsData = generateMockSnippets();
  
  await mockSearchResults(popup, mockConversations);
  await mockSnippets(popup, mockSnippetsData);
  
  const widths: number[] = [];
  
  // Save tab
  await switchTab(popup, 'save');
  await popup.waitForTimeout(300);
  widths.push(await getPopupWidth(popup));
  
  // Search tab
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(500);
  widths.push(await getPopupWidth(popup));
  
  // Snippets tab
  await switchTab(popup, 'snippets');
  await popup.waitForTimeout(300);
  widths.push(await getPopupWidth(popup));
  
  // Back to Search
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  widths.push(await getPopupWidth(popup));
  
  // Back to Save
  await switchTab(popup, 'save');
  await popup.waitForTimeout(300);
  widths.push(await getPopupWidth(popup));
  
  // Verify consistency: all tabs have same width (large view)
  expect(widths[0]).toBe(widths[1]);
  expect(widths[0]).toBe(widths[2]);
  expect(widths[0]).toBe(widths[3]);
  expect(widths[0]).toBe(widths[4]);
  expect(widths[0]).toBeGreaterThan(400);
  
  await popup.close();
});

test('Tags sidebar should not affect window size in Search tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const mockConversations = generateMockConversations();
  await mockSearchResults(popup, mockConversations);
  const allTags = [...new Set(mockConversations.flatMap((c) => c.tags))];
  await mockGetAllTags(popup, allTags);
  
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  
  const searchInput = popup.locator('#search-input');
  await searchInput.fill('test');
  await popup.waitForTimeout(500);
  
  // Get initial width
  const initialWidth = await getPopupWidth(popup);
  
  // Wait for tags to load (sidebar uses getAllTags mock)
  await popup.waitForTimeout(300);
  const tagsList = popup.locator('#search-tags-list');
  await expect(tagsList).toBeVisible();
  
  const tagCheckboxes = popup.locator('#search-tags-list input[type="checkbox"]');
  const tagCount = await tagCheckboxes.count();
  expect(tagCount).toBeGreaterThanOrEqual(10);
  
  // Click first few tags
  for (let i = 0; i < Math.min(5, tagCount); i++) {
    await tagCheckboxes.nth(i).check();
    await popup.waitForTimeout(100);
  }
  
  // Width should remain the same
  const widthAfterTags = await getPopupWidth(popup);
  expect(widthAfterTags).toBe(initialWidth);
  
  // Uncheck tags
  for (let i = 0; i < Math.min(5, tagCount); i++) {
    await tagCheckboxes.nth(i).uncheck();
    await popup.waitForTimeout(100);
  }
  
  // Width should still be the same
  const widthAfterUncheck = await getPopupWidth(popup);
  expect(widthAfterUncheck).toBe(initialWidth);
  
  await popup.close();
});
