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
    'www.kimi.com': {
      title: 'documentTitle',
      // Use special extraction for Kimi
      message: '__kimi_special__',
      conversation: '//title',
    },
    'kimi.com': {
      title: 'documentTitle',
      // Use special extraction for Kimi
      message: '__kimi_special__',
      conversation: '//title',
    },
    'chat.deepseek.com': {
      title: 'documentTitle',
      // DeepSeek messages container
      message: '//*[@id="root"]/div/div/div[2]/div[3]/div/div[2]/div/div[2]/div[1]',
      conversation: '//title',
    },
    'chat.mistral.ai': {
      title: 'documentTitle',
      // Mistral messages container
      message: '/html/body/main/div/div[1]/div/main/div/div/div/div/div[2]/div/div[2]/div[1]/div/div/div/div/div[1]/div[1]/div/div/div[1]',
      conversation: '//title',
    },
    'chat.qwen.ai': {
      title: 'documentTitle',
      // Qwen messages container
      message: '//*[@id="chat-message-container"]',
      conversation: '//title',
    },
    'manus.im': {
      title: 'documentTitle',
      // Manus messages container
      message: '//*[@id="manus-home-page-session-content"]',
      conversation: '//title',
    },
    'grok.com': {
      title: 'documentTitle',
      // Grok messages container
      message: '/html/body/div[2]/div[2]/div/div/main/div[2]/div[2]/div',
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

    // Extract content (using message XPath or special handler)
    let content: string;
    if (messageXPath === '__kimi_special__') {
      content = extractKimiContent();
    } else {
      content = extractContent(messageXPath);
    }

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
      if (node) {
        // For Kimi, try to extract text content more comprehensively
        // by getting text from the node and its children, excluding button text
        const text = extractTextFromNode(node);
        if (text) {
          messages.push(text);
        }
      }
    }

    return messages.join('\n\n');
  } catch (error) {
    console.error('Error extracting content:', error);
    return '';
  }
}

/**
 * Extract text from a node, excluding buttons and UI elements
 */
function extractTextFromNode(node: Node): string {
  if (!node) return '';
  
  // Clone the node to avoid modifying the original
  const clone = node.cloneNode(true) as Element;
  
  // Remove buttons, icons, and other UI elements
  const uiSelectors = ['button', '[role="button"]', 'svg', '.icon', '[class*="icon"]', '[class*="button"]'];
  uiSelectors.forEach(selector => {
    try {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch (e) {
      // Ignore selector errors
    }
  });
  
  return clone.textContent?.trim() || '';
}

/**
 * Special extraction for Kimi.com
 * Tries to find all conversation messages or extract from copy button container
 */
function extractKimiContent(): string {
  try {
    // Strategy 1: Try to find the specific container mentioned by user (contains copy button)
    const specificXPath = '//*[@id="page-layout-container"]/div/div[2]/div/div/div/div[1]/div/div[4]/div/div[2]/div/div[3]/div/div[1]';
    const specificResult = document.evaluate(
      specificXPath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    if (specificResult.snapshotLength > 0) {
      const messages: string[] = [];
      for (let i = 0; i < specificResult.snapshotLength; i++) {
        const node = specificResult.snapshotItem(i);
        if (node) {
          const text = extractTextFromNode(node);
          if (text && text.length > 10) {
            messages.push(text);
          }
        }
      }
      if (messages.length > 0) {
        return messages.join('\n\n');
      }
    }
    
    // Strategy 2: Try to find parent container and extract all message-like divs
    const containerXPath = '//*[@id="page-layout-container"]/div/div[2]/div/div/div/div[1]/div/div[4]/div/div[2]/div/div[3]';
    const containerResult = document.evaluate(
      containerXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    
    const container = containerResult.singleNodeValue as Element;
    if (container) {
      // Find all divs that look like messages (have substantial text content)
      const allDivs = container.querySelectorAll('div');
      const messages: string[] = [];
      const seenTexts = new Set<string>();
      
      for (const div of Array.from(allDivs)) {
        // Skip if it's mostly buttons/icons
        if (div.querySelectorAll('button, svg').length > 0 && div.textContent && div.textContent.trim().length < 50) {
          continue;
        }
        
        const text = extractTextFromNode(div);
        // Only include if it has substantial content and we haven't seen it
        if (text && text.length > 20 && !seenTexts.has(text)) {
          messages.push(text);
          seenTexts.add(text);
        }
      }
      
      if (messages.length > 0) {
        return messages.join('\n\n');
      }
      
      // Fallback: extract all text from the container
      const containerText = extractTextFromNode(container);
      if (containerText && containerText.length > 20) {
        return containerText;
      }
    }
    
    // Strategy 3: Try to find all containers with similar structure (all messages in conversation)
    // Look for all divs at the same level as the copy button container
    const allContainersXPath = '//*[@id="page-layout-container"]/div/div[2]/div/div/div/div[1]/div/div[4]/div/div[2]/div/div[3]/div';
    const allContainersResult = document.evaluate(
      allContainersXPath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    if (allContainersResult.snapshotLength > 0) {
      const allMessages: string[] = [];
      for (let i = 0; i < allContainersResult.snapshotLength; i++) {
        const node = allContainersResult.snapshotItem(i);
        if (node) {
          const text = extractTextFromNode(node);
          if (text && text.length > 20) {
            allMessages.push(text);
          }
        }
      }
      if (allMessages.length > 0) {
        return allMessages.join('\n\n');
      }
    }
    
    // Last resort: try to find any text content in the main conversation area
    const conversationArea = document.querySelector('[id="page-layout-container"]');
    if (conversationArea) {
      const text = extractTextFromNode(conversationArea);
      if (text && text.length > 50) {
        return text;
      }
    }
    
    console.warn('[Kimi] Could not extract conversation content - no matching elements found');
    return '';
  } catch (error) {
    console.error('Error extracting Kimi content:', error);
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
