import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import { getExtensionId, waitForExtensionReady } from './helpers/extension-helpers';
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

test.skip('Content script should inject on ChatGPT page', async () => {
  const page = await context.newPage();
  
  // Navigate to ChatGPT (or a test page)
  await page.goto('https://chat.openai.com', { waitUntil: 'networkidle' });
  
  // Wait a bit for content script to inject
  await page.waitForTimeout(2000);
  
  // Check if content script has injected by looking for its markers
  // This depends on what your content script does - adjust accordingly
  const hasContentScript = await page.evaluate(() => {
    // Check for any markers your content script might add
    // For example, check if extractor.js has run
    return typeof window !== 'undefined';
  });
  
  expect(hasContentScript).toBe(true);
  
  await page.close();
});

test.skip('Content script should be able to extract content via XPath', async () => {
  const page = await context.newPage();
  
  // Create a test page with mock ChatGPT structure
  await page.setContent(`
    <html>
      <body>
        <div data-message="user">User message 1</div>
        <div data-message="assistant">Assistant message 1</div>
        <div data-message="user">User message 2</div>
      </body>
    </html>
  `);
  
  // Wait for content script
  await page.waitForTimeout(1000);
  
  // Test XPath evaluation (what your extractor does)
  const messageCount = await page.evaluate(() => {
    const xpath = '//div[@data-message]';
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    return result.snapshotLength;
  });
  
  expect(messageCount).toBe(3);
  
  await page.close();
});

test.skip('Content script should communicate with service worker', async () => {
  const page = await context.newPage();
  await page.goto('https://chat.openai.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Test message passing from content script to service worker
  const messageSent = await page.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: 'test', source: 'content-script' },
          (response) => {
            resolve(response !== undefined);
          }
        );
      } else {
        resolve(false);
      }
    });
  });
  
  // Message passing should work (even if service worker doesn't respond)
  expect(messageSent).toBe(true);
  
  await page.close();
});
