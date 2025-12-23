/**
 * Search filters for conversations and snippets
 */
export interface SearchFilters {
  source?: 'chatgpt' | 'claude' | 'perplexity' | 'kimi' | 'other';
  tags?: string[];
  collection_id?: number;
  type?: 'conversation' | 'snippet' | 'all';
}

/**
 * Snippet filters
 */
export interface SnippetFilters {
  language?: string;
  tags?: string[];
  source_conversation_id?: number;
}
