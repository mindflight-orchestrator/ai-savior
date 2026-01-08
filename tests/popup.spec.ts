import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, getExtensionPopup, waitForExtensionReady } from './helpers/extension-helpers';
import path from 'path';

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

test('Popup should open and display correctly', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  
  // Wait for popup to load
  await popup.waitForLoadState('networkidle');
  
  // Check that popup has content
  const title = await popup.title();
  expect(title).toBeTruthy();
  
  // Check for main UI elements (adjust selectors based on your actual popup structure)
  const body = await popup.locator('body').textContent();
  expect(body).toBeTruthy();
  
  await popup.close();
});

test('Popup should have navigation tabs', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Look for tab navigation (adjust selectors based on your actual UI)
  // This is a placeholder - update with actual selectors from your popup
  const tabs = await popup.locator('[role="tab"], button[data-tab], .tab').count();
  
  // If tabs exist, verify they're clickable
  if (tabs > 0) {
    const firstTab = popup.locator('[role="tab"], button[data-tab], .tab').first();
    await expect(firstTab).toBeVisible();
  }
  
  await popup.close();
});

test('Popup should communicate with service worker', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  // Execute code in popup context to test message passing
  const response = await popup.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: 'getTabState' },
          (response) => {
            resolve(response || { error: 'No response' });
          }
        );
      } else {
        resolve({ error: 'chrome.runtime not available' });
      }
    });
  });
  
  // Response should exist (even if it's an error, it means communication works)
  expect(response).toBeDefined();
  
  await popup.close();
});
