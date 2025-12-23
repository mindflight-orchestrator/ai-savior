/**
 * Content Script - Conversation Extractor
 * Extracts conversation content from AI platforms using XPath
 */

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === '__ping') {
    sendResponse({ ok: true, domain: window.location.hostname });
    return false;
  }
  if (message.action === 'extractConversation') {
    extractConversation()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Indicates we will send a response asynchronously
  }
  if (message.action === 'showFlashNotice') {
    // Dynamically import flash notice (to avoid loading if not needed)
    import('../lib/ui/flash-notice').then(({ showBeastModeSaved, showFlashNotice }) => {
      if (message.type === 'beastModeSaved') {
        showBeastModeSaved(message.source, message.version);
      } else {
        showFlashNotice({
          message: message.message,
          type: message.noticeType || 'success',
          duration: message.duration || 5000,
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }
  return false;
});

/**
 * Extract conversation from current page
 */
async function extractConversation(): Promise<any> {
  // Get configured XPaths for current domain
  const domain = window.location.hostname;
  const settings = await chrome.storage.local.get(['xpaths_by_domain']);
  const xpaths = settings.xpaths_by_domain?.[domain];

  // Built-in defaults (minimal) so the extension works out-of-the-box
  // Note: these selectors may need adjustment over time.
  const defaultsByDomain: Record<string, { title: 'documentTitle' | 'xpath'; conversation?: string; message?: string }> = {
    'chat.openai.com': {
      title: 'documentTitle',
      // ChatGPT messages container often has data-message-author-role
      message: '//div[@data-message-author-role]',
      // optional: conversation root (not used right now)
      conversation: '//title',
    },
    'chatgpt.com': {
      title: 'documentTitle',
      message: '//div[@data-message-author-role]',
      conversation: '//title',
    },
    'www.chatgpt.com': {
      title: 'documentTitle',
      message: '//div[@data-message-author-role]',
      conversation: '//title',
    },
  };

  try {
    const defaults = defaultsByDomain[domain];
    const title = defaults?.title === 'documentTitle'
      ? document.title?.trim()
      : (xpaths?.conversation ? extractTitle(xpaths.conversation) : null);

    const messageXPath = xpaths?.message || defaults?.message;
    if (!messageXPath) {
      return { error: `No extractor configured for domain: ${domain}` };
    }

    // Extract content (using message XPath)
    const content = extractContent(messageXPath);

    return {
      title: title || 'Untitled Conversation',
      content: content || '',
      description: generateDescription(content),
    };
  } catch (error) {
    console.error('Error extracting conversation:', error);
    return {
      error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract title from page
 */
function extractTitle(xpath: string): string | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );

    const node = result.singleNodeValue;
    if (node) {
      return node.textContent?.trim() || null;
    }
    return null;
  } catch (error) {
    console.error('Error extracting title:', error);
    return null;
  }
}

/**
 * Extract content from page
 */
function extractContent(xpath: string): string {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const messages: string[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const node = result.snapshotItem(i);
      if (node?.textContent) {
        messages.push(node.textContent.trim());
      }
    }

    return messages.join('\n\n');
  } catch (error) {
    console.error('Error extracting content:', error);
    return '';
  }
}

/**
 * Generate description from content (first 200 characters)
 */
function generateDescription(content: string): string {
  if (!content) return '';
  return content.substring(0, 200).trim() + (content.length > 200 ? '...' : '');
}
