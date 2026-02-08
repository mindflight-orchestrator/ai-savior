/**
 * Popup main script
 * Handles tab navigation and initialization
 */

type StorageMode = 'local' | 'cloud';

type PopupSettings = {
  storageMode: StorageMode;
  backend_url?: string;
  api_key?: string;
  disable_local_cache?: boolean;
  beast_enabled_per_domain: Record<string, boolean>;
  devModeEnabled: boolean;
};

const DEFAULT_POPUP_SETTINGS: PopupSettings = {
  storageMode: 'local',
  backend_url: 'http://localhost:8080',
  api_key: '',
  disable_local_cache: false,
  beast_enabled_per_domain: {
    'chat.openai.com': true,
    'chatgpt.com': true,
    'www.chatgpt.com': true,
    'claude.ai': true,
    'www.perplexity.ai': true,
    'kimi.moonshot.cn': false,
    'www.kimi.com': false,
    'kimi.com': false,
    'chat.mistral.ai': true,
    'chat.deepseek.com': true,
    'chat.qwen.ai': true,
    'manus.im': true,
    'grok.com': true,
  },
  devModeEnabled: false,
};

// Tab management
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const settingsView = document.getElementById('settings-view') as HTMLElement | null;
const settingsBackBtn = document.getElementById('settings-back') as HTMLButtonElement | null;
const settingsIconBtn = document.getElementById('settings-icon') as HTMLButtonElement | null;
const tabsBar = document.getElementById('tabs') as HTMLElement | null;

function hideAllTabContents() {
  tabContents.forEach((content) => {
    (content as HTMLElement).style.display = 'none';
  });
}

function updateWindowSize(tabName: string | null) {
  const body = document.body;
  const chatFavicons = document.getElementById('chat-favicons');
  
  // Search and Snippets tabs use large view
  if (tabName === 'search' || tabName === 'snippets') {
    body.classList.add('large-view');
    body.classList.remove('save-mode');
    if (chatFavicons) chatFavicons.classList.remove('hidden');
  } else {
    body.classList.remove('large-view');
    // Hide favicons in save mode if window is small
    if (tabName === 'save') {
      body.classList.add('save-mode');
      // Check if window is small (less than 450px)
      if (window.innerWidth < 450) {
        if (chatFavicons) chatFavicons.classList.add('hidden');
      } else {
        if (chatFavicons) chatFavicons.classList.remove('hidden');
      }
    } else {
      body.classList.remove('save-mode');
      if (chatFavicons) chatFavicons.classList.remove('hidden');
    }
  }
  
  // Update body class for small width detection
  if (window.innerWidth < 450) {
    body.classList.add('small-width');
  } else {
    body.classList.remove('small-width');
  }
}

// Handle window resize to show/hide favicons in save mode
window.addEventListener('resize', () => {
  const activeTab = document.querySelector('.tab.active')?.getAttribute('data-tab');
  const body = document.body;
  const chatFavicons = document.getElementById('chat-favicons');
  
  // Update small-width class
  if (window.innerWidth < 450) {
    body.classList.add('small-width');
  } else {
    body.classList.remove('small-width');
  }
  
  // Update favicons visibility in save mode
  if (activeTab === 'save') {
    if (window.innerWidth < 450) {
      if (chatFavicons) chatFavicons.classList.add('hidden');
    } else {
      if (chatFavicons) chatFavicons.classList.remove('hidden');
    }
  }
});

// Initialize favicons visibility on load (will be called after DOMContentLoaded)
// Handle favicon loading from extension bundle
function initFavicons() {
  const faviconLinks = document.querySelectorAll('.chat-favicon');
  faviconLinks.forEach((link) => {
    const imageElement = link.querySelector('img') as HTMLImageElement;
    if (!imageElement) return;

    const localFile = imageElement.getAttribute('data-local');
    if (!localFile) return;

    imageElement.src = chrome.runtime.getURL(`icons/favicons/${localFile}`);
  });
}

setTimeout(() => {
  const activeTab = document.querySelector('.tab.active')?.getAttribute('data-tab') || 'save';
  updateWindowSize(activeTab);
  // Initialize favicons after DOM is ready
  initFavicons();
}, 0);

function showTabsView() {
  if (settingsView) settingsView.style.display = 'none';
  if (tabsBar) tabsBar.style.display = 'flex';
  hideAllTabContents();

  // Default to currently active tab
  const active = document.querySelector('.tab.active') as HTMLElement | null;
  const targetTab = active?.getAttribute('data-tab') ?? 'save';
  updateWindowSize(targetTab);
  const targetContent = document.getElementById(`${targetTab}-tab`);
  if (targetContent) targetContent.style.display = 'block';
}

function showSettingsView() {
  if (tabsBar) tabsBar.style.display = 'none';
  hideAllTabContents();
  if (settingsView) settingsView.style.display = 'block';
  updateWindowSize(null); // Settings uses small view
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');

    // Update active tab
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // Update window size based on tab
    updateWindowSize(targetTab);

    // Show corresponding content
    if (settingsView) settingsView.style.display = 'none';
    if (tabsBar) tabsBar.style.display = 'flex';
    hideAllTabContents();
    const targetContent = document.getElementById(`${targetTab}-tab`);
    if (targetContent) {
      targetContent.style.display = 'block';
    }

    // If user opens Search tab, refresh results and load all tags for sidebar
    if (targetTab === 'search') {
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      runSearch(input?.value ?? '');
      // Also load all tags for the sidebar filter
      loadAllTagsForSearchSidebar();
    }
    
    // If user opens Save tab, ensure tag autocomplete is initialized
    if (targetTab === 'save') {
      const tagsInput = document.getElementById('save-tags') as HTMLInputElement | null;
      if (tagsInput && !tagAutocompleteContainer) {
        // Re-initialize if not already done
        initTagAutocomplete();
      }
      // Reload tags when opening save tab
      loadAllTagsForAutocomplete();
    }
  });
});

// Header icons
document.getElementById('search-icon')?.addEventListener('click', () => {
  // Switch to search tab
  const searchTab = document.querySelector('[data-tab="search"]') as HTMLElement;
  searchTab?.click();
});

settingsIconBtn?.addEventListener('click', () => {
  showSettingsView();
});
settingsBackBtn?.addEventListener('click', () => {
  showTabsView();
});

// Initialize: Load current tab state
type TabStateResponse = {
  supported?: boolean;
  source?: string;
  canonical_url?: string;
  url?: string;
  known?: boolean;
  ignore?: boolean;
  version?: number;
  lastUpdated?: string;
  error?: string;
  existingConversation?: {
    title: string;
    description: string;
    tags: string[];
  };
};

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function setSaveStatus(text: string) {
  const el = document.getElementById('save-status-text');
  if (el) el.textContent = text;
}

function setSaveResult(text: string) {
  const el = document.getElementById('save-result');
  if (el) el.textContent = text;
}

type SearchResultItem = {
  id?: number;
  canonical_url: string;
  source: string;
  title: string;
  preview: string;
  updated_at: string;
  tags?: string[];
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `il y a ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `il y a ${day}j`;
  return date.toLocaleDateString('fr-FR');
}

function setSearchStatus(text: string) {
  const el = document.getElementById('search-status');
  if (el) el.textContent = text;
}

function renderSearchResults(items: SearchResultItem[]) {
  const root = document.getElementById('search-results');
  if (!root) return;
  root.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.style.color = '#666';
    empty.style.fontSize = '13px';
    empty.textContent = 'Aucun résultat.';
    root.appendChild(empty);
    return;
  }

  for (const item of items) {
    const card = document.createElement('div');
    card.style.border = '1px solid #e0e0e0';
    card.style.borderRadius = '10px';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '6px';
    title.textContent = item.title || '(Sans titre)';

    const preview = document.createElement('div');
    preview.style.fontSize = '12px';
    preview.style.color = '#444';
    preview.style.marginBottom = '8px';
    preview.textContent = (item.preview || '').slice(0, 240);

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.justifyContent = 'space-between';
    meta.style.alignItems = 'center';
    meta.style.fontSize = '11px';
    meta.style.color = '#666';

    const left = document.createElement('div');
    left.textContent = `${String(item.source).toUpperCase()} · ${formatRelativeTime(item.updated_at)}`;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';
    actions.style.alignItems = 'center';

    const btnStyle = {
      border: '1px solid #ddd',
      background: 'white',
      borderRadius: '6px',
      cursor: 'pointer',
      padding: '4px 8px',
      fontSize: '12px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '28px',
      height: '28px',
    };

    // Bouton Ouvrir (carré avec flèche)
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.innerHTML = '↗';
    openBtn.title = 'Ouvrir dans un nouvel onglet';
    Object.assign(openBtn.style, btnStyle);
    openBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await chrome.tabs.create({ url: item.canonical_url });
    });
    actions.appendChild(openBtn);

    // Bouton Copier (copie titre + description + tags + contenu)
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copier le contenu complet';
    Object.assign(copyBtn.style, btnStyle);
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // Load full conversation to get complete content
        chrome.runtime.sendMessage({ action: 'getConversation', id: item.id }, async (response: any) => {
          if (chrome.runtime.lastError || response?.error) {
            console.error('Error loading conversation:', response?.error || chrome.runtime.lastError);
            copyBtn.title = 'Erreur';
            setTimeout(() => {
              copyBtn.title = 'Copier le contenu complet';
            }, 2000);
            return;
          }
          
          const conv = response.conversation;
          if (!conv) {
            copyBtn.title = 'Conversation non trouvée';
            setTimeout(() => {
              copyBtn.title = 'Copier le contenu complet';
            }, 2000);
            return;
          }
          
          // Format: Title, Description, Tags, Content
          const parts: string[] = [];
          if (conv.title) parts.push(`# ${conv.title}`);
          if (conv.description) parts.push(`\n${conv.description}`);
          if (conv.tags && conv.tags.length > 0) {
            parts.push(`\n\nTags: ${conv.tags.join(', ')}`);
          }
          if (conv.content) {
            parts.push(`\n\n${conv.content}`);
          }
          
          const textToCopy = parts.join('\n');
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.title = 'Copié !';
          setTimeout(() => {
            copyBtn.title = 'Copier le contenu complet';
          }, 2000);
        });
      } catch (err) {
        console.error('Failed to copy:', err);
        copyBtn.title = 'Erreur de copie';
        setTimeout(() => {
          copyBtn.title = 'Copier le contenu complet';
        }, 2000);
      }
    });
    actions.appendChild(copyBtn);

    // Bouton NotebookLM
    const notebookBtn = document.createElement('button');
    notebookBtn.type = 'button';
    notebookBtn.innerHTML = '📓';
    notebookBtn.title = 'Ouvrir dans NotebookLM';
    Object.assign(notebookBtn.style, btnStyle);
    notebookBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await chrome.tabs.create({ url: 'https://notebooklm.google.com' });
    });
    actions.appendChild(notebookBtn);

    // Bouton Prévisualiser (œil)
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.innerHTML = '👁';
    previewBtn.title = 'Prévisualiser';
    Object.assign(previewBtn.style, btnStyle);
    previewBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await showPreviewModal(item.id!);
    });
    actions.appendChild(previewBtn);

    // Bouton Éditer
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Éditer';
    editBtn.title = 'Éditer la conversation';
    Object.assign(editBtn.style, { ...btnStyle, fontSize: '11px', padding: '4px 10px' });
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await showEditModal(item.id!);
    });
    actions.appendChild(editBtn);

    // Bouton Supprimer (poubelle)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = 'Supprimer';
    Object.assign(deleteBtn.style, btnStyle);
    deleteBtn.style.color = '#d32f2f';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Supprimer "${item.title}" ?`)) {
        await deleteConversation(item.id!);
      }
    });
    actions.appendChild(deleteBtn);

    meta.appendChild(left);
    meta.appendChild(actions);

    card.appendChild(title);
    card.appendChild(preview);
    card.appendChild(meta);
    root.appendChild(card);
  }
}

let searchDebounce: number | undefined;
let selectedTags: Set<string> = new Set<string>();
let allAvailableTags: string[] = [];

async function runSearch(query: string, tagFilter?: string[]) {
  setSearchStatus('Recherche…');
  const filters: any = { type: 'conversation' };
  if (tagFilter && tagFilter.length > 0) {
    filters.tags = tagFilter;
  }
  chrome.runtime.sendMessage({ action: 'searchConversations', query, filters }, (resp: any) => {
    if (chrome.runtime.lastError) {
      setSearchStatus('❌ Erreur recherche');
      return;
    }
    if (resp?.error) {
      setSearchStatus(`❌ ${resp.error}`);
      return;
    }
    const results: SearchResultItem[] = Array.isArray(resp?.results) ? resp.results : [];
    setSearchStatus(`${results.length} résultat(s)`);
    renderSearchResults(results);
    // Update tags list after search
    updateTagsList(results);
  });
}

function updateTagsList(results: SearchResultItem[]) {
  // This function now only updates the checkbox states based on search results
  // The full tag list is loaded by loadAllTagsForSearchSidebar()
  
  // Collect tags from current results to potentially add new ones
  const resultTags = new Set<string>();
  results.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => resultTags.add(tag));
    }
  });

  // Add any new tags from results to allAvailableTags
  resultTags.forEach((tag) => {
    if (!allAvailableTags.includes(tag)) {
      allAvailableTags.push(tag);
    }
  });
  allAvailableTags.sort((a, b) => a.localeCompare(b));
}

/**
 * Load all tags for the search sidebar filter
 * This shows all available tags, not just those from current search results
 */
function loadAllTagsForSearchSidebar() {
  chrome.runtime.sendMessage({ action: 'getAllTags' }, (response: any) => {
    if (chrome.runtime.lastError || response?.error) {
      console.warn('[Search Sidebar] Error loading tags:', response?.error || chrome.runtime.lastError);
      return;
    }
    const tags = Array.isArray(response?.tags) ? response.tags : [];
    // Update the sidebar with all tags
    renderSearchSidebarTags(tags);
  });
}

/**
 * Render tags in the search sidebar
 */
function renderSearchSidebarTags(tags: string[]) {
  const tagsContainer = document.getElementById('search-tags-list');
  if (!tagsContainer) return;

  // Also update allAvailableTags for autocomplete
  allAvailableTags = tags;

  tagsContainer.innerHTML = '';

  if (tags.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11px';
    empty.style.color = '#999';
    empty.textContent = 'Aucun tag';
    tagsContainer.appendChild(empty);
    return;
  }

  tags.forEach((tag) => {
    const tagItem = document.createElement('div');
    tagItem.style.display = 'flex';
    tagItem.style.alignItems = 'center';
    tagItem.style.gap = '6px';
    tagItem.style.padding = '4px 8px';
    tagItem.style.borderRadius = '4px';
    tagItem.style.cursor = 'pointer';
    tagItem.style.fontSize = '12px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedTags.has(tag);
    checkbox.style.margin = '0';
    checkbox.style.cursor = 'pointer';

    // Apply selected style if already selected
    if (selectedTags.has(tag)) {
      tagItem.style.background = '#e3f2fd';
      tagItem.style.color = '#1976d2';
    }

    const label = document.createElement('label');
    label.textContent = tag;
    label.style.cursor = 'pointer';
    label.style.flex = '1';
    label.style.userSelect = 'none';

    // Toggle selection
    const toggle = () => {
      if (checkbox.checked) {
        selectedTags.add(tag);
        tagItem.style.background = '#e3f2fd';
        tagItem.style.color = '#1976d2';
      } else {
        selectedTags.delete(tag);
        tagItem.style.background = '';
        tagItem.style.color = '';
      }
      // Trigger new search with updated tags
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (input) runSearch(input.value, Array.from(selectedTags));
    };

    checkbox.addEventListener('change', toggle);
    label.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      toggle();
    });
    tagItem.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        toggle();
      }
    });

    tagItem.appendChild(checkbox);
    tagItem.appendChild(label);
    tagsContainer.appendChild(tagItem);
  });
}

function initSearchUI() {
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const clear = document.getElementById('search-clear') as HTMLButtonElement | null;

  const schedule = (q: string) => {
    if (searchDebounce) window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => runSearch(q, Array.from(selectedTags)), 300);
  };

  input?.addEventListener('input', () => {
    schedule(input.value);
    runSearch(input.value, Array.from(selectedTags));
  });
  clear?.addEventListener('click', () => {
    if (input) input.value = '';
    selectedTags.clear();
    runSearch('');
  });
}

function applyTabStateToSaveUI(state: TabStateResponse) {
  const urlEl = document.getElementById('save-url');
  if (urlEl) urlEl.textContent = state.canonical_url || state.url || '';

  const titleInput = document.getElementById('save-title') as HTMLInputElement | null;
  const descriptionInput = document.getElementById('save-description') as HTMLTextAreaElement | null;
  const tagsInput = document.getElementById('save-tags') as HTMLInputElement | null;

  if (state.error) {
    setSaveStatus(`❌ ${state.error}`);
    return;
  }

  if (state.supported === false) {
    setSaveStatus('❓ URL non supportée par Beast Mode (source inconnue).');
    return;
  }

  const source = state.source ? state.source.toUpperCase() : 'UNKNOWN';
  if (state.known && state.existingConversation) {
    const version = state.version ?? 0;
    setSaveStatus(`✅ Conversation détectée (${source}). Déjà sauvegardée. Version ${version}.`);
    
    // Pre-fill form with existing data
    if (titleInput) titleInput.value = state.existingConversation.title || '';
    if (descriptionInput) descriptionInput.value = state.existingConversation.description || '';
    if (tagsInput) tagsInput.value = Array.isArray(state.existingConversation.tags) 
      ? state.existingConversation.tags.join(', ') 
      : '';
  } else {
    setSaveStatus(`✅ URL reconnue (${source}). Pas encore sauvegardée.`);
    // Clear form fields for new conversation
    if (titleInput) titleInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (tagsInput) tagsInput.value = '';
  }
}

async function refreshTabState() {
  setSaveResult('');
  setSaveStatus('Chargement de l’état…');
  chrome.runtime.sendMessage({ action: 'getTabState' }, (response: TabStateResponse) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting tab state:', chrome.runtime.lastError);
      setSaveStatus('❌ Impossible de lire l’état de l’onglet.');
      return;
    }
    console.log('Tab state:', response);
    applyTabStateToSaveUI(response);
  });
}

// Save now button
document.getElementById('save-now')?.addEventListener('click', async () => {
  const title = (document.getElementById('save-title') as HTMLInputElement | null)?.value?.trim() ?? '';
  const description = (document.getElementById('save-description') as HTMLTextAreaElement | null)?.value?.trim() ?? '';
  const tagsRaw = (document.getElementById('save-tags') as HTMLInputElement | null)?.value ?? '';
  const tags = parseTags(tagsRaw);

  setSaveResult('Sauvegarde en cours…');
  chrome.runtime.sendMessage(
    {
      action: 'saveConversation',
      payload: { title, description, tags },
    },
    (response: any) => {
      if (chrome.runtime.lastError) {
        console.error('Error saving conversation:', chrome.runtime.lastError);
        setSaveResult('❌ Erreur: impossible de sauvegarder.');
        return;
      }
      if (response?.error) {
        setSaveResult(`❌ ${response.error}`);
        return;
      }
      const saved = response?.conversation;
      if (saved?.canonical_url) {
        setSaveResult('✅ Conversation sauvegardée');
        refreshTabState();
        // Reload tags to include any new tags from the conversation
        setTimeout(() => {
          loadAllTagsForAutocomplete();
        }, 300);
      } else {
        setSaveResult('✅ Sauvegarde terminée');
        // Reload tags even if save didn't return a conversation
        setTimeout(() => {
          loadAllTagsForAutocomplete();
        }, 300);
      }
    }
  );
});

document.getElementById('save-refresh')?.addEventListener('click', () => {
  refreshTabState();
});

// Preview Modal
const previewModal = document.getElementById('preview-modal') as HTMLElement | null;
const previewClose = document.getElementById('preview-close') as HTMLButtonElement | null;
const previewTitle = document.getElementById('preview-title') as HTMLElement | null;
const previewSource = document.getElementById('preview-source') as HTMLElement | null;
const previewDate = document.getElementById('preview-date') as HTMLElement | null;
const previewUrl = document.getElementById('preview-url') as HTMLElement | null;
const previewDescription = document.getElementById('preview-description') as HTMLElement | null;
const previewTags = document.getElementById('preview-tags') as HTMLElement | null;
const previewContent = document.getElementById('preview-content') as HTMLElement | null;

function closePreviewModal() {
  if (previewModal) previewModal.style.display = 'none';
}

previewClose?.addEventListener('click', closePreviewModal);
previewModal?.addEventListener('click', (e) => {
  if (e.target === previewModal) closePreviewModal();
});

async function showPreviewModal(id: number) {
  if (!previewModal) return;
  previewModal.style.display = 'flex';

  // Load conversation
  chrome.runtime.sendMessage({ action: 'getConversation', id }, (response: any) => {
    if (chrome.runtime.lastError || response?.error) {
      alert(`Erreur: ${response?.error || chrome.runtime.lastError?.message}`);
      closePreviewModal();
      return;
    }

    const conv = response.conversation;
    if (previewTitle) previewTitle.textContent = conv.title || '(Sans titre)';
    if (previewSource) previewSource.textContent = String(conv.source || '').toUpperCase();
    if (previewDate) previewDate.textContent = formatRelativeTime(conv.updated_at);
    if (previewUrl) {
      previewUrl.textContent = conv.canonical_url || '';
      previewUrl.style.cursor = 'pointer';
      previewUrl.onclick = () => chrome.tabs.create({ url: conv.canonical_url });
    }
    if (previewDescription) previewDescription.textContent = conv.description || '(Aucune description)';
    if (previewTags) {
      previewTags.textContent = Array.isArray(conv.tags) && conv.tags.length > 0 ? conv.tags.join(', ') : '(Aucun tag)';
    }
    if (previewContent) previewContent.textContent = conv.content || '(Aucun contenu)';
  });
}

// Edit Modal
const editModal = document.getElementById('edit-modal') as HTMLElement | null;
const editClose = document.getElementById('edit-close') as HTMLButtonElement | null;
const editCancel = document.getElementById('edit-cancel') as HTMLButtonElement | null;
const editSave = document.getElementById('edit-save') as HTMLButtonElement | null;
const editId = document.getElementById('edit-id') as HTMLInputElement | null;
const editTitle = document.getElementById('edit-title') as HTMLInputElement | null;
const editDescription = document.getElementById('edit-description') as HTMLTextAreaElement | null;
const editTags = document.getElementById('edit-tags') as HTMLInputElement | null;
const editResult = document.getElementById('edit-result') as HTMLElement | null;

function closeEditModal() {
  if (editModal) editModal.style.display = 'none';
  if (editResult) editResult.textContent = '';
}

editClose?.addEventListener('click', closeEditModal);
editCancel?.addEventListener('click', closeEditModal);
editModal?.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

async function showEditModal(id: number) {
  if (!editModal) return;
  editModal.style.display = 'flex';

  // Load conversation
  chrome.runtime.sendMessage({ action: 'getConversation', id }, (response: any) => {
    if (chrome.runtime.lastError || response?.error) {
      alert(`Erreur: ${response?.error || chrome.runtime.lastError?.message}`);
      closeEditModal();
      return;
    }

    const conv = response.conversation;
    if (editId) editId.value = String(id);
    if (editTitle) editTitle.value = conv.title || '';
    if (editDescription) editDescription.value = conv.description || '';
    if (editTags) editTags.value = Array.isArray(conv.tags) ? conv.tags.join(', ') : '';
  });
}

editSave?.addEventListener('click', async () => {
  const id = editId?.value ? parseInt(editId.value, 10) : null;
  if (!id || isNaN(id)) {
    if (editResult) editResult.textContent = 'Erreur: ID invalide';
    return;
  }

  const title = editTitle?.value?.trim() || '';
  const description = editDescription?.value?.trim() || '';
  const tagsRaw = editTags?.value || '';
  const tags = parseTags(tagsRaw);

  if (editResult) editResult.textContent = 'Enregistrement...';
  if (editResult) editResult.style.color = '#666';

  chrome.runtime.sendMessage(
    {
      action: 'updateConversation',
      id,
      payload: { title, description, tags },
    },
    (response: any) => {
      if (chrome.runtime.lastError) {
        if (editResult) {
          editResult.textContent = `Erreur: ${chrome.runtime.lastError.message}`;
          editResult.style.color = '#d32f2f';
        }
        return;
      }
      if (response?.error) {
        if (editResult) {
          editResult.textContent = `Erreur: ${response.error}`;
          editResult.style.color = '#d32f2f';
        }
        return;
      }
      if (editResult) {
        editResult.textContent = '✅ Conversation mise à jour';
        editResult.style.color = '#2e7d32';
      }
      // Reload tags to include any new tags from the updated conversation
      setTimeout(() => {
        loadAllTagsForAutocomplete();
      }, 300);
      // Refresh search results after 1s
      setTimeout(() => {
        closeEditModal();
        const input = document.getElementById('search-input') as HTMLInputElement | null;
        if (input) runSearch(input.value);
      }, 1000);
    }
  );
});

async function deleteConversation(id: number) {
  chrome.runtime.sendMessage({ action: 'deleteConversation', id }, (response: any) => {
    if (chrome.runtime.lastError) {
      alert(`Erreur: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (response?.error) {
      alert(`Erreur: ${response.error}`);
      return;
    }
    // Refresh search results
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (input) runSearch(input.value);
  });
}

// Initial load
refreshTabState();

// Search init (safe if tab not visible)
initSearchUI();

async function loadSettings(): Promise<PopupSettings> {
  const raw = await chrome.storage.local.get([
    'storageMode',
    'backend_url',
    'api_key',
    'disable_local_cache',
    'beast_enabled_per_domain',
    'devModeEnabled',
  ]);

  return {
    ...DEFAULT_POPUP_SETTINGS,
    ...raw,
    beast_enabled_per_domain: {
      ...DEFAULT_POPUP_SETTINGS.beast_enabled_per_domain,
      ...(raw.beast_enabled_per_domain ?? {}),
    },
  };
}

async function saveSettings(settings: PopupSettings): Promise<void> {
  await chrome.storage.local.set({
    storageMode: settings.storageMode,
    backend_url: settings.backend_url,
    api_key: settings.api_key,
    disable_local_cache: settings.disable_local_cache,
    beast_enabled_per_domain: settings.beast_enabled_per_domain,
    devModeEnabled: settings.devModeEnabled,
  });
}

function setStorageBadge(mode: StorageMode, disableLocalCache?: boolean, backendUrl?: string) {
  const modeBadge = document.getElementById('storage-mode');
  if (!modeBadge) return;
  
  if (mode === 'local' || !backendUrl) {
    modeBadge.textContent = 'Local';
  } else if (disableLocalCache) {
    modeBadge.textContent = 'Cloud';
  } else {
    modeBadge.textContent = 'Hybrid';
  }
}

function qs<T extends Element>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

async function initSettingsUI() {
  const settings = await loadSettings();

  // Storage badge
  setStorageBadge(settings.storageMode, settings.disable_local_cache, settings.backend_url);

  // Storage mode radios
  const localRadio = qs<HTMLInputElement>('input[name="storageMode"][value="local"]');
  const cloudRadio = qs<HTMLInputElement>('input[name="storageMode"][value="cloud"]');
  const cloudSettings = document.getElementById('cloud-settings') as HTMLElement | null;
  const backendUrl = document.getElementById('backend-url') as HTMLInputElement | null;
  const apiKey = document.getElementById('api-key') as HTMLInputElement | null;
  const disableLocalCache = document.getElementById('disable-local-cache') as HTMLInputElement | null;
  const testBtn = document.getElementById('test-connection') as HTMLButtonElement | null;
  const statusEl = document.getElementById('connection-status') as HTMLElement | null;

  if (localRadio) localRadio.checked = settings.storageMode === 'local';
  if (cloudRadio) cloudRadio.checked = settings.storageMode === 'cloud';
  if (cloudSettings) cloudSettings.style.display = settings.storageMode === 'cloud' ? 'block' : 'none';
  if (backendUrl) backendUrl.value = settings.backend_url ?? '';
  if (apiKey) apiKey.value = settings.api_key ?? '';
  if (disableLocalCache) disableLocalCache.checked = settings.disable_local_cache ?? false;

  // Show import remote button only in cloud mode
  const importRemoteContainer = document.getElementById('import-remote-container') as HTMLElement | null;
  const updateImportRemoteVisibility = () => {
    if (importRemoteContainer) {
      const shouldShow = settings.storageMode === 'cloud' && settings.backend_url;
      importRemoteContainer.style.display = shouldShow ? 'block' : 'none';
    }
  };

  const applyStorageMode = async (mode: StorageMode) => {
    const next = await loadSettings();
    next.storageMode = mode;
    await saveSettings(next);
    setStorageBadge(mode, next.disable_local_cache, next.backend_url);
    if (cloudSettings) cloudSettings.style.display = mode === 'cloud' ? 'block' : 'none';
    // Update settings reference for visibility check
    Object.assign(settings, next);
    updateImportRemoteVisibility();
  };

  localRadio?.addEventListener('change', async () => {
    if (localRadio.checked) await applyStorageMode('local');
  });
  cloudRadio?.addEventListener('change', async () => {
    if (cloudRadio.checked) await applyStorageMode('cloud');
  });

  backendUrl?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.backend_url = backendUrl.value.trim() || undefined;
    await saveSettings(next);
    setStorageBadge(next.storageMode, next.disable_local_cache, next.backend_url);
    // Update settings reference for visibility check
    Object.assign(settings, next);
    updateImportRemoteVisibility();
  });

  // Initial visibility update
  updateImportRemoteVisibility();
  apiKey?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.api_key = apiKey.value.trim() || undefined;
    await saveSettings(next);
  });
  disableLocalCache?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.disable_local_cache = disableLocalCache.checked;
    await saveSettings(next);
    setStorageBadge(next.storageMode, next.disable_local_cache, next.backend_url);
  });

  testBtn?.addEventListener('click', async () => {
    if (!statusEl || !backendUrl) return;
    statusEl.textContent = 'Test en cours...';
    statusEl.style.color = '#444';
    
    const url = backendUrl.value.trim();
    if (!url) {
      statusEl.textContent = '❌ Veuillez entrer une URL';
      statusEl.style.color = '#d32f2f';
      return;
    }
    
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      statusEl.textContent = '❌ URL doit commencer par http:// ou https://';
      statusEl.style.color = '#d32f2f';
      return;
    }
    
    try {
      const { GoBackendProvider } = await import('../lib/storage/go-backend-provider');
      const result = await GoBackendProvider.testConnection(url, apiKey?.value.trim());
      
      if (result.success) {
        statusEl.textContent = `✅ ${result.message}`;
        statusEl.style.color = '#10b981';
      } else {
        statusEl.textContent = `❌ ${result.message}`;
        statusEl.style.color = '#d32f2f';
      }
    } catch (e) {
      statusEl.textContent = '❌ Erreur lors du test de connexion';
      statusEl.style.color = '#d32f2f';
      console.error('Connection test error:', e);
    }
  });

  // Beast toggles
  const beastChatGPT = document.getElementById('beast-chatgpt') as HTMLInputElement | null;
  const beastClaude = document.getElementById('beast-claude') as HTMLInputElement | null;
  const beastPerplexity = document.getElementById('beast-perplexity') as HTMLInputElement | null;
  const beastKimi = document.getElementById('beast-kimi') as HTMLInputElement | null;
  const beastMistral = document.getElementById('beast-mistral') as HTMLInputElement | null;
  const beastDeepSeek = document.getElementById('beast-deepseek') as HTMLInputElement | null;
  const beastQwen = document.getElementById('beast-qwen') as HTMLInputElement | null;
  const beastManus = document.getElementById('beast-manus') as HTMLInputElement | null;
  const beastGrok = document.getElementById('beast-grok') as HTMLInputElement | null;

  const setBeast = async (domain: string, enabled: boolean) => {
    const next = await loadSettings();
    next.beast_enabled_per_domain[domain] = enabled;
    await saveSettings(next);
  };

  if (beastChatGPT) beastChatGPT.checked = !!(settings.beast_enabled_per_domain['chat.openai.com'] || settings.beast_enabled_per_domain['chatgpt.com']);
  if (beastClaude) beastClaude.checked = !!settings.beast_enabled_per_domain['claude.ai'];
  if (beastPerplexity) beastPerplexity.checked = !!settings.beast_enabled_per_domain['www.perplexity.ai'];
  if (beastKimi) beastKimi.checked = !!(settings.beast_enabled_per_domain['kimi.moonshot.cn'] || settings.beast_enabled_per_domain['www.kimi.com'] || settings.beast_enabled_per_domain['kimi.com']);
  if (beastMistral) beastMistral.checked = !!settings.beast_enabled_per_domain['chat.mistral.ai'];
  if (beastDeepSeek) beastDeepSeek.checked = !!settings.beast_enabled_per_domain['chat.deepseek.com'];
  if (beastQwen) beastQwen.checked = !!settings.beast_enabled_per_domain['chat.qwen.ai'];
  if (beastManus) beastManus.checked = !!settings.beast_enabled_per_domain['manus.im'];
  if (beastGrok) beastGrok.checked = !!settings.beast_enabled_per_domain['grok.com'];

  beastChatGPT?.addEventListener('change', () => {
    setBeast('chat.openai.com', beastChatGPT.checked);
    setBeast('chatgpt.com', beastChatGPT.checked);
    setBeast('www.chatgpt.com', beastChatGPT.checked);
  });
  beastClaude?.addEventListener('change', () => setBeast('claude.ai', beastClaude.checked));
  beastPerplexity?.addEventListener('change', () => setBeast('www.perplexity.ai', beastPerplexity.checked));
  beastKimi?.addEventListener('change', () => {
    setBeast('kimi.moonshot.cn', beastKimi.checked);
    setBeast('www.kimi.com', beastKimi.checked);
    setBeast('kimi.com', beastKimi.checked);
  });
  beastMistral?.addEventListener('change', () => setBeast('chat.mistral.ai', beastMistral.checked));
  beastDeepSeek?.addEventListener('change', () => setBeast('chat.deepseek.com', beastDeepSeek.checked));
  beastQwen?.addEventListener('change', () => setBeast('chat.qwen.ai', beastQwen.checked));
  beastManus?.addEventListener('change', () => setBeast('manus.im', beastManus.checked));
  beastGrok?.addEventListener('change', () => setBeast('grok.com', beastGrok.checked));

  // Dev mode
  const devToggle = document.getElementById('dev-mode-toggle') as HTMLInputElement | null;
  if (devToggle) devToggle.checked = settings.devModeEnabled;
  devToggle?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.devModeEnabled = devToggle.checked;
    await saveSettings(next);
  });

  // Backup & Restore
  const exportBackupBtn = document.getElementById('export-backup') as HTMLButtonElement | null;
  const exportDataLink = document.getElementById('export-data-link') as HTMLAnchorElement | null;
  const importBackupBtn = document.getElementById('import-backup') as HTMLButtonElement | null;
  const backupFileInput = document.getElementById('backup-file-input') as HTMLInputElement | null;
  const backupStatus = document.getElementById('backup-status') as HTMLElement | null;
  const importBackupRemoteBtn = document.getElementById('import-backup-remote') as HTMLButtonElement | null;

  // Export function (shared by button and link)
  const handleExport = async () => {
    if (!backupStatus) return;
    try {
      backupStatus.textContent = 'Export en cours...';
      backupStatus.style.color = '#444';
      
      // Get provider from service worker
      const response = await chrome.runtime.sendMessage({ action: 'exportBackup' });
      
      if (response.error) {
        backupStatus.textContent = `❌ Erreur: ${response.error}`;
        backupStatus.style.color = '#d32f2f';
      } else {
        backupStatus.textContent = '✅ Backup exporté avec succès';
        backupStatus.style.color = '#10b981';
        setTimeout(() => {
          if (backupStatus) backupStatus.textContent = '';
        }, 3000);
      }
    } catch (error) {
      if (backupStatus) {
        backupStatus.textContent = `❌ Erreur: ${error instanceof Error ? error.message : String(error)}`;
        backupStatus.style.color = '#d32f2f';
      }
    }
  };

  exportBackupBtn?.addEventListener('click', handleExport);
  exportDataLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleExport();
  });

  importBackupBtn?.addEventListener('click', () => {
    backupFileInput?.click();
  });

  backupFileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !backupStatus) return;

    try {
      backupStatus.textContent = 'Import en cours...';
      backupStatus.style.color = '#444';

      const text = await file.text();
      const backup = JSON.parse(text);

      // Validate backup format
      if (!backup.version || !backup.exported_at) {
        throw new Error('Format de backup invalide');
      }

      // Confirm before import
      const confirmed = confirm(
        `Importer le backup du ${new Date(backup.exported_at).toLocaleDateString()}?\n\n` +
        `- ${backup.conversations?.length || 0} conversations\n` +
        `- ${backup.snippets?.length || 0} snippets\n` +
        `- ${backup.collections?.length || 0} collections\n\n` +
        `Les données existantes seront mises à jour si elles existent déjà.`
      );

      if (!confirmed) {
        backupStatus.textContent = '';
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'importBackup',
        backup,
        options: {
          overwrite: true,
          skipSettings: false,
        },
      });

      if (response.error) {
        backupStatus.textContent = `❌ Erreur: ${response.error}`;
        backupStatus.style.color = '#d32f2f';
      } else {
        const result = response.result;
        backupStatus.textContent = `✅ Import réussi: ${result.created} créés, ${result.updated} mis à jour${result.errors > 0 ? `, ${result.errors} erreurs` : ''}`;
        backupStatus.style.color = result.errors > 0 ? '#f59e0b' : '#10b981';
      }
    } catch (error) {
      if (backupStatus) {
        backupStatus.textContent = `❌ Erreur: ${error instanceof Error ? error.message : String(error)}`;
        backupStatus.style.color = '#d32f2f';
      }
    } finally {
      // Reset file input
      if (backupFileInput) backupFileInput.value = '';
    }
  });

  importBackupRemoteBtn?.addEventListener('click', () => {
    if (!backupFileInput || !backupStatus) return;

    // Create a separate file input for remote import to avoid conflicts
    const remoteFileInput = document.createElement('input');
    remoteFileInput.type = 'file';
    remoteFileInput.accept = '.json';
    remoteFileInput.style.display = 'none';

    remoteFileInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !backupStatus) {
        document.body.removeChild(remoteFileInput);
        return;
      }

      try {
        backupStatus.textContent = 'Import vers le serveur en cours...';
        backupStatus.style.color = '#444';

        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup format
        if (!backup.version || !backup.exported_at) {
          throw new Error('Format de backup invalide');
        }

        // Confirm before import
        const confirmed = confirm(
          `Importer le backup vers le serveur distant?\n\n` +
          `- ${backup.conversations?.length || 0} conversations\n` +
          `- ${backup.snippets?.length || 0} snippets\n` +
          `- ${backup.collections?.length || 0} collections\n\n` +
          `Les données existantes seront mises à jour si elles existent déjà.`
        );

        if (!confirmed) {
          backupStatus.textContent = '';
          document.body.removeChild(remoteFileInput);
          return;
        }

        const response = await chrome.runtime.sendMessage({
          action: 'importBackupRemote',
          backup,
        });

        if (response.error) {
          backupStatus.textContent = `❌ Erreur: ${response.error}`;
          backupStatus.style.color = '#d32f2f';
        } else {
          const result = response.result;
          backupStatus.textContent = `✅ Import réussi: ${result.created} créés, ${result.updated} mis à jour${result.errors > 0 ? `, ${result.errors} erreurs` : ''}`;
          backupStatus.style.color = result.errors > 0 ? '#f59e0b' : '#10b981';
        }
      } catch (error) {
        if (backupStatus) {
          backupStatus.textContent = `❌ Erreur: ${error instanceof Error ? error.message : String(error)}`;
          backupStatus.style.color = '#d32f2f';
        }
      } finally {
        document.body.removeChild(remoteFileInput);
      }
    }, { once: true });

    document.body.appendChild(remoteFileInput);
    remoteFileInput.click();
  });
}

// Init settings UI on load
initSettingsUI().catch((e) => console.error('Failed to init settings UI', e));

// Initialize window size on load (default to save tab = small view)
updateWindowSize('save');

// ========== SNIPPETS TAB ==========

type SnippetItem = {
  id?: number;
  title: string;
  content: string;
  source_url?: string;
  source_conversation_id?: number;
  tags: string[];
  language?: string;
  created_at: string;
  preview: string;
};

let selectedSnippetLanguage: string = '';
let selectedSnippetTags: Set<string> = new Set();

// Initialize snippets UI
function initSnippetsUI() {
  const newBtn = document.getElementById('snippet-new-btn');
  const languageFilter = document.getElementById('snippet-language-filter') as HTMLSelectElement | null;
  const modal = document.getElementById('snippet-modal');
  const modalClose = document.getElementById('snippet-modal-close');
  const modalCancel = document.getElementById('snippet-modal-cancel');
  const modalSave = document.getElementById('snippet-modal-save');

  newBtn?.addEventListener('click', () => showSnippetModal());
  modalClose?.addEventListener('click', () => closeSnippetModal());
  modalCancel?.addEventListener('click', () => closeSnippetModal());

  languageFilter?.addEventListener('change', () => {
    selectedSnippetLanguage = languageFilter.value;
    loadSnippets();
  });

  modalSave?.addEventListener('click', async () => {
    await saveSnippetFromModal();
  });

  // Load snippets when tab is opened
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      if (targetTab === 'snippets') {
        loadSnippets();
      }
    });
  });
}

async function loadSnippets() {
  const statusEl = document.getElementById('snippet-status');
  const filters: any = {};
  if (selectedSnippetLanguage) {
    filters.language = selectedSnippetLanguage;
  }
  if (selectedSnippetTags.size > 0) {
    filters.tags = Array.from(selectedSnippetTags);
  }

  if (statusEl) statusEl.textContent = 'Chargement…';

  chrome.runtime.sendMessage({ action: 'listSnippets', filters }, (resp: any) => {
    if (chrome.runtime.lastError) {
      if (statusEl) statusEl.textContent = '❌ Erreur lors du chargement';
      return;
    }
    if (resp?.error) {
      if (statusEl) statusEl.textContent = `❌ ${resp.error}`;
      return;
    }
    const snippets: SnippetItem[] = Array.isArray(resp?.snippets) ? resp.snippets : [];
    if (statusEl) statusEl.textContent = `${snippets.length} snippet(s)`;
    renderSnippets(snippets);
    updateSnippetTagsList(snippets);
  });
}

function renderSnippets(snippets: SnippetItem[]) {
  const root = document.getElementById('snippet-results');
  if (!root) return;
  root.innerHTML = '';

  if (!snippets.length) {
    const empty = document.createElement('div');
    empty.style.color = '#666';
    empty.style.fontSize = '13px';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px 20px';
    empty.innerHTML = 'Aucun snippet.<br><button style="margin-top:12px; padding:8px 16px; border:none; background:#4285f4; color:white; border-radius:6px; cursor:pointer;" id="snippet-empty-new-btn">Créer un snippet</button>';
    const emptyBtn = empty.querySelector('#snippet-empty-new-btn');
    emptyBtn?.addEventListener('click', () => showSnippetModal());
    root.appendChild(empty);
    return;
  }

  for (const snippet of snippets) {
    const card = document.createElement('div');
    card.style.border = '1px solid #e0e0e0';
    card.style.borderRadius = '10px';
    card.style.padding = '12px';
    card.style.marginBottom = '10px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';
    header.style.marginBottom = '8px';

    const left = document.createElement('div');
    left.style.flex = '1';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '4px';
    title.textContent = snippet.title || '(Sans titre)';

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.gap = '8px';
    meta.style.alignItems = 'center';
    meta.style.fontSize = '11px';
    meta.style.color = '#666';

    if (snippet.language) {
      const langBadge = document.createElement('span');
      langBadge.style.background = '#e3f2fd';
      langBadge.style.color = '#1976d2';
      langBadge.style.padding = '2px 8px';
      langBadge.style.borderRadius = '4px';
      langBadge.style.fontSize = '10px';
      langBadge.style.fontWeight = '600';
      langBadge.textContent = snippet.language.toUpperCase();
      meta.appendChild(langBadge);
    }

    meta.appendChild(document.createTextNode(`· ${formatRelativeTime(snippet.created_at)}`));

    left.appendChild(title);
    left.appendChild(meta);
    header.appendChild(left);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';

    const btnStyle = {
      border: '1px solid #ddd',
      background: 'white',
      borderRadius: '6px',
      cursor: 'pointer',
      padding: '4px 8px',
      fontSize: '12px',
      minWidth: '28px',
      height: '28px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    // Bouton Ouvrir source
    if (snippet.source_url) {
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.innerHTML = '↗';
      openBtn.title = 'Ouvrir la source';
      Object.assign(openBtn.style, btnStyle);
      openBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await chrome.tabs.create({ url: snippet.source_url });
      });
      actions.appendChild(openBtn);
    }

    // Bouton Copier
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copier le contenu';
    Object.assign(copyBtn.style, btnStyle);
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(snippet.content);
        copyBtn.title = 'Copié !';
        setTimeout(() => {
          copyBtn.title = 'Copier le contenu';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
    actions.appendChild(copyBtn);

    // Bouton Éditer
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Éditer';
    editBtn.title = 'Éditer le snippet';
    Object.assign(editBtn.style, { ...btnStyle, fontSize: '11px', padding: '4px 10px' });
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await showSnippetModal(snippet);
    });
    actions.appendChild(editBtn);

    // Bouton Supprimer
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = 'Supprimer';
    Object.assign(deleteBtn.style, btnStyle);
    deleteBtn.style.color = '#d32f2f';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Supprimer "${snippet.title}" ?`)) {
        await deleteSnippet(snippet.id!);
      }
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);

    const preview = document.createElement('div');
    preview.style.fontSize = '12px';
    preview.style.color = '#444';
    preview.style.marginTop = '8px';
    preview.style.padding = '8px';
    preview.style.background = '#f5f5f5';
    preview.style.borderRadius = '6px';
    preview.style.fontFamily = 'monospace';
    preview.style.whiteSpace = 'pre-wrap';
    preview.style.maxHeight = '120px';
    preview.style.overflow = 'hidden';
    preview.textContent = snippet.preview || snippet.content || '';

    if (snippet.tags && snippet.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.style.display = 'flex';
      tagsContainer.style.gap = '4px';
      tagsContainer.style.flexWrap = 'wrap';
      tagsContainer.style.marginTop = '8px';
      snippet.tags.forEach((tag) => {
        const tagEl = document.createElement('span');
        tagEl.style.background = '#e0e0e0';
        tagEl.style.color = '#555';
        tagEl.style.padding = '2px 8px';
        tagEl.style.borderRadius = '4px';
        tagEl.style.fontSize = '10px';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      card.appendChild(tagsContainer);
    }

    card.appendChild(header);
    card.appendChild(preview);
    root.appendChild(card);
  }
}

function updateSnippetTagsList(snippets: SnippetItem[]) {
  const tagsContainer = document.getElementById('snippet-tags-list');
  if (!tagsContainer) return;

  const allTags = new Set<string>();
  snippets.forEach((s) => {
    if (s.tags) {
      s.tags.forEach((tag) => allTags.add(tag));
    }
  });

  tagsContainer.innerHTML = '';
  Array.from(allTags)
    .sort()
    .forEach((tag) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.fontSize = '12px';
      label.style.cursor = 'pointer';
      label.style.marginBottom = '4px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag;
      checkbox.checked = selectedSnippetTags.has(tag);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedSnippetTags.add(tag);
        } else {
          selectedSnippetTags.delete(tag);
        }
        loadSnippets();
      });

      const text = document.createTextNode(tag);
      label.appendChild(checkbox);
      label.appendChild(text);
      tagsContainer.appendChild(label);
    });
}

function showSnippetModal(snippet?: SnippetItem) {
  const modal = document.getElementById('snippet-modal');
  const title = document.getElementById('snippet-modal-title');
  const idInput = document.getElementById('snippet-id') as HTMLInputElement | null;
  const titleInput = document.getElementById('snippet-title') as HTMLInputElement | null;
  const contentInput = document.getElementById('snippet-content') as HTMLTextAreaElement | null;
  const languageInput = document.getElementById('snippet-language') as HTMLSelectElement | null;
  const sourceUrlInput = document.getElementById('snippet-source-url') as HTMLInputElement | null;
  const tagsInput = document.getElementById('snippet-tags') as HTMLInputElement | null;

  if (!modal || !title || !idInput || !titleInput || !contentInput || !languageInput || !sourceUrlInput || !tagsInput) return;

  if (snippet) {
    title.textContent = 'Éditer le snippet';
    idInput.value = String(snippet.id || '');
    titleInput.value = snippet.title || '';
    contentInput.value = snippet.content || '';
    languageInput.value = snippet.language || '';
    sourceUrlInput.value = snippet.source_url || '';
    tagsInput.value = snippet.tags?.join(', ') || '';
  } else {
    title.textContent = 'Nouveau snippet';
    idInput.value = '';
    titleInput.value = '';
    contentInput.value = '';
    languageInput.value = '';
    sourceUrlInput.value = '';
    tagsInput.value = '';
  }

  const resultEl = document.getElementById('snippet-modal-result');
  if (resultEl) resultEl.textContent = '';

  modal.style.display = 'flex';
}

function closeSnippetModal() {
  const modal = document.getElementById('snippet-modal');
  if (modal) modal.style.display = 'none';
}

async function saveSnippetFromModal() {
  const idInput = document.getElementById('snippet-id') as HTMLInputElement | null;
  const titleInput = document.getElementById('snippet-title') as HTMLInputElement | null;
  const contentInput = document.getElementById('snippet-content') as HTMLTextAreaElement | null;
  const languageInput = document.getElementById('snippet-language') as HTMLSelectElement | null;
  const sourceUrlInput = document.getElementById('snippet-source-url') as HTMLInputElement | null;
  const tagsInput = document.getElementById('snippet-tags') as HTMLInputElement | null;
  const resultEl = document.getElementById('snippet-modal-result');

  if (!titleInput || !contentInput || !languageInput || !sourceUrlInput || !tagsInput) return;

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    if (resultEl) resultEl.textContent = 'Le titre et le contenu sont requis.';
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const snippet: any = {
    id: idInput?.value ? parseInt(idInput.value, 10) : undefined,
    title,
    content,
    language: languageInput.value || undefined,
    source_url: sourceUrlInput.value.trim() || undefined,
    tags,
    created_at: new Date(),
  };

  if (resultEl) resultEl.textContent = 'Enregistrement…';

  chrome.runtime.sendMessage({ action: 'saveSnippet', snippet }, (resp: any) => {
    if (chrome.runtime.lastError) {
      if (resultEl) resultEl.textContent = '❌ Erreur lors de l\'enregistrement';
      return;
    }
    if (resp?.error) {
      if (resultEl) resultEl.textContent = `❌ ${resp.error}`;
      return;
    }
    closeSnippetModal();
    loadSnippets();
    // Reload tags to include any new tags from the snippet
    setTimeout(() => {
      loadAllTagsForAutocomplete();
    }, 300);
  });
}

async function deleteSnippet(id: number) {
  chrome.runtime.sendMessage({ action: 'deleteSnippet', id }, (resp: any) => {
    if (chrome.runtime.lastError) {
      console.error('Error deleting snippet:', chrome.runtime.lastError);
      return;
    }
    if (resp?.error) {
      alert(`Erreur: ${resp.error}`);
      return;
    }
    loadSnippets();
  });
}

// Init snippets UI on load
initSnippetsUI();

// ========== Tag Autocomplete ==========

// Tag autocomplete functionality for SAVE tab
let tagAutocompleteContainer: HTMLDivElement | null = null;
let currentTagInput: HTMLInputElement | null = null;
let selectedSuggestionIndex = -1;

/**
 * Load all tags from storage to populate autocomplete
 */
async function loadAllTagsForAutocomplete() {
  try {
    chrome.runtime.sendMessage({ action: 'getAllTags' }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.warn('[Tag Autocomplete] Error loading tags:', chrome.runtime.lastError);
        return;
      }
      if (response?.error) {
        console.warn('[Tag Autocomplete] Error loading tags:', response.error);
        return;
      }
      allAvailableTags = Array.isArray(response?.tags) ? response.tags : [];
      console.log('[Tag Autocomplete] Loaded', allAvailableTags.length, 'tags');
    });
  } catch (error) {
    console.warn('[Tag Autocomplete] Error loading tags:', error);
  }
}

function initTagAutocomplete() {
  const tagsInput = document.getElementById('save-tags') as HTMLInputElement | null;
  if (!tagsInput) return;

  // Don't re-initialize if already done
  if (tagAutocompleteContainer) return;

  // Create autocomplete container
  tagAutocompleteContainer = document.createElement('div');
  tagAutocompleteContainer.style.position = 'absolute';
  tagAutocompleteContainer.style.background = 'white';
  tagAutocompleteContainer.style.border = '1px solid #ddd';
  tagAutocompleteContainer.style.borderRadius = '6px';
  tagAutocompleteContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  tagAutocompleteContainer.style.maxHeight = '200px';
  tagAutocompleteContainer.style.overflowY = 'auto';
  tagAutocompleteContainer.style.zIndex = '1000';
  tagAutocompleteContainer.style.display = 'none';

  document.body.appendChild(tagAutocompleteContainer);

  // Add event listeners
  tagsInput.addEventListener('input', handleTagInput);
  tagsInput.addEventListener('keydown', handleTagKeydown);
  tagsInput.addEventListener('blur', () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => {
      if (tagAutocompleteContainer) {
        tagAutocompleteContainer.style.display = 'none';
      }
    }, 150);
  });
  tagsInput.addEventListener('focus', () => {
    const input = tagsInput;
    if (input.value.trim()) {
      showTagSuggestions(input.value.trim());
    }
  });

  // Update container position on resize
  window.addEventListener('resize', updateAutocompletePosition);
}

function updateAutocompletePosition() {
  const tagsInput = document.getElementById('save-tags') as HTMLInputElement | null;
  if (!tagsInput || !tagAutocompleteContainer) return;

  const inputRect = tagsInput.getBoundingClientRect();
  const popupRect = document.body.getBoundingClientRect();
  
  // Position relative to popup, not window
  tagAutocompleteContainer.style.top = (inputRect.bottom - popupRect.top + 2) + 'px';
  tagAutocompleteContainer.style.left = (inputRect.left - popupRect.left) + 'px';
  tagAutocompleteContainer.style.width = inputRect.width + 'px';
}

function handleTagInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const value = input.value;
  const lastCommaIndex = value.lastIndexOf(',');
  const currentTag = lastCommaIndex === -1 ? value : value.substring(lastCommaIndex + 1);
  const trimmedTag = currentTag.trim();

  // Only show suggestions if we have tags loaded
  if (trimmedTag.length > 0 && allAvailableTags.length > 0) {
    showTagSuggestions(trimmedTag);
  } else {
    hideTagSuggestions();
  }
}

function handleTagKeydown(e: KeyboardEvent) {
  if (!tagAutocompleteContainer || tagAutocompleteContainer.style.display === 'none') return;

  const suggestions = tagAutocompleteContainer.querySelectorAll('.tag-suggestion');

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
      updateSuggestionSelection(suggestions);
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSuggestionSelection(suggestions);
      break;
    case 'Enter':
    case 'Tab':
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectTagSuggestion(suggestions[selectedSuggestionIndex] as HTMLElement);
      }
      break;
    case 'Escape':
      hideTagSuggestions();
      selectedSuggestionIndex = -1;
      break;
  }
}

function showTagSuggestions(query: string) {
  if (!tagAutocompleteContainer) {
    console.warn('[Tag Autocomplete] Container not initialized');
    return;
  }

  // Filter available tags
  const filteredTags = allAvailableTags.filter(tag =>
    tag.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10); // Limit to 10 suggestions

  console.log('[Tag Autocomplete] Query:', query, 'Filtered:', filteredTags.length, 'from', allAvailableTags.length);

  if (filteredTags.length === 0) {
    hideTagSuggestions();
    return;
  }

  // Update position before showing
  updateAutocompletePosition();

  // Clear previous suggestions
  tagAutocompleteContainer.innerHTML = '';
  selectedSuggestionIndex = -1;

  // Add new suggestions
  filteredTags.forEach((tag, index) => {
    if (!tagAutocompleteContainer) return;

    const suggestion = document.createElement('div');
    suggestion.className = 'tag-suggestion';
    suggestion.textContent = tag;
    suggestion.style.padding = '8px 12px';
    suggestion.style.cursor = 'pointer';
    suggestion.style.borderBottom = index < filteredTags.length - 1 ? '1px solid #f0f0f0' : 'none';

    suggestion.addEventListener('mouseenter', () => {
      selectedSuggestionIndex = index;
      if (tagAutocompleteContainer) {
        updateSuggestionSelection(tagAutocompleteContainer.querySelectorAll('.tag-suggestion'));
      }
    });

    suggestion.addEventListener('click', () => {
      selectTagSuggestion(suggestion);
    });

    tagAutocompleteContainer.appendChild(suggestion);
  });

  if (tagAutocompleteContainer) {
    tagAutocompleteContainer.style.display = 'block';
  }
}

function hideTagSuggestions() {
  if (tagAutocompleteContainer) {
    tagAutocompleteContainer.style.display = 'none';
    selectedSuggestionIndex = -1;
  }
}

function updateSuggestionSelection(suggestions: NodeListOf<Element>) {
  if (!suggestions) return;

  suggestions.forEach((suggestion, index) => {
    const element = suggestion as HTMLElement;
    if (index === selectedSuggestionIndex) {
      element.style.backgroundColor = '#e3f2fd';
      element.style.color = '#1976d2';
    } else {
      element.style.backgroundColor = '';
      element.style.color = '';
    }
  });
}

function selectTagSuggestion(suggestion: HTMLElement) {
  const tagValue = suggestion.textContent || '';
  const tagsInput = document.getElementById('save-tags') as HTMLInputElement | null;

  if (!tagsInput) return;

  const currentValue = tagsInput.value;
  const lastCommaIndex = currentValue.lastIndexOf(',');
  const prefix = lastCommaIndex === -1 ? '' : currentValue.substring(0, lastCommaIndex + 1) + ' ';
  const newValue = prefix + tagValue + ', ';

  tagsInput.value = newValue;
  tagsInput.focus();

  // Position cursor at end
  const len = newValue.length;
  tagsInput.setSelectionRange(len, len);

  hideTagSuggestions();
}

// Initialize tag autocomplete on page load
// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadAllTagsForAutocomplete();
    initTagAutocomplete();
  });
} else {
  // DOM is already ready
  loadAllTagsForAutocomplete();
  initTagAutocomplete();
}
