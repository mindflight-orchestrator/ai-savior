import { test, expect, chromium, BrowserContext } from '@playwright/test';
import { getExtensionId, waitForExtensionReady, getExtensionManifest } from './helpers/extension-helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  // Launch browser with extension loaded
  const extensionPath = path.resolve(__dirname, '../chrome_extension/dist');
  
  context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions don't work in headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  
  // Wait for extension to be ready
  await waitForExtensionReady(context);
  
  // Get extension ID
  extensionId = await getExtensionId(context);
  
  console.log(`Extension loaded with ID: ${extensionId}`);
});

test.afterAll(async () => {
  await context.close();
});

test('Extension should load successfully', async () => {
  // Verify extension is loaded by checking manifest
  const manifest = await getExtensionManifest(context, extensionId);
  
  expect(manifest.name).toBe('AI Saver');
  expect(manifest.version).toBeDefined();
  expect(manifest.manifest_version).toBe(3);
});

test('Extension should have correct permissions', async () => {
  const manifest = await getExtensionManifest(context, extensionId);
  
  expect(manifest.permissions).toContain('storage');
  expect(manifest.permissions).toContain('tabs');
  expect(manifest.permissions).toContain('scripting');
  expect(manifest.permissions).toContain('activeTab');
});

test('Extension should have content scripts configured', async () => {
  const manifest = await getExtensionManifest(context, extensionId);
  
  expect(manifest.content_scripts).toBeDefined();
  expect(manifest.content_scripts.length).toBeGreaterThan(0);
  expect(manifest.content_scripts[0].matches).toContain('https://chat.openai.com/*');
});

test('Extension should have service worker configured', async () => {
  const manifest = await getExtensionManifest(context, extensionId);
  
  expect(manifest.background).toBeDefined();
  expect(manifest.background.service_worker).toBe('src/background/service-worker.js');
  expect(manifest.background.type).toBe('module');
});
