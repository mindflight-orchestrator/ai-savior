import { BrowserContext, Page } from '@playwright/test';
import path from 'path';

/**
 * Get the extension ID from the browser context
 * This is needed to access extension pages (popup, service worker, etc.)
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  // Wait a bit for the extension to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get all background pages (service workers in MV3)
  const backgroundPages = context.backgroundPages();
  
  // Try to find the extension's service worker
  for (const page of backgroundPages) {
    const url = page.url();
    if (url.startsWith('chrome-extension://')) {
      return url.split('/')[2];
    }
  }
  
  // Fallback: try to get from service workers
  const serviceWorkers = context.serviceWorkers();
  for (const sw of serviceWorkers) {
    const url = sw.url();
    if (url.startsWith('chrome-extension://')) {
      return url.split('/')[2];
    }
  }
  
  throw new Error('Could not find extension ID. Make sure the extension is loaded.');
}

/**
 * Get the extension popup page
 */
export async function getExtensionPopup(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const popupUrl = `chrome-extension://${extensionId}/src/popup/popup.html`;
  
  // Create a new page and navigate to the popup
  const page = await context.newPage();
  await page.goto(popupUrl);
  
  return page;
}

/**
 * Wait for the extension to be ready
 */
export async function waitForExtensionReady(context: BrowserContext): Promise<void> {
  // Wait for service worker to be registered
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if we have background pages or service workers
  const hasBackground = context.backgroundPages().length > 0 || 
                        context.serviceWorkers().length > 0;
  
  if (!hasBackground) {
    throw new Error('Extension service worker not found');
  }
}

/**
 * Execute code in the extension's service worker context
 * Note: This is limited - service workers are isolated
 */
export async function executeInServiceWorker(
  context: BrowserContext,
  extensionId: string,
  code: string
): Promise<any> {
  const serviceWorkers = context.serviceWorkers();
  
  for (const sw of serviceWorkers) {
    if (sw.url().includes(extensionId)) {
      return await sw.evaluate(code);
    }
  }
  
  throw new Error('Service worker not found');
}

/**
 * Get extension manifest
 */
export async function getExtensionManifest(
  context: BrowserContext,
  extensionId: string
): Promise<any> {
  const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
  const page = await context.newPage();
  
  try {
    await page.goto(manifestUrl);
    const manifestText = await page.textContent('body');
    return JSON.parse(manifestText || '{}');
  } finally {
    await page.close();
  }
}
