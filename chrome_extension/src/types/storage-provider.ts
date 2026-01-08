import type { Conversation } from './conversation';
import type { Snippet } from './snippet';
import type { Collection } from './collection';
import type { Settings } from './settings';
import type { SearchFilters, SnippetFilters } from './search-filters';

/**
 * Storage Provider Interface
 * All storage backends (IndexedDB and PostgREST) must implement this interface
 */
export interface StorageProvider {
  // Conversations
  getConversationByUrl(canonicalUrl: string): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<Conversation>;
  searchConversations(query: string, filters?: SearchFilters): Promise<Conversation[]>;
  deleteConversation(id: number): Promise<void>;
  
  // Snippets
  listSnippets(filters?: SnippetFilters): Promise<Snippet[]>;
  saveSnippet(snippet: Snippet): Promise<Snippet>;
  deleteSnippet(id: number): Promise<void>;
  
  // Collections
  listCollections(): Promise<Collection[]>;
  saveCollection(collection: Collection): Promise<Collection>;
  deleteCollection(id: number): Promise<void>;
  
  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  
  // Tags
  getAllTags(): Promise<string[]>;
}
