import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { getPopupTab, switchTab, getPopupWidth, hasLargeView } from './helpers/popup-helpers';
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

test('Popup should have three tabs visible', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const saveTab = await getPopupTab(popup, 'save');
  const searchTab = await getPopupTab(popup, 'search');
  const snippetsTab = await getPopupTab(popup, 'snippets');
  
  await expect(saveTab).toBeVisible();
  await expect(searchTab).toBeVisible();
  await expect(snippetsTab).toBeVisible();
  
  await popup.close();
});

test('Save tab should be active by default', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const saveTab = await getPopupTab(popup, 'save');
  const saveTabContent = popup.locator('#save-tab');
  
  await expect(saveTab).toHaveClass(/active/);
  await expect(saveTabContent).toBeVisible();
  
  await popup.close();
});

test('Clicking Search tab should switch to search view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'search');
  
  const searchTab = await getPopupTab(popup, 'search');
  const searchTabContent = popup.locator('#search-tab');
  const saveTabContent = popup.locator('#save-tab');
  
  await expect(searchTab).toHaveClass(/active/);
  await expect(searchTabContent).toBeVisible();
  await expect(saveTabContent).not.toBeVisible();
  
  await popup.close();
});

test('Clicking Snippets tab should switch to snippets view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  await switchTab(popup, 'snippets');
  
  const snippetsTab = await getPopupTab(popup, 'snippets');
  const snippetsTabContent = popup.locator('#snippets-tab');
  const saveTabContent = popup.locator('#save-tab');
  
  await expect(snippetsTab).toHaveClass(/active/);
  await expect(snippetsTabContent).toBeVisible();
  await expect(saveTabContent).not.toBeVisible();
  
  await popup.close();
});

test('Only one tab should be active at a time', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const tabs = popup.locator('.tab.active');
  const activeCount = await tabs.count();
  expect(activeCount).toBe(1);
  
  await switchTab(popup, 'search');
  const activeCountAfter = await tabs.count();
  expect(activeCountAfter).toBe(1);
  
  await popup.close();
});

test('Search icon in header should switch to Search tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const searchIcon = popup.locator('#search-icon');
  await searchIcon.click();
  
  const searchTab = await getPopupTab(popup, 'search');
  await expect(searchTab).toHaveClass(/active/);
  
  const searchTabContent = popup.locator('#search-tab');
  await expect(searchTabContent).toBeVisible();
  
  await popup.close();
});

test('Settings icon should open settings view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  const settingsView = popup.locator('#settings-view');
  const tabsBar = popup.locator('#tabs');
  
  await expect(settingsView).toBeVisible();
  await expect(tabsBar).not.toBeVisible();
  
  await popup.close();
});

test('Settings back button should return to tabs view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Open settings
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Go back
  const backButton = popup.locator('#settings-back');
  await backButton.click();
  
  const settingsView = popup.locator('#settings-view');
  const tabsBar = popup.locator('#tabs');
  
  await expect(settingsView).not.toBeVisible();
  await expect(tabsBar).toBeVisible();
  
  await popup.close();
});

test('Window should resize to large view when Search tab is active', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Default size (Save tab)
  const defaultWidth = await getPopupWidth(popup);
  expect(defaultWidth).toBeLessThanOrEqual(400);
  
  const hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(false);
  
  // Switch to Search tab
  await switchTab(popup, 'search');
  
  // Wait a bit for transition
  await popup.waitForTimeout(300);
  
  const searchWidth = await getPopupWidth(popup);
  expect(searchWidth).toBeGreaterThan(400);
  
  const hasLargeAfter = await hasLargeView(popup);
  expect(hasLargeAfter).toBe(true);
  
  await popup.close();
});

test('Window should return to small view when leaving Search tab', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Go to Search tab (large view)
  await switchTab(popup, 'search');
  await popup.waitForTimeout(300);
  
  let hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(true);
  
  // Switch back to Save tab
  await switchTab(popup, 'save');
  await popup.waitForTimeout(300);
  
  hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(false);
  
  const width = await getPopupWidth(popup);
  expect(width).toBeLessThanOrEqual(400);
  
  await popup.close();
});

test('Settings view should use small view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Open settings
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const hasLarge = await hasLargeView(popup);
  expect(hasLarge).toBe(false);
  
  const width = await getPopupWidth(popup);
  expect(width).toBeLessThanOrEqual(400);
  
  await popup.close();
});
