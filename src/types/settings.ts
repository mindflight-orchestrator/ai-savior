/**
 * Settings interface
 * Extension settings stored in storage
 */
export interface Settings {
  id?: number; // Always 1 for settings
  storageMode: 'local' | 'cloud';
  postgrest_url?: string;
  postgrest_auth?: string; // JWT token or API key
  beast_enabled_per_domain: Record<string, boolean>; // { 'chat.openai.com': true }
  selective_mode_enabled: boolean;
  devModeEnabled: boolean;
  xpaths_by_domain: Record<string, {
    conversation: string;
    message: string;
  }>; // { 'chat.openai.com': { conversation: '...', message: '...' } }
}
