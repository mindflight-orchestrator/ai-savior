import { Page } from '@playwright/test';

/**
 * Get a tab element by name
 */
export async function getPopupTab(popup: Page, tabName: 'save' | 'search' | 'snippets') {
  return popup.locator(`button[data-tab="${tabName}"]`);
}

/**
 * Switch to a specific tab
 */
export async function switchTab(popup: Page, tabName: 'save' | 'search' | 'snippets') {
  const tab = await getPopupTab(popup, tabName);
  await tab.click();
  // Wait for tab content to be visible
  await popup.waitForSelector(`#${tabName}-tab`, { state: 'visible' });
}

/**
 * Wait for tab state to load (status text changes from "Chargement de l'état…")
 */
export async function waitForTabState(popup: Page, timeout = 5000) {
  const statusText = popup.locator('#save-status-text');
  await statusText.waitFor({ state: 'visible', timeout });
  // Wait until status is not the loading message
  await popup.waitForFunction(
    (loadingText) => {
      const el = document.getElementById('save-status-text');
      return el && el.textContent !== loadingText;
    },
    "Chargement de l'état…",
    { timeout }
  );
}

/**
 * Mock chrome.runtime.sendMessage response for getTabState
 */
export async function mockTabState(popup: Page, state: any) {
  await popup.evaluate((mockState) => {
    // Override chrome.runtime.sendMessage temporarily
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getTabState') {
          setTimeout(() => callback(mockState), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  }, state);
}

/**
 * Mock chrome.runtime.sendMessage response for searchConversations
 */
export async function mockSearchResults(popup: Page, results: any[]) {
  await popup.evaluate((mockResults) => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'searchConversations') {
          setTimeout(() => callback({ results: mockResults }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  }, results);
}

/**
 * Mock chrome.runtime.sendMessage response for getAllTags (search sidebar).
 * Chain after mockSearchResults so both search results and tag sidebar are populated.
 */
export async function mockGetAllTags(popup: Page, tags: string[]) {
  await popup.evaluate((mockTags) => {
    const currentSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getAllTags') {
          setTimeout(() => callback({ tags: mockTags }), 0);
        } else if (currentSendMessage) {
          currentSendMessage(message, callback);
        }
      };
    }
  }, tags);
}

/**
 * Mock chrome.runtime.sendMessage response for listSnippets
 */
export async function mockSnippets(popup: Page, snippets: any[]) {
  await popup.evaluate((mockSnippets) => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'listSnippets') {
          setTimeout(() => callback({ snippets: mockSnippets }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  }, snippets);
}

/**
 * Mock chrome.runtime.sendMessage response for getConversation
 */
export async function mockConversation(popup: Page, conversation: any) {
  await popup.evaluate((mockConv) => {
    const originalSendMessage = (window as any).chrome?.runtime?.sendMessage;
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.sendMessage = (message: any, callback: Function) => {
        if (message.action === 'getConversation') {
          setTimeout(() => callback({ conversation: mockConv }), 0);
        } else if (originalSendMessage) {
          originalSendMessage(message, callback);
        }
      };
    }
  }, conversation);
}

/**
 * Wait for a modal to be visible
 */
export async function waitForModal(popup: Page, modalId: string) {
  await popup.waitForSelector(`#${modalId}`, { state: 'visible' });
}

/**
 * Close a modal by clicking the close button
 */
export async function closeModal(popup: Page, modalId: string) {
  // Map modal IDs to their close button IDs
  const closeButtonMap: Record<string, string> = {
    'preview-modal': 'preview-close',
    'edit-modal': 'edit-close',
    'snippet-modal': 'snippet-modal-close',
  };
  
  const closeButtonId = closeButtonMap[modalId] || `${modalId}-close`;
  const closeButton = popup.locator(`#${closeButtonId}`);
  await closeButton.click();
  await popup.waitForSelector(`#${modalId}`, { state: 'hidden' });
}

/**
 * Get popup body width
 */
export async function getPopupWidth(popup: Page): Promise<number> {
  return await popup.evaluate(() => {
    return document.body.offsetWidth;
  });
}

/**
 * Check if popup has large-view class
 */
export async function hasLargeView(popup: Page): Promise<boolean> {
  return await popup.evaluate(() => {
    return document.body.classList.contains('large-view');
  });
}

/**
 * Wait for search results to render
 */
export async function waitForSearchResults(popup: Page) {
  await popup.waitForSelector('#search-results', { state: 'visible' });
}

/**
 * Wait for snippets to load
 */
export async function waitForSnippets(popup: Page) {
  await popup.waitForSelector('#snippet-results', { state: 'visible' });
}
