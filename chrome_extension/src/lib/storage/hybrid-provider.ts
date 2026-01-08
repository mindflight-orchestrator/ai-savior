import type { StorageProvider } from '../../types/storage-provider';
import type { Conversation } from '../../types/conversation';
import type { Snippet } from '../../types/snippet';
import type { Collection } from '../../types/collection';
import type { Settings } from '../../types/settings';
import type { SearchFilters, SnippetFilters } from '../../types/search-filters';
import type { BackupData, ImportOptions, ImportResult } from '../../types/backup';
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
      // Only log as warning (not error) since this is expected when backend is unavailable
      // Check if it's a network error (TypeError: Failed to fetch) vs other errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Network error - backend likely unavailable, this is normal
        console.debug('[Hybrid] Backend unavailable (network error), using local cache only');
      } else {
        // Other errors (auth, server error, etc.) - log as warning
        console.warn('[Hybrid] Error fetching from remote:', error);
      }
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
      // Network error or other remote error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), using local cache only');
      } else {
        console.warn('[Hybrid] Error searching remote:', error);
      }
      // Return empty array rather than throwing
      return [];
    }
  }

  async deleteConversation(id: number): Promise<void> {
    // Delete from both
    // Local deletion is critical - if it fails, we should throw
    let localError: Error | null = null;
    try {
      await this.localProvider.deleteConversation(id);
    } catch (error) {
      console.warn('[Hybrid] Error deleting from local cache:', error);
      localError = error instanceof Error ? error : new Error(String(error));
    }

    // Remote deletion is best-effort - if it fails, we continue (local is source of truth)
    try {
      await this.remoteProvider.deleteConversation(id);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), deletion skipped on remote');
      } else {
        console.warn('[Hybrid] Error deleting from remote:', error);
      }
      // Don't throw - local deletion succeeded, that's what matters
    }

    // If local deletion failed, throw the error
    if (localError) {
      throw localError;
    }
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
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), using local cache only');
      } else {
        console.warn('[Hybrid] Error listing snippets from remote:', error);
      }
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
    // Local deletion is critical - if it fails, we should throw
    let localError: Error | null = null;
    try {
      await this.localProvider.deleteSnippet(id);
    } catch (error) {
      console.warn('[Hybrid] Error deleting snippet from local cache:', error);
      localError = error instanceof Error ? error : new Error(String(error));
    }

    // Remote deletion is best-effort - if it fails, we continue (local is source of truth)
    try {
      await this.remoteProvider.deleteSnippet(id);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), snippet deletion skipped on remote');
      } else {
        console.warn('[Hybrid] Error deleting snippet from remote:', error);
      }
      // Don't throw - local deletion succeeded, that's what matters
    }

    // If local deletion failed, throw the error
    if (localError) {
      throw localError;
    }
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
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), using local cache only');
      } else {
        console.warn('[Hybrid] Error listing collections from remote:', error);
      }
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
    // Local deletion is critical - if it fails, we should throw
    let localError: Error | null = null;
    try {
      await this.localProvider.deleteCollection(id);
    } catch (error) {
      console.warn('[Hybrid] Error deleting collection from local cache:', error);
      localError = error instanceof Error ? error : new Error(String(error));
    }

    // Remote deletion is best-effort - if it fails, we continue (local is source of truth)
    try {
      await this.remoteProvider.deleteCollection(id);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), collection deletion skipped on remote');
      } else {
        console.warn('[Hybrid] Error deleting collection from remote:', error);
      }
      // Don't throw - local deletion succeeded, that's what matters
    }

    // If local deletion failed, throw the error
    if (localError) {
      throw localError;
    }
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
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.debug('[Hybrid] Backend unavailable (network error), using local settings');
          // Return local settings as fallback
          return await this.localProvider.getSettings();
        } else {
          console.warn('[Hybrid] Error getting settings from remote:', error);
          throw error;
        }
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

  // ========== Tags ==========

  async getAllTags(): Promise<string[]> {
    const allTags = new Set<string>();
    
    // Get tags from local cache
    try {
      const localTags = await this.localProvider.getAllTags();
      localTags.forEach((tag) => allTags.add(tag));
    } catch (error) {
      console.warn('[Hybrid] Error getting tags from local cache:', error);
    }
    
    // Get tags from remote
    try {
      const remoteTags = await this.remoteProvider.getAllTags();
      remoteTags.forEach((tag) => allTags.add(tag));
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.debug('[Hybrid] Backend unavailable (network error), using local tags only');
      } else {
        console.warn('[Hybrid] Error getting tags from remote:', error);
      }
    }
    
    return Array.from(allTags).sort((a, b) => a.localeCompare(b));
  }

  // ========== Backup & Restore ==========

  /**
   * Export backup (from local cache)
   */
  async exportBackup(): Promise<BackupData> {
    // Use local provider for export
    if (this.localProvider instanceof IndexedDBProvider) {
      return await this.localProvider.exportBackup();
    }
    throw new Error('Export backup not supported in this configuration');
  }

  /**
   * Download backup
   */
  async downloadBackup(): Promise<void> {
    if (this.localProvider instanceof IndexedDBProvider) {
      return await this.localProvider.downloadBackup();
    }
    throw new Error('Download backup not supported in this configuration');
  }

  /**
   * Import backup (to both local and remote)
   */
  async importBackup(backup: BackupData, options?: ImportOptions): Promise<ImportResult> {
    // Import to local first
    let localResult: ImportResult;
    if (this.localProvider instanceof IndexedDBProvider) {
      localResult = await this.localProvider.importBackup(backup, options);
    } else {
      localResult = { created: 0, updated: 0, errors: 0 };
    }

    // Import to remote if it supports it
    if ('importBackup' in this.remoteProvider && typeof this.remoteProvider.importBackup === 'function') {
      try {
        const remoteResult = await (this.remoteProvider as any).importBackup(backup);
        // Merge results
        return {
          created: localResult.created + remoteResult.created,
          updated: localResult.updated + remoteResult.updated,
          errors: localResult.errors + remoteResult.errors,
          errors_details: [
            ...(localResult.errors_details || []),
            ...(remoteResult.errors_details || []),
          ],
        };
      } catch (error) {
        console.warn('[Hybrid] Error importing to remote:', error);
        // Return local result even if remote fails
        return localResult;
      }
    }

    return localResult;
  }
}

