/**
 * Settings interface
 * Extension settings stored in storage
 */
export interface Settings {
  id?: number; // Always 1 for settings
  storageMode: 'local' | 'cloud';
  backend_url?: string; // Go backend URL (e.g., http://localhost:8080)
  api_key?: string; // API key for Bearer token auth
  disable_local_cache?: boolean; // If true, use PostgreSQL only (no hybrid)
  beast_enabled_per_domain: Record<string, boolean>; // { 'chat.openai.com': true }
  selective_mode_enabled: boolean;
  devModeEnabled: boolean;
  xpaths_by_domain: Record<string, {
    conversation: string;
    message: string;
  }>; // { 'chat.openai.com': { conversation: '...', message: '...' } }
}
