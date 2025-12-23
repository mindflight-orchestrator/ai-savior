/**
 * IndexedDB Schema and Database Initialization
 */

const DB_NAME = 'ai_saver_db';
const DB_VERSION = 1;

export interface Database extends IDBDatabase {
  // TypeScript helper for typed object stores
}

/**
 * Open and initialize the IndexedDB database
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create conversations object store
      if (!db.objectStoreNames.contains('conversations')) {
        const conversationStore = db.createObjectStore('conversations', {
          keyPath: 'id',
          autoIncrement: true,
        });

        conversationStore.createIndex('by-url', 'canonical_url', { unique: true });
        conversationStore.createIndex('by-updated', 'updated_at');
        conversationStore.createIndex('by-tags', 'tags', { multiEntry: true });
        conversationStore.createIndex('by-source', 'source');
        conversationStore.createIndex('by-collection', 'collection_id');
      }

      // Create snippets object store
      if (!db.objectStoreNames.contains('snippets')) {
        const snippetStore = db.createObjectStore('snippets', {
          keyPath: 'id',
          autoIncrement: true,
        });

        snippetStore.createIndex('by-url', 'source_url');
        snippetStore.createIndex('by-conversation', 'source_conversation_id');
        snippetStore.createIndex('by-tags', 'tags', { multiEntry: true });
        snippetStore.createIndex('by-language', 'language');
        snippetStore.createIndex('by-created', 'created_at');
      }

      // Create collections object store
      if (!db.objectStoreNames.contains('collections')) {
        const collectionStore = db.createObjectStore('collections', {
          keyPath: 'id',
          autoIncrement: true,
        });

        collectionStore.createIndex('by-name', 'name', { unique: true });
      }

      // Create settings object store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', {
          keyPath: 'id',
        });
      }

      // Create sync_queue object store (for cloud mode)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncQueueStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        });

        syncQueueStore.createIndex('by-entity', ['entity_type', 'entity_id']);
        syncQueueStore.createIndex('by-created', 'created_at');
      }
    };
  });
}
