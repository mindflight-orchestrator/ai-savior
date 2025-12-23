import type { StorageProvider } from '../../types/storage-provider';
import type { Conversation } from '../../types/conversation';
import type { Snippet } from '../../types/snippet';
import type { Collection } from '../../types/collection';
import type { Settings } from '../../types/settings';
import type { SearchFilters, SnippetFilters } from '../../types/search-filters';
import { openDatabase } from './indexeddb-schema';
import { initializeDefaultSettings } from './indexeddb-utils';

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
      // Text search (title, description, content)
      if (query) {
        const lowerQuery = query.toLowerCase();
        const matches =
          conv.title.toLowerCase().includes(lowerQuery) ||
          conv.description?.toLowerCase().includes(lowerQuery) ||
          conv.content.toLowerCase().includes(lowerQuery);
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
}
