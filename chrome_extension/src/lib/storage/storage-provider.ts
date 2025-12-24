/**
 * Re-export StorageProvider interface for convenience
 */
import type { StorageProvider } from '../../types/storage-provider';
import type { Settings } from '../../types/settings';
import { IndexedDBProvider } from './indexeddb-provider';
import { GoBackendProvider } from './go-backend-provider';
import { HybridProvider } from './hybrid-provider';

export type { StorageProvider } from '../../types/storage-provider';
export { IndexedDBProvider } from './indexeddb-provider';
export { GoBackendProvider } from './go-backend-provider';
export { HybridProvider } from './hybrid-provider';

/**
 * Create storage provider based on settings
 * 
 * Three modes:
 * 1. IndexedDB alone: No backend_url configured
 * 2. PostgreSQL alone: backend_url + disable_local_cache = true
 * 3. Hybrid: backend_url + disable_local_cache = false (default)
 */
export function createStorageProvider(settings: Settings): StorageProvider {
  // Mode 1: IndexedDB alone (no backend_url)
  if (!settings.backend_url) {
    return new IndexedDBProvider();
  }
  
  // Mode 2: PostgreSQL alone (disable_local_cache = true)
  if (settings.disable_local_cache) {
    return new GoBackendProvider(settings.backend_url, settings.api_key);
  }
  
  // Mode 3: Hybrid (backend_url + disable_local_cache = false)
  return new HybridProvider(
    new IndexedDBProvider(),
    new GoBackendProvider(settings.backend_url, settings.api_key)
  );
}
