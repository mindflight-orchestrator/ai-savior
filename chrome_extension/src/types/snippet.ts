/**
 * Snippet interface
 * Represents a code snippet or excerpt
 */
export interface Snippet {
  id?: number;
  title: string;
  content: string;
  source_url?: string;
  source_conversation_id?: number; // Foreign key to conversations
  tags: string[];
  language?: string; // e.g., 'javascript', 'python', 'typescript'
  created_at: Date;
}
