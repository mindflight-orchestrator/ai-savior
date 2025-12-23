/**
 * Conversation interface
 * Represents a saved conversation from an AI platform
 */
export interface Conversation {
  id?: number;
  canonical_url: string; // Normalized URL used for deduplication
  share_url?: string;
  source: 'chatgpt' | 'claude' | 'perplexity' | 'kimi' | 'mistral' | 'deepseek' | 'qwen' | 'manus' | 'grok' | 'other';
  title: string;
  description?: string;
  content: string; // Full content in markdown format
  tags: string[];
  collection_id?: number;
  ignore: boolean; // If true, Beast Mode will not collect for this URL
  version: number; // Incremented on each Beast Mode overwrite
  created_at: Date;
  updated_at: Date;
}

/**
 * Conversation payload for extraction
 * Used when extracting from content scripts
 */
export interface ConversationPayload {
  title: string;
  content: string; // Markdown formatted
  description?: string;
  shareUrl?: string;
}
