/**
 * Popup main script
 * Handles tab navigation and initialization
 */

type StorageMode = 'local' | 'cloud';

type PopupSettings = {
  storageMode: StorageMode;
  postgrest_url?: string;
  postgrest_auth?: string;
  beast_enabled_per_domain: Record<string, boolean>;
  devModeEnabled: boolean;
};

const DEFAULT_POPUP_SETTINGS: PopupSettings = {
  storageMode: 'local',
  postgrest_url: 'http://localhost:3000',
  postgrest_auth: '',
  beast_enabled_per_domain: {
    'chat.openai.com': true,
    'chatgpt.com': true,
    'www.chatgpt.com': true,
    'claude.ai': true,
    'www.perplexity.ai': true,
    'kimi.moonshot.cn': false,
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
  if (tabName === 'search') {
    body.classList.add('large-view');
  } else {
    body.classList.remove('large-view');
  }
}

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

    // If user opens Search tab, refresh results (use current query)
    if (targetTab === 'search') {
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      runSearch(input?.value ?? '');
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
  const tagsContainer = document.getElementById('search-tags-list');
  if (!tagsContainer) return;

  // Collect all unique tags from results
  const allTags = new Set<string>();
  results.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => allTags.add(tag));
    }
  });

  // Sort tags alphabetically
  const sortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));

  // Clear and rebuild tags list
  tagsContainer.innerHTML = '';

  if (sortedTags.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11px';
    empty.style.color = '#999';
    empty.textContent = 'Aucun tag';
    tagsContainer.appendChild(empty);
    return;
  }

  sortedTags.forEach((tag) => {
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
      } else {
        setSaveResult('✅ Sauvegarde terminée');
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
    'postgrest_url',
    'postgrest_auth',
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
    postgrest_url: settings.postgrest_url,
    postgrest_auth: settings.postgrest_auth,
    beast_enabled_per_domain: settings.beast_enabled_per_domain,
    devModeEnabled: settings.devModeEnabled,
  });
}

function setStorageBadge(mode: StorageMode) {
  const modeBadge = document.getElementById('storage-mode');
  if (modeBadge) modeBadge.textContent = mode === 'cloud' ? 'Cloud' : 'Local';
}

function qs<T extends Element>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

async function initSettingsUI() {
  const settings = await loadSettings();

  // Storage badge
  setStorageBadge(settings.storageMode);

  // Storage mode radios
  const localRadio = qs<HTMLInputElement>('input[name="storageMode"][value="local"]');
  const cloudRadio = qs<HTMLInputElement>('input[name="storageMode"][value="cloud"]');
  const cloudSettings = document.getElementById('cloud-settings') as HTMLElement | null;
  const postgrestUrl = document.getElementById('postgrest-url') as HTMLInputElement | null;
  const postgrestAuth = document.getElementById('postgrest-auth') as HTMLInputElement | null;
  const testBtn = document.getElementById('test-connection') as HTMLButtonElement | null;
  const statusEl = document.getElementById('connection-status') as HTMLElement | null;

  if (localRadio) localRadio.checked = settings.storageMode === 'local';
  if (cloudRadio) cloudRadio.checked = settings.storageMode === 'cloud';
  if (cloudSettings) cloudSettings.style.display = settings.storageMode === 'cloud' ? 'block' : 'none';
  if (postgrestUrl) postgrestUrl.value = settings.postgrest_url ?? '';
  if (postgrestAuth) postgrestAuth.value = settings.postgrest_auth ?? '';

  const applyStorageMode = async (mode: StorageMode) => {
    const next = await loadSettings();
    next.storageMode = mode;
    await saveSettings(next);
    setStorageBadge(mode);
    if (cloudSettings) cloudSettings.style.display = mode === 'cloud' ? 'block' : 'none';
  };

  localRadio?.addEventListener('change', async () => {
    if (localRadio.checked) await applyStorageMode('local');
  });
  cloudRadio?.addEventListener('change', async () => {
    if (cloudRadio.checked) await applyStorageMode('cloud');
  });

  postgrestUrl?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.postgrest_url = postgrestUrl.value.trim();
    await saveSettings(next);
  });
  postgrestAuth?.addEventListener('change', async () => {
    const next = await loadSettings();
    next.postgrest_auth = postgrestAuth.value;
    await saveSettings(next);
  });

  testBtn?.addEventListener('click', async () => {
    if (!statusEl) return;
    statusEl.textContent = 'Test en cours...';
    try {
      const url = (postgrestUrl?.value || 'http://localhost:3000').replace(/\/+$/, '');
      const token = postgrestAuth?.value?.trim();
      const res = await fetch(`${url}/conversations?limit=1`, {
        headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
      });
      if (res.ok) {
        statusEl.textContent = '✅ Connexion réussie';
      } else {
        statusEl.textContent = `❌ Erreur ${res.status}`;
      }
    } catch (e) {
      statusEl.textContent = '❌ Impossible de se connecter (Docker/URL ?)';
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
  if (beastKimi) beastKimi.checked = !!settings.beast_enabled_per_domain['kimi.moonshot.cn'];
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
  beastKimi?.addEventListener('change', () => setBeast('kimi.moonshot.cn', beastKimi.checked));
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
