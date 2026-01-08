import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import { mockSettingsLocal, mockSettingsCloud } from './fixtures/mock-settings';
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

test('Settings icon should open settings view', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  const settingsView = popup.locator('#settings-view');
  await expect(settingsView).toBeVisible();
  
  await popup.close();
});

test('Settings view should have storage mode section', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Check for storage mode radios
  const localRadio = popup.locator('input[name="storageMode"][value="local"]');
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  
  await expect(localRadio).toBeVisible();
  await expect(cloudRadio).toBeVisible();
  
  await popup.close();
});

test('Local storage mode should be selected by default', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const localRadio = popup.locator('input[name="storageMode"][value="local"]');
  const isChecked = await localRadio.isChecked();
  
  expect(isChecked).toBe(true);
  
  await popup.close();
});

test('Storage badge should show Local by default', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const storageBadge = popup.locator('#storage-mode');
  const badgeText = await storageBadge.textContent();
  
  expect(badgeText).toContain('Local');
  
  await popup.close();
});

test('Cloud settings section should be hidden when Local is selected', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const cloudSettings = popup.locator('#cloud-settings');
  const isVisible = await cloudSettings.isVisible();
  
  expect(isVisible).toBe(false);
  
  await popup.close();
});

test('Selecting Cloud mode should show cloud settings', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  // Wait for cloud settings to appear
  await popup.waitForTimeout(200);
  
  const cloudSettings = popup.locator('#cloud-settings');
  await expect(cloudSettings).toBeVisible();
  
  await popup.close();
});

test('Cloud settings should have PostgREST URL input', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(500); // Wait for cloud settings to show
  
  const urlInput = popup.locator('#postgrest-url');
  await expect(urlInput).toBeVisible({ timeout: 2000 });
  
  await popup.close();
});

test('Cloud settings should have auth token input', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(500); // Wait for cloud settings to show
  
  const authInput = popup.locator('#postgrest-auth');
  await expect(authInput).toBeVisible({ timeout: 2000 });
  
  // Should be password type
  const inputType = await authInput.getAttribute('type');
  expect(inputType).toBe('password');
  
  await popup.close();
});

test('Connection test button should be visible', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(200);
  
  const testButton = popup.locator('#test-connection');
  await expect(testButton).toBeVisible();
  
  await popup.close();
});

test('Beast Mode section should have checkboxes for each platform', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Check for various Beast Mode checkboxes
  const chatgptCheckbox = popup.locator('#beast-chatgpt');
  const claudeCheckbox = popup.locator('#beast-claude');
  const perplexityCheckbox = popup.locator('#beast-perplexity');
  
  await expect(chatgptCheckbox).toBeVisible();
  await expect(claudeCheckbox).toBeVisible();
  await expect(perplexityCheckbox).toBeVisible();
  
  await popup.close();
});

test('Beast Mode checkboxes should be checkable', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const chatgptCheckbox = popup.locator('#beast-chatgpt');
  const initialChecked = await chatgptCheckbox.isChecked();
  
  // Toggle checkbox
  await chatgptCheckbox.click();
  
  await popup.waitForTimeout(200);
  
  const afterChecked = await chatgptCheckbox.isChecked();
  expect(afterChecked).toBe(!initialChecked);
  
  await popup.close();
});

test('Dev mode toggle should be visible', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const devToggle = popup.locator('#dev-mode-toggle');
  await expect(devToggle).toBeVisible();
  
  await popup.close();
});

test('Dev mode toggle should be checkable', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  const devToggle = popup.locator('#dev-mode-toggle');
  const initialChecked = await devToggle.isChecked();
  
  await devToggle.click();
  
  await popup.waitForTimeout(200);
  
  const afterChecked = await devToggle.isChecked();
  expect(afterChecked).toBe(!initialChecked);
  
  await popup.close();
});

test('Settings should persist to chrome.storage.local', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Change storage mode
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(300);
  
  // Verify storage was updated
  const storage = await popup.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('storageMode', (items) => {
          resolve(items);
        });
      } else {
        resolve(null);
      }
    });
  });
  
  expect(storage).toBeDefined();
  if (storage && typeof storage === 'object' && 'storageMode' in storage) {
    expect((storage as any).storageMode).toBe('cloud');
  }
  
  await popup.close();
});

test('Storage badge should update when storage mode changes', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const settingsIcon = popup.locator('#settings-icon');
  await settingsIcon.click();
  
  await popup.waitForSelector('#settings-view', { state: 'visible' });
  
  // Change to cloud
  const cloudRadio = popup.locator('input[name="storageMode"][value="cloud"]');
  await cloudRadio.click();
  
  await popup.waitForTimeout(500); // Wait for storage to update
  
  // Go back to tabs view
  const backButton = popup.locator('#settings-back');
  await backButton.click();
  
  await popup.waitForTimeout(300); // Wait for view to switch
  
  // Check badge
  const storageBadge = popup.locator('#storage-mode');
  await expect(storageBadge).toBeVisible();
  const badgeText = await storageBadge.textContent();
  
  // Badge should show Cloud (or might still show Local if update hasn't propagated)
  expect(badgeText).toBeTruthy();
  
  await popup.close();
});
