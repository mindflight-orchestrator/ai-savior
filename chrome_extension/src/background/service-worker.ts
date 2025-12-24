/**
 * Service Worker - Central Hub
 * Coordinates communication between popup, content scripts, and storage
 */

import type { StorageProvider } from '../lib/storage/storage-provider';
import { createStorageProvider } from '../lib/storage/storage-provider';
import type { Settings } from '../types/settings';
import type { Conversation } from '../types/conversation';
import { detectSourceFromUrl, normalizeUrl, getDomainFromUrl } from './url-detector';

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Saver extension installed');
});

// Provider cache - invalidated when settings change
let providerCache: StorageProvider | null = null;
let providerSettingsHash: string | null = null;

/**
 * Get storage provider based on current settings
 * Caches provider instance until settings change
 */
async function getProvider(): Promise<StorageProvider> {
  // Load settings from chrome.storage.local
  const settingsData = await chrome.storage.local.get([
    'storageMode',
    'backend_url',
    'api_key',
    'disable_local_cache',
    'beast_enabled_per_domain',
    'selective_mode_enabled',
    'devModeEnabled',
    'xpaths_by_domain',
  ]);

  // Create settings hash to detect changes
  const settingsHash = JSON.stringify({
    storageMode: settingsData.storageMode,
    backend_url: settingsData.backend_url,
    api_key: settingsData.api_key ? '***' : undefined, // Don't include actual key in hash
    disable_local_cache: settingsData.disable_local_cache,
  });

  // Return cached provider if settings haven't changed
  if (providerCache !== null && providerSettingsHash === settingsHash) {
    return providerCache;
  }

  // Convert chrome.storage format to Settings interface
  const settings: Settings = {
    id: 1,
    storageMode: settingsData.storageMode || 'local',
    backend_url: settingsData.backend_url,
    api_key: settingsData.api_key,
    disable_local_cache: settingsData.disable_local_cache ?? false,
    beast_enabled_per_domain: settingsData.beast_enabled_per_domain || {},
    selective_mode_enabled: settingsData.selective_mode_enabled ?? false,
    devModeEnabled: settingsData.devModeEnabled ?? false,
    xpaths_by_domain: settingsData.xpaths_by_domain || {},
  };

  // Create new provider
  providerCache = createStorageProvider(settings);
  providerSettingsHash = settingsHash;

  return providerCache;
}

// Tab state cache
const tabStateCache = new Map<number, any>();

// Beast Mode: Debouncing to avoid too frequent saves
const beastModeDebounce = new Map<number, NodeJS.Timeout>();

// Badge animation state
let badgeAnimationTimeout: NodeJS.Timeout | null = null;
let badgeAnimationCount = 0;

/**
 * Check if Beast Mode is enabled for a given domain
 * Reads from chrome.storage.local (where popup saves settings)
 */
async function isBeastEnabledForDomain(domain: string): Promise<boolean> {
  try {
    // Read from chrome.storage.local (synced with popup settings)
    const result = await chrome.storage.local.get(['beast_enabled_per_domain']);
    const beastEnabledPerDomain = result.beast_enabled_per_domain || {};
    
    // Fallback to IndexedDB if not in chrome.storage.local (backward compatibility)
    if (!result.beast_enabled_per_domain) {
      const provider = await getProvider();
      const settings = await provider.getSettings();
      return settings.beast_enabled_per_domain[domain] === true;
    }
    
    return beastEnabledPerDomain[domain] === true;
  } catch (error) {
    console.error('[Beast Mode] Error checking Beast Mode settings:', error);
    return false;
  }
}

/**
 * Show animated green badge on extension icon when Beast Mode saves
 * Creates a pulsing/flashing green badge animation
 */
function showBeastModeBadgeAnimation(): void {
  // Clear any existing animation
  if (badgeAnimationTimeout) {
    clearTimeout(badgeAnimationTimeout);
  }

  badgeAnimationCount = 0;
  const maxPulses = 3; // Number of pulses
  const pulseDuration = 200; // ms per pulse (on/off)

  function animate(): void {
    if (badgeAnimationCount >= maxPulses * 2) {
      // Animation complete, clear badge
      chrome.action.setBadgeText({ text: '' });
      badgeAnimationTimeout = null;
      return;
    }

    if (badgeAnimationCount % 2 === 0) {
      // Show badge (green with checkmark)
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green-500
    } else {
      // Hide badge (flash effect)
      chrome.action.setBadgeText({ text: '' });
    }

    badgeAnimationCount++;
    badgeAnimationTimeout = setTimeout(animate, pulseDuration);
  }

  // Start animation
  animate();
}

/**
 * Process Beast Mode automatic save for a tab
 */
async function processBeastMode(tabId: number, url: string): Promise<void> {
  // Clear existing debounce for this tab
  const existingTimeout = beastModeDebounce.get(tabId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Debounce: wait 2 seconds before processing (to avoid saving during page load)
  const timeoutId = setTimeout(async () => {
    try {
      console.log('[Beast Mode] Processing tab', tabId, 'URL:', url);
      const domain = getDomainFromUrl(url);
      if (!domain) {
        console.log('[Beast Mode] Invalid URL, skipping');
        return; // Invalid URL
      }
      console.log('[Beast Mode] Domain:', domain);

      // Check if Beast Mode is enabled for this domain
      const beastEnabled = await isBeastEnabledForDomain(domain);
      console.log('[Beast Mode] Enabled for domain?', beastEnabled);
      if (!beastEnabled) {
        console.log('[Beast Mode] Beast Mode disabled for this domain, skipping');
        return; // Beast Mode disabled for this domain
      }

      const source = detectSourceFromUrl(url);
      console.log('[Beast Mode] Source:', source);
      if (source === 'other') {
        console.log('[Beast Mode] Unsupported source, skipping');
        return; // Unsupported source
      }

      const canonical_url = normalizeUrl(url);

      // Check if conversation exists and if it should be ignored
      const provider = await getProvider();
      const existing = await provider.getConversationByUrl(canonical_url);
      if (existing?.ignore === true) {
        return; // Conversation is ignored, skip auto-save
      }

      // Ensure content script is injected
      try {
        console.log('[Beast Mode] Ensuring content script is injected...');
        await ensureContentScript(tabId);
        console.log('[Beast Mode] Content script ready');
      } catch (e) {
        // Content script injection failed, skip (will be retried on next tab update)
        console.warn('[Beast Mode] Content script not available for tab', tabId, e);
        return;
      }

      // Extract conversation from page
      let extracted;
      try {
        console.log('[Beast Mode] Extracting conversation...');
        extracted = await chrome.tabs.sendMessage(tabId, { action: 'extractConversation' });
        console.log('[Beast Mode] Extraction result:', extracted ? 'success' : 'empty');
      } catch (e) {
        // Message failed (page might be loading), skip
        console.warn('[Beast Mode] Failed to extract conversation for tab', tabId, e);
        return;
      }

      if (extracted?.error) {
        console.warn('[Beast Mode] Extraction error for tab', tabId, extracted.error);
        return;
      }

      // Prepare conversation object
      const title = extracted.title || 'Untitled Conversation';
      const content = extracted.content || '';
      const description = extracted.description || '';

      const conv: Conversation = {
        canonical_url,
        share_url: extracted.shareUrl,
        source,
        title,
        description,
        content,
        tags: existing?.tags || [], // Preserve existing tags if updating
        collection_id: existing?.collection_id, // Preserve collection if updating
        ignore: existing?.ignore ?? false, // Preserve ignore flag
        version: existing ? existing.version + 1 : 1, // Increment version if updating
        created_at: existing?.created_at || new Date(), // Preserve creation date if updating
        updated_at: new Date(),
      };

      // Save conversation (provider handles create/update logic)
      console.log('[Beast Mode] Saving conversation...');
      const saved = await provider.saveConversation(conv);
      console.log('[Beast Mode] ✅ Auto-saved conversation', saved.id, saved.canonical_url);

      // Show flash notice on the page
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showFlashNotice',
          type: 'beastModeSaved',
          source: saved.source,
          version: saved.version,
        });
      } catch (e) {
        console.warn('[Beast Mode] Failed to show flash notice:', e);
      }

      // Update tab state cache
      tabStateCache.set(tabId, {
        known: true,
        ignore: saved.ignore,
        version: saved.version,
        lastUpdated: saved.updated_at.toISOString(),
      });
    } catch (error) {
      console.error('[Beast Mode] ❌ Error processing auto-save for tab', tabId, error);
    } finally {
      beastModeDebounce.delete(tabId);
    }
  }, 2000); // 2 seconds debounce

  beastModeDebounce.set(tabId, timeoutId);
}

// Listen for tab updates (URL changes, page loads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when URL is available and page is fully loaded
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    console.log('[Beast Mode] Tab updated:', tabId, tab.url);
    processBeastMode(tabId, tab.url);
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.startsWith('http')) {
      console.log('[Beast Mode] Tab activated:', activeInfo.tabId, tab.url);
      processBeastMode(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error('Error processing activated tab:', error);
  }
});

// Listen for settings changes to invalidate provider cache
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Check if any storage-related settings changed
    const storageKeys = ['storageMode', 'backend_url', 'api_key', 'disable_local_cache'];
    const hasStorageChange = storageKeys.some(key => key in changes);
    
    if (hasStorageChange) {
      console.log('[Service Worker] Storage settings changed, invalidating provider cache');
      providerCache = null;
      providerSettingsHash = null;
    }
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  // Handle different message types
  switch (message.action) {
    case 'getTabState':
      handleGetTabState(sender.tab?.id, sendResponse);
      return true; // Indicates we will send a response asynchronously

    case 'saveConversation':
      handleSaveConversation(message.payload, sendResponse);
      return true;

    case 'searchConversations':
      handleSearchConversations(message.query, message.filters, sendResponse);
      return true;

    case 'toggleIgnore':
      handleToggleIgnore(message.canonicalUrl, message.ignore, sendResponse);
      return true;

    case 'extractConversation':
      handleExtractConversation(sender.tab?.id, sendResponse);
      return true;

    case 'getConversation':
      handleGetConversation(message.id, sendResponse);
      return true;

    case 'updateConversation':
      handleUpdateConversation(message.id, message.payload, sendResponse);
      return true;

    case 'deleteConversation':
      handleDeleteConversation(message.id, sendResponse);
      return true;

    case 'listSnippets':
      handleListSnippets(message.filters, sendResponse);
      return true;

    case 'saveSnippet':
      handleSaveSnippet(message.snippet, sendResponse);
      return true;

    case 'deleteSnippet':
      handleDeleteSnippet(message.id, sendResponse);
      return true;

    case 'listCollections':
      handleListCollections(sendResponse);
      return true;

    default:
      console.warn('Unknown action:', message.action);
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: '__ping' });
    return;
  } catch {
    // Attempt one-shot injection (helps on Brave when site access changed after page load)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content-scripts/extractor.js'],
    });
    // Verify injection
    await chrome.tabs.sendMessage(tabId, { action: '__ping' });
  }
}

// Handle getTabState request
async function handleGetTabState(tabId: number | undefined, sendResponse: (response: any) => void) {
  const effectiveTabId = tabId ?? (await getActiveTabId());
  if (!effectiveTabId) {
    sendResponse({ error: 'No tab ID' });
    return;
  }

  try {
    const tab = await chrome.tabs.get(effectiveTabId);
    if (!tab.url) {
      sendResponse({ error: 'No URL for active tab' });
      return;
    }

    const source = detectSourceFromUrl(tab.url);
    const supported = source !== 'other';
    const canonical_url = normalizeUrl(tab.url);

    if (!supported) {
      sendResponse({
        supported: false,
        source,
        url: tab.url,
        canonical_url,
      });
      return;
    }

    // Check that content script is injected (common Brave permission issue)
    try {
      await ensureContentScript(effectiveTabId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sendResponse({
        supported: true,
        source,
        url: tab.url,
        canonical_url,
        known: false,
        ignore: false,
        version: 0,
        error:
          `Content script non injecté (${msg}). ` +
          `Dans Brave: Extensions → AI Saver → Accès au site → Autoriser sur chatgpt.com.`,
      });
      return;
    }

    const provider = await getProvider();
    const existing = await provider.getConversationByUrl(canonical_url);
    sendResponse({
      supported: true,
      source,
      url: tab.url,
      canonical_url,
      known: !!existing,
      ignore: existing?.ignore ?? false,
      version: existing?.version ?? 0,
      lastUpdated: existing?.updated_at ? new Date(existing.updated_at).toISOString() : undefined,
      // Include existing conversation data for form pre-fill
      existingConversation: existing ? {
        title: existing.title,
        description: existing.description || '',
        tags: existing.tags || [],
      } : undefined,
    });
  } catch (error) {
    console.error('Error getting tab state:', error);
    sendResponse({ error: 'Failed to get tab state' });
  }
}

// Handle saveConversation request
async function handleSaveConversation(payload: any, sendResponse: (response: any) => void) {
  try {
    const tabId = await getActiveTabId();
    if (!tabId) {
      sendResponse({ error: 'No active tab' });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) {
      sendResponse({ error: 'No URL for active tab' });
      return;
    }

    const source = detectSourceFromUrl(tab.url);
    if (source === 'other') {
      sendResponse({ error: 'Unsupported URL (source unknown)' });
      return;
    }

    const canonical_url = normalizeUrl(tab.url);

    // Ask content script to extract
    try {
      await ensureContentScript(tabId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sendResponse({
        error:
          `Content script non injecté (${msg}). ` +
          `Dans Brave: Extensions → AI Saver → Accès au site → Autoriser sur chatgpt.com, puis recharger la page.`,
      });
      return;
    }

    const extracted = await chrome.tabs.sendMessage(tabId, { action: 'extractConversation' });
    if (extracted?.error) {
      sendResponse({ error: extracted.error });
      return;
    }

    const titleOverride = typeof payload?.title === 'string' ? payload.title.trim() : '';
    const descOverride = typeof payload?.description === 'string' ? payload.description.trim() : '';
    const tagsOverride = Array.isArray(payload?.tags) ? payload.tags.filter((t: any) => typeof t === 'string') : [];

    const title = titleOverride || extracted.title || 'Untitled Conversation';
    const content = extracted.content || '';
    const description = descOverride || extracted.description || '';

    const conv: Conversation = {
      canonical_url,
      share_url: extracted.shareUrl,
      source,
      title,
      description,
      content,
      tags: tagsOverride,
      collection_id: undefined,
      ignore: false,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const provider = await getProvider();
    const saved = await provider.saveConversation(conv);
    sendResponse({ success: true, conversation: saved });
  } catch (error) {
    console.error('Error saving conversation:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle searchConversations request
async function handleSearchConversations(query: string, filters: any, sendResponse: (response: any) => void) {
  try {
    const q = typeof query === 'string' ? query : '';
    const provider = await getProvider();
    const results = await provider.searchConversations(q, filters);
    // Return lightweight data for the popup
    const mapped = results.slice(0, 100).map((c) => ({
      id: c.id,
      canonical_url: c.canonical_url,
      source: c.source,
      title: c.title,
      description: c.description ?? '',
      preview: (c.description && c.description.trim())
        ? c.description.trim()
        : (c.content || '').slice(0, 220).trim(),
      tags: c.tags ?? [],
      updated_at: c.updated_at instanceof Date ? c.updated_at.toISOString() : new Date(c.updated_at).toISOString(),
    }));
    sendResponse({ results: mapped });
  } catch (error) {
    console.error('Error searching conversations:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle toggleIgnore request
async function handleToggleIgnore(canonicalUrl: string, ignore: boolean, sendResponse: (response: any) => void) {
  try {
    // TODO: Update conversation ignore flag
    console.log('Toggle ignore:', canonicalUrl, ignore);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error toggling ignore:', error);
    sendResponse({ error: 'Failed to toggle ignore' });
  }
}

// Handle extractConversation request
async function handleExtractConversation(tabId: number | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No tab ID' });
    return;
  }

  try {
    // Send message to content script to extract conversation
    const response = await chrome.tabs.sendMessage(tabId, { action: 'extractConversation' });
    sendResponse(response);
  } catch (error) {
    console.error('Error extracting conversation:', error);
    sendResponse({ error: 'Failed to extract conversation' });
  }
}

// Handle getConversation request
async function handleGetConversation(id: number | undefined, sendResponse: (response: any) => void) {
  if (!id || typeof id !== 'number') {
    sendResponse({ error: 'Invalid conversation ID' });
    return;
  }

  try {
    // Use provider's getConversationByUrl won't work here, need direct ID lookup
    // For now, search all conversations and find by ID (not optimal but works)
    const provider = await getProvider();
    const all = await provider.searchConversations('', {});
    const conversation = all.find((c) => c.id === id);

    if (!conversation) {
      sendResponse({ error: 'Conversation not found' });
      return;
    }

    sendResponse({ conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle updateConversation request
async function handleUpdateConversation(
  id: number | undefined,
  payload: any,
  sendResponse: (response: any) => void
) {
  if (!id || typeof id !== 'number') {
    sendResponse({ error: 'Invalid conversation ID' });
    return;
  }

  try {
    // Get existing conversation by searching
    const provider = await getProvider();
    const all = await provider.searchConversations('', {});
    const existing = all.find((c) => c.id === id);

    if (!existing) {
      sendResponse({ error: 'Conversation not found' });
      return;
    }

    // Update only allowed fields (title, description, tags)
    const updated: Conversation = {
      ...existing,
      title: typeof payload?.title === 'string' ? payload.title.trim() : existing.title,
      description: typeof payload?.description === 'string' ? payload.description.trim() : existing.description ?? '',
      tags: Array.isArray(payload?.tags) ? payload.tags.filter((t: any) => typeof t === 'string') : existing.tags,
      updated_at: new Date(),
      version: existing.version + 1,
    };

    const saved = await provider.saveConversation(updated);
    sendResponse({ success: true, conversation: saved });
  } catch (error) {
    console.error('Error updating conversation:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle deleteConversation request
async function handleDeleteConversation(id: number | undefined, sendResponse: (response: any) => void) {
  if (!id || typeof id !== 'number') {
    sendResponse({ error: 'Invalid conversation ID' });
    return;
  }

  try {
    const provider = await getProvider();
    await provider.deleteConversation(id);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle listSnippets request
async function handleListSnippets(filters: any, sendResponse: (response: any) => void) {
  try {
    const provider = await getProvider();
    const results = await provider.listSnippets(filters);
    const mapped = results.slice(0, 100).map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      source_url: s.source_url,
      source_conversation_id: s.source_conversation_id,
      tags: s.tags || [],
      language: s.language || '',
      created_at: s.created_at instanceof Date ? s.created_at.toISOString() : new Date(s.created_at).toISOString(),
      preview: (s.content || '').slice(0, 220).trim(),
    }));
    sendResponse({ snippets: mapped });
  } catch (error) {
    console.error('Error listing snippets:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle saveSnippet request
async function handleSaveSnippet(snippet: any, sendResponse: (response: any) => void) {
  try {
    const provider = await getProvider();
    const saved = await provider.saveSnippet({
      ...snippet,
      created_at: snippet.created_at ? new Date(snippet.created_at) : new Date(),
    });
    sendResponse({ success: true, snippet: saved });
  } catch (error) {
    console.error('Error saving snippet:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle deleteSnippet request
async function handleDeleteSnippet(id: number | undefined, sendResponse: (response: any) => void) {
  if (!id || typeof id !== 'number') {
    sendResponse({ error: 'Invalid snippet ID' });
    return;
  }

  try {
    const provider = await getProvider();
    await provider.deleteSnippet(id);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}

// Handle listCollections request
async function handleListCollections(sendResponse: (response: any) => void) {
  try {
    const provider = await getProvider();
    const collections = await provider.listCollections();
    sendResponse({ collections });
  } catch (error) {
    console.error('Error listing collections:', error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  }
}
