import type { StorageProvider } from '../../types/storage-provider';
import type { Conversation } from '../../types/conversation';
import type { Snippet } from '../../types/snippet';
import type { Collection } from '../../types/collection';
import type { Settings } from '../../types/settings';
import type { SearchFilters, SnippetFilters } from '../../types/search-filters';
import type { BackupData, ImportOptions, ImportResult } from '../../types/backup';
import { openDatabase } from './indexeddb-schema';
import { initializeDefaultSettings } from './indexeddb-utils';

/**
 * Normalize text for search: remove extra whitespace, normalize line breaks, trim
 * This ensures that text selections with different formatting (multiple spaces, line breaks)
 * can still match the stored content.
 */
function normalizeTextForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\r\n/g, ' ')      // Replace Windows line breaks with space
    .replace(/\n/g, ' ')         // Replace Unix line breaks with space
    .replace(/\r/g, ' ')         // Replace old Mac line breaks with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim();                     // Remove leading/trailing spaces
}

/**
 * IndexedDB Storage Provider
 * Implements StorageProvider interface for local storage mode
 */
export class IndexedDBProvider implements StorageProvider {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = openDatabase();
    // Initialize default settings on first run
    this.dbPromise.then(() => initializeDefaultSettings());
  }

  private async getDB(): Promise<IDBDatabase> {
    return this.dbPromise;
  }

  // ========== Conversations ==========

  async getConversationByUrl(canonicalUrl: string): Promise<Conversation | null> {
    const db = await this.getDB();
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const index = store.index('by-url');

    return new Promise((resolve, reject) => {
      const request = index.get(canonicalUrl);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Convert Date strings back to Date objects
          resolve({
            ...result,
            created_at: new Date(result.created_at),
            updated_at: new Date(result.updated_at),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    const db = await this.getDB();
    // Check if exists by URL
    const existing = await this.getConversationByUrl(conversation.canonical_url);

    if (existing) {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');

      // Update existing conversation
      const updated: Conversation = {
        ...existing,
        ...conversation,
        id: existing.id, // Preserve ID
        version: existing.version + 1, // Increment version
        updated_at: new Date(),
        ignore: existing.ignore, // Preserve ignore flag
        created_at: existing.created_at, // Preserve creation date
      };

      return new Promise((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
      });
    } else {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');

      // Create new conversation
      const created: Conversation = {
        ...conversation,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        ignore: conversation.ignore ?? false,
      };

      return new Promise((resolve, reject) => {
        const request = store.add(created);
        request.onsuccess = () => {
          created.id = request.result as number;
          resolve(created);
        };
        request.onerror = () => reject(request.error);
      });
    }
  }

  async searchConversations(
    query: string,
    filters?: SearchFilters
  ): Promise<Conversation[]> {
    const db = await this.getDB();
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const index = store.index('by-updated');

    // Load recent conversations (limit 1000 for initial implementation)
    const all: Conversation[] = await new Promise((resolve, reject) => {
      const results: Conversation[] = [];
      const request = index.openCursor(null, 'prev'); // Newest first

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < 1000) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
            updated_at: new Date(value.updated_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Filter in memory
    return all.filter((conv) => {
      // Text search (title, description, content, tags)
      if (query) {
        const normalizedQuery = normalizeTextForSearch(query);
        const normalizedTitle = normalizeTextForSearch(conv.title);
        const normalizedDescription = normalizeTextForSearch(conv.description || '');
        const normalizedContent = normalizeTextForSearch(conv.content);
        const normalizedTags = normalizeTextForSearch(conv.tags.join(' '));
        
        const matches =
          normalizedTitle.includes(normalizedQuery) ||
          normalizedDescription.includes(normalizedQuery) ||
          normalizedContent.includes(normalizedQuery) ||
          normalizedTags.includes(normalizedQuery);
          
        if (!matches) return false;
      }

      // Source filter
      if (filters?.source && conv.source !== filters.source) return false;

      // Tag filter
      if (filters?.tags?.length) {
        const hasAllTags = filters.tags.every((tag) => conv.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Collection filter
      if (filters?.collection_id && conv.collection_id !== filters.collection_id) {
        return false;
      }

      return true;
    });
  }

  async deleteConversation(id: number): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Snippets ==========

  async listSnippets(filters?: SnippetFilters): Promise<Snippet[]> {
    const db = await this.getDB();
    const tx = db.transaction('snippets', 'readonly');
    const store = tx.objectStore('snippets');
    const index = store.index('by-created');

    const all: Snippet[] = await new Promise((resolve, reject) => {
      const results: Snippet[] = [];
      const request = index.openCursor(null, 'prev'); // Newest first

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Filter in memory
    return all.filter((snippet) => {
      if (filters?.language && snippet.language !== filters.language) return false;
      if (filters?.source_conversation_id && snippet.source_conversation_id !== filters.source_conversation_id) {
        return false;
      }
      if (filters?.tags?.length) {
        const hasAllTags = filters.tags.every((tag) => snippet.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      return true;
    });
  }

  async saveSnippet(snippet: Snippet): Promise<Snippet> {
    const db = await this.getDB();
    const tx = db.transaction('snippets', 'readwrite');
    const store = tx.objectStore('snippets');

    const saved: Snippet = {
      ...snippet,
      created_at: snippet.created_at || new Date(),
    };

    return new Promise((resolve, reject) => {
      let request: IDBRequest<IDBValidKey>;
      if (saved.id) {
        request = store.put(saved);
      } else {
        request = store.add(saved);
      }

      request.onsuccess = () => {
        if (!saved.id) {
          saved.id = request.result as number;
        }
        resolve(saved);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSnippet(id: number): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('snippets', 'readwrite');
    const store = tx.objectStore('snippets');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Collections ==========

  async listCollections(): Promise<Collection[]> {
    const db = await this.getDB();
    const tx = db.transaction('collections', 'readonly');
    const store = tx.objectStore('collections');

    const all: Collection[] = await new Promise((resolve, reject) => {
      const results: Collection[] = [];
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    return all;
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    const db = await this.getDB();
    const tx = db.transaction('collections', 'readwrite');
    const store = tx.objectStore('collections');

    const saved: Collection = {
      ...collection,
      created_at: collection.created_at || new Date(),
    };

    return new Promise((resolve, reject) => {
      let request: IDBRequest<IDBValidKey>;
      if (saved.id) {
        request = store.put(saved);
      } else {
        request = store.add(saved);
      }

      request.onsuccess = () => {
        if (!saved.id) {
          saved.id = request.result as number;
        }
        resolve(saved);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCollection(id: number): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('collections', 'readwrite');
    const store = tx.objectStore('collections');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Settings ==========

  async getSettings(): Promise<Settings> {
    const db = await this.getDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.get(1);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result as Settings);
        } else {
          // Return defaults if no settings exist
          resolve({
            id: 1,
            storageMode: 'local',
            beast_enabled_per_domain: {},
            selective_mode_enabled: false,
            devModeEnabled: false,
            xpaths_by_domain: {},
          });
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: Settings): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');

    const saved: Settings = {
      ...settings,
      id: 1, // Always ID 1 for settings
    };

    return new Promise((resolve, reject) => {
      const request = store.put(saved);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Backup & Restore ==========

  /**
   * Export all data to BackupData structure
   */
  async exportBackup(): Promise<BackupData> {
    const db = await this.getDB();

    // Read all conversations
    const conversations = await new Promise<Conversation[]>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const results: Conversation[] = [];
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
            updated_at: new Date(value.updated_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Read all snippets
    const snippets = await new Promise<Snippet[]>((resolve, reject) => {
      const tx = db.transaction('snippets', 'readonly');
      const store = tx.objectStore('snippets');
      const results: Snippet[] = [];
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Read all collections
    const collections = await new Promise<Collection[]>((resolve, reject) => {
      const tx = db.transaction('collections', 'readonly');
      const store = tx.objectStore('collections');
      const results: Collection[] = [];
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const value = cursor.value;
          results.push({
            ...value,
            created_at: new Date(value.created_at),
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Read settings
    const settings = await this.getSettings();

    // Convert Date objects to ISO 8601 strings
    const backup: BackupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      conversations: conversations.map(conv => ({
        ...conv,
        created_at: conv.created_at instanceof Date ? conv.created_at : new Date(conv.created_at),
        updated_at: conv.updated_at instanceof Date ? conv.updated_at : new Date(conv.updated_at),
      })),
      snippets: snippets.map(snippet => ({
        ...snippet,
        created_at: snippet.created_at instanceof Date ? snippet.created_at : new Date(snippet.created_at),
      })),
      collections: collections.map(collection => ({
        ...collection,
        created_at: collection.created_at instanceof Date ? collection.created_at : new Date(collection.created_at),
      })),
      settings,
    };

    return backup;
  }

  /**
   * Download backup as JSON file
   */
  async downloadBackup(): Promise<void> {
    const backup = await this.exportBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-saver-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import backup from BackupData
   */
  async importBackup(backup: BackupData, options?: ImportOptions): Promise<ImportResult> {
    const overwrite = options?.overwrite ?? true;
    const skipSettings = options?.skipSettings ?? false;

    const result: ImportResult = {
      created: 0,
      updated: 0,
      errors: 0,
      errors_details: [],
    };

    // Import conversations
    for (const conv of backup.conversations) {
      try {
        const existing = await this.getConversationByUrl(conv.canonical_url);
        if (existing) {
          if (overwrite) {
            await this.saveConversation({
              ...conv,
              id: existing.id,
              version: existing.version + 1,
            });
            result.updated++;
          }
        } else {
          await this.saveConversation(conv);
          result.created++;
        }
      } catch (error) {
        result.errors++;
        result.errors_details?.push(`Conversation ${conv.canonical_url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Import snippets
    for (const snippet of backup.snippets) {
      try {
        await this.saveSnippet(snippet);
        // If snippet has ID, it's an update; otherwise it's a create
        if (snippet.id) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (error) {
        result.errors++;
        result.errors_details?.push(`Snippet ${snippet.title}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Import collections
    for (const collection of backup.collections) {
      try {
        await this.saveCollection(collection);
        if (collection.id) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (error) {
        result.errors++;
        result.errors_details?.push(`Collection ${collection.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Import settings (if not skipped)
    if (!skipSettings && backup.settings) {
      try {
        await this.saveSettings(backup.settings);
        result.updated++;
      } catch (error) {
        result.errors++;
        result.errors_details?.push(`Settings: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  // ========== Tags ==========

  async getAllTags(): Promise<string[]> {
    const db = await this.getDB();
    const allTags = new Set<string>();

    // Get tags from conversations
    const conversationsTx = db.transaction('conversations', 'readonly');
    const conversationsStore = conversationsTx.objectStore('conversations');
    
    await new Promise<void>((resolve, reject) => {
      const request = conversationsStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const conv = cursor.value as Conversation;
          if (Array.isArray(conv.tags)) {
            conv.tags.forEach((tag) => allTags.add(tag));
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Get tags from snippets
    const snippetsTx = db.transaction('snippets', 'readonly');
    const snippetsStore = snippetsTx.objectStore('snippets');
    
    await new Promise<void>((resolve, reject) => {
      const request = snippetsStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const snippet = cursor.value as Snippet;
          if (Array.isArray(snippet.tags)) {
            snippet.tags.forEach((tag) => allTags.add(tag));
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    return Array.from(allTags).sort((a, b) => a.localeCompare(b));
  }

  // ========== Database Management ==========

  async clearDatabase(): Promise<void> {
    const db = await this.getDB();
    const objectStoreNames = ['conversations', 'snippets', 'collections', 'settings'];
    
    // Clear each object store
    for (const storeName of objectStoreNames) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    // Reinitialize default settings after clearing
    await initializeDefaultSettings();
  }
}
