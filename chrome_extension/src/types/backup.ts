import type { Conversation } from './conversation';
import type { Snippet } from './snippet';
import type { Collection } from './collection';
import type { Settings } from './settings';

/**
 * Backup data structure
 * Contains all data exported from the extension
 */
export interface BackupData {
  version: string;              // "1.0"
  exported_at: string;          // ISO 8601 timestamp
  conversations: Conversation[];
  snippets: Snippet[];
  collections: Collection[];
  settings: Settings;
}

/**
 * Import options
 */
export interface ImportOptions {
  overwrite?: boolean;          // Overwrite existing items (default: true)
  skipSettings?: boolean;        // Don't import settings (default: false)
}

/**
 * Import result statistics
 */
export interface ImportResult {
  created: number;              // Number of items created
  updated: number;               // Number of items updated
  errors: number;                // Number of errors
  errors_details?: string[];     // Error messages
}

