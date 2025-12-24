import type { StorageProvider } from '../../types/storage-provider';
import type { Conversation } from '../../types/conversation';
import type { Snippet } from '../../types/snippet';
import type { Collection } from '../../types/collection';
import type { Settings } from '../../types/settings';
import type { SearchFilters, SnippetFilters } from '../../types/search-filters';

/**
 * Go Backend Provider
 * Implements StorageProvider interface for Go backend API
 */
export class GoBackendProvider implements StorageProvider {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    // Remove trailing slashes
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  /**
   * HTTP request helper
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      if (response.status === 401) {
        throw new Error('Authentification requise. Vérifiez votre clé API.');
      }
      
      if (response.status === 403) {
        throw new Error('Accès refusé. Vérifiez vos permissions.');
      }
      
      if (response.status === 404) {
        // 404 is valid for get operations (not found)
        return null as T;
      }
      
      throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
    }

    // Handle 204 No Content (for DELETE operations)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Convert Go backend date strings to Date objects
   */
  private mapFromDB<T extends { created_at?: string | Date; updated_at?: string | Date }>(
    item: T
  ): T {
    const mapped = { ...item };
    if (mapped.created_at && typeof mapped.created_at === 'string') {
      (mapped as any).created_at = new Date(mapped.created_at);
    }
    if (mapped.updated_at && typeof mapped.updated_at === 'string') {
      (mapped as any).updated_at = new Date(mapped.updated_at);
    }
    return mapped;
  }

  /**
   * Convert Date objects to ISO 8601 strings for Go backend
   */
  private mapToDB<T extends { created_at?: Date; updated_at?: Date }>(
    item: T
  ): any {
    const mapped: any = { ...item };
    if (mapped.created_at instanceof Date) {
      mapped.created_at = mapped.created_at.toISOString();
    }
    if (mapped.updated_at instanceof Date) {
      mapped.updated_at = mapped.updated_at.toISOString();
    }
    return mapped;
  }

  // ========== Conversations ==========

  async getConversationByUrl(canonicalUrl: string): Promise<Conversation | null> {
    try {
      const encodedUrl = encodeURIComponent(canonicalUrl);
      const result = await this.request<Conversation | null>(
        'GET',
        `/api/conversations/url/${encodedUrl}`
      );
      
      if (!result) {
        return null;
      }
      
      return this.mapFromDB(result);
    } catch (error) {
      // Network errors or 404
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    // Check if exists by URL
    const existing = await this.getConversationByUrl(conversation.canonical_url);
    
    const payload = this.mapToDB(conversation);
    
    // The Go backend handles upsert based on canonical_url
    // If existing, increment version; otherwise start at 1
    const version = existing ? existing.version + 1 : 1;
    
    const saved = await this.request<Conversation>(
      'POST',
      '/api/conversations',
      {
        ...payload,
        version,
      }
    );
    
    return this.mapFromDB(saved);
  }

  async searchConversations(
    query: string,
    filters?: SearchFilters
  ): Promise<Conversation[]> {
    const params = new URLSearchParams();
    
    if (query) {
      params.append('q', query);
    }
    
    if (filters?.source) {
      params.append('source', filters.source);
    }
    
    if (filters?.tags?.length) {
      params.append('tags', filters.tags.join(','));
    }
    
    if (filters?.collection_id) {
      params.append('collection_id', filters.collection_id.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/api/conversations/search${queryString ? `?${queryString}` : ''}`;
    
    const results = await this.request<Conversation[]>(
      'GET',
      endpoint
    );
    
    return Array.isArray(results) ? results.map(item => this.mapFromDB(item)) : [];
  }

  async deleteConversation(id: number): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/api/conversations/${id}`
    );
  }

  // ========== Snippets ==========

  async listSnippets(filters?: SnippetFilters): Promise<Snippet[]> {
    const params = new URLSearchParams();
    
    if (filters?.language) {
      params.append('language', filters.language);
    }
    
    if (filters?.tags?.length) {
      params.append('tags', filters.tags.join(','));
    }
    
    if (filters?.source_conversation_id) {
      params.append('source_conversation_id', filters.source_conversation_id.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/api/snippets${queryString ? `?${queryString}` : ''}`;
    
    const results = await this.request<Snippet[]>(
      'GET',
      endpoint
    );
    
    return Array.isArray(results) ? results.map(item => this.mapFromDB(item)) : [];
  }

  async saveSnippet(snippet: Snippet): Promise<Snippet> {
    const payload = this.mapToDB(snippet);
    
    if (snippet.id) {
      // Update: PUT /api/snippets/:id
      const updated = await this.request<Snippet>(
        'PUT',
        `/api/snippets/${snippet.id}`,
        payload
      );
      return this.mapFromDB(updated);
    } else {
      // Create: POST /api/snippets
      const created = await this.request<Snippet>(
        'POST',
        '/api/snippets',
        payload
      );
      return this.mapFromDB(created);
    }
  }

  async deleteSnippet(id: number): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/api/snippets/${id}`
    );
  }

  // ========== Collections ==========

  async listCollections(): Promise<Collection[]> {
    const results = await this.request<Collection[]>(
      'GET',
      '/api/collections'
    );
    
    return Array.isArray(results) ? results.map(item => this.mapFromDB(item)) : [];
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    const payload = this.mapToDB(collection);
    
    if (collection.id) {
      // Update: PUT /api/collections/:id
      const updated = await this.request<Collection>(
        'PUT',
        `/api/collections/${collection.id}`,
        payload
      );
      return this.mapFromDB(updated);
    } else {
      // Create: POST /api/collections
      const created = await this.request<Collection>(
        'POST',
        '/api/collections',
        payload
      );
      return this.mapFromDB(created);
    }
  }

  async deleteCollection(id: number): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/api/collections/${id}`
    );
  }

  // ========== Settings ==========

  async getSettings(): Promise<Settings> {
    const result = await this.request<Settings>(
      'GET',
      '/api/settings'
    );
    
    // Settings don't have created_at/updated_at in the same way, just return as-is
    return result;
  }

  async saveSettings(settings: Settings): Promise<void> {
    // Settings don't need date conversion, send as-is
    await this.request<Settings>(
      'POST',
      '/api/settings',
      settings
    );
  }

  // ========== Connection Test ==========

  /**
   * Test connection to the backend
   */
  static async testConnection(
    baseUrl: string,
    apiKey?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const url = baseUrl.replace(/\/+$/, '');
      const headers: HeadersInit = {};
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { 
          success: true, 
          message: data.status === 'healthy' ? 'Connexion réussie' : 'Connexion réussie (statut inconnu)'
        };
      } else {
        return { 
          success: false, 
          message: `Erreur ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erreur de connexion: ${errorMessage}`,
      };
    }
  }
}

