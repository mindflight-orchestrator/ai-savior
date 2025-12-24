import type { StorageProvider } from '../../types/storage-provider';
import type { Conversation } from '../../types/conversation';
import type { Snippet } from '../../types/snippet';
import type { Collection } from '../../types/collection';
import type { Settings } from '../../types/settings';
import type { SearchFilters, SnippetFilters } from '../../types/search-filters';
import { IndexedDBProvider } from './indexeddb-provider';

/**
 * Hybrid Provider
 * Wraps IndexedDB and Go backend providers with cache-first reads and dual writes
 * 
 * Read strategy: Try IndexedDB first (cache), fall back to backend if not found
 * Write strategy: Write to both IndexedDB and backend (optimistic local write)
 */
export class HybridProvider implements StorageProvider {
  private localProvider: IndexedDBProvider;
  private remoteProvider: StorageProvider;

  constructor(localProvider: IndexedDBProvider, remoteProvider: StorageProvider) {
    this.localProvider = localProvider;
    this.remoteProvider = remoteProvider;
  }

  // ========== Conversations ==========

  async getConversationByUrl(canonicalUrl: string): Promise<Conversation | null> {
    // Cache-first: Try local first
    try {
      const cached = await this.localProvider.getConversationByUrl(canonicalUrl);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('[Hybrid] Error reading from local cache:', error);
      // Continue to remote fetch
    }

    // Not found in cache, try remote
    try {
      const remote = await this.remoteProvider.getConversationByUrl(canonicalUrl);
      if (remote) {
        // Cache the result for next time
        try {
          await this.localProvider.saveConversation(remote);
        } catch (error) {
          console.warn('[Hybrid] Error caching remote result:', error);
          // Don't fail the request if caching fails
        }
        return remote;
      }
      return null;
    } catch (error) {
      // Network error or other remote error
      console.error('[Hybrid] Error fetching from remote:', error);
      // Return null (not found) rather than throwing
      // This allows the app to continue working offline
      return null;
    }
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    // Dual write: Save to local first (optimistic)
    let localResult: Conversation;
    try {
      localResult = await this.localProvider.saveConversation(conversation);
    } catch (error) {
      console.error('[Hybrid] Error saving to local cache:', error);
      // If local save fails, still try remote (but this is unusual)
      localResult = conversation;
    }

    // Then save to remote
    try {
      const remoteResult = await this.remoteProvider.saveConversation(conversation);
      // Update local cache with remote result (in case remote has different ID or version)
      try {
        await this.localProvider.saveConversation(remoteResult);
      } catch (error) {
        console.warn('[Hybrid] Error updating local cache with remote result:', error);
      }
      return remoteResult;
    } catch (error) {
      // Remote save failed, but local save succeeded
      console.warn('[Hybrid] Error saving to remote (data saved locally):', error);
      // Return local result - data is safe in cache
      return localResult;
    }
  }

  async searchConversations(
    query: string,
    filters?: SearchFilters
  ): Promise<Conversation[]> {
    // For search, we'll use local cache first (faster)
    // In the future, we could implement a smarter strategy (e.g., search both and merge)
    try {
      const localResults = await this.localProvider.searchConversations(query, filters);
      // If we have results locally, return them immediately
      if (localResults.length > 0) {
        return localResults;
      }
    } catch (error) {
      console.warn('[Hybrid] Error searching local cache:', error);
    }

    // No local results or error, try remote
    try {
      const remoteResults = await this.remoteProvider.searchConversations(query, filters);
      // Cache the results
      for (const conv of remoteResults) {
        try {
          await this.localProvider.saveConversation(conv);
        } catch (error) {
          console.warn('[Hybrid] Error caching search result:', error);
        }
      }
      return remoteResults;
    } catch (error) {
      console.error('[Hybrid] Error searching remote:', error);
      // Return empty array rather than throwing
      return [];
    }
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete from both
    const localPromise = this.localProvider.deleteConversation(id).catch((error) => {
      console.warn('[Hybrid] Error deleting from local cache:', error);
    });

    const remotePromise = this.remoteProvider.deleteConversation(id).catch((error) => {
      console.error('[Hybrid] Error deleting from remote:', error);
      throw error; // Re-throw remote errors
    });

    await Promise.all([localPromise, remotePromise]);
  }

  // ========== Snippets ==========

  async listSnippets(filters?: SnippetFilters): Promise<Snippet[]> {
    // Cache-first: Try local first
    try {
      const localResults = await this.localProvider.listSnippets(filters);
      if (localResults.length > 0) {
        return localResults;
      }
    } catch (error) {
      console.warn('[Hybrid] Error listing snippets from local cache:', error);
    }

    // Try remote
    try {
      const remoteResults = await this.remoteProvider.listSnippets(filters);
      // Cache the results
      for (const snippet of remoteResults) {
        try {
          await this.localProvider.saveSnippet(snippet);
        } catch (error) {
          console.warn('[Hybrid] Error caching snippet:', error);
        }
      }
      return remoteResults;
    } catch (error) {
      console.error('[Hybrid] Error listing snippets from remote:', error);
      return [];
    }
  }

  async saveSnippet(snippet: Snippet): Promise<Snippet> {
    // Dual write: Save to local first
    let localResult: Snippet;
    try {
      localResult = await this.localProvider.saveSnippet(snippet);
    } catch (error) {
      console.error('[Hybrid] Error saving snippet to local cache:', error);
      localResult = snippet;
    }

    // Then save to remote
    try {
      const remoteResult = await this.remoteProvider.saveSnippet(snippet);
      // Update local cache
      try {
        await this.localProvider.saveSnippet(remoteResult);
      } catch (error) {
        console.warn('[Hybrid] Error updating local cache with remote snippet:', error);
      }
      return remoteResult;
    } catch (error) {
      console.warn('[Hybrid] Error saving snippet to remote (saved locally):', error);
      return localResult;
    }
  }

  async deleteSnippet(id: number): Promise<void> {
    const localPromise = this.localProvider.deleteSnippet(id).catch((error) => {
      console.warn('[Hybrid] Error deleting snippet from local cache:', error);
    });

    const remotePromise = this.remoteProvider.deleteSnippet(id).catch((error) => {
      console.error('[Hybrid] Error deleting snippet from remote:', error);
      throw error;
    });

    await Promise.all([localPromise, remotePromise]);
  }

  // ========== Collections ==========

  async listCollections(): Promise<Collection[]> {
    // Cache-first: Try local first
    try {
      const localResults = await this.localProvider.listCollections();
      if (localResults.length > 0) {
        return localResults;
      }
    } catch (error) {
      console.warn('[Hybrid] Error listing collections from local cache:', error);
    }

    // Try remote
    try {
      const remoteResults = await this.remoteProvider.listCollections();
      // Cache the results
      for (const collection of remoteResults) {
        try {
          await this.localProvider.saveCollection(collection);
        } catch (error) {
          console.warn('[Hybrid] Error caching collection:', error);
        }
      }
      return remoteResults;
    } catch (error) {
      console.error('[Hybrid] Error listing collections from remote:', error);
      return [];
    }
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    // Dual write: Save to local first
    let localResult: Collection;
    try {
      localResult = await this.localProvider.saveCollection(collection);
    } catch (error) {
      console.error('[Hybrid] Error saving collection to local cache:', error);
      localResult = collection;
    }

    // Then save to remote
    try {
      const remoteResult = await this.remoteProvider.saveCollection(collection);
      // Update local cache
      try {
        await this.localProvider.saveCollection(remoteResult);
      } catch (error) {
        console.warn('[Hybrid] Error updating local cache with remote collection:', error);
      }
      return remoteResult;
    } catch (error) {
      console.warn('[Hybrid] Error saving collection to remote (saved locally):', error);
      return localResult;
    }
  }

  async deleteCollection(id: number): Promise<void> {
    const localPromise = this.localProvider.deleteCollection(id).catch((error) => {
      console.warn('[Hybrid] Error deleting collection from local cache:', error);
    });

    const remotePromise = this.remoteProvider.deleteCollection(id).catch((error) => {
      console.error('[Hybrid] Error deleting collection from remote:', error);
      throw error;
    });

    await Promise.all([localPromise, remotePromise]);
  }

  // ========== Settings ==========

  async getSettings(): Promise<Settings> {
    // Settings should come from local (chrome.storage.local), not remote
    // But we'll try local provider first
    try {
      return await this.localProvider.getSettings();
    } catch (error) {
      console.warn('[Hybrid] Error getting settings from local, trying remote:', error);
      // Fallback to remote
      try {
        return await this.remoteProvider.getSettings();
      } catch (error) {
        console.error('[Hybrid] Error getting settings from remote:', error);
        throw error;
      }
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    // Save to both
    const localPromise = this.localProvider.saveSettings(settings).catch((error) => {
      console.warn('[Hybrid] Error saving settings to local cache:', error);
    });

    const remotePromise = this.remoteProvider.saveSettings(settings).catch((error) => {
      console.warn('[Hybrid] Error saving settings to remote:', error);
      // Don't throw - settings should work even if remote fails
    });

    await Promise.all([localPromise, remotePromise]);
  }
}

