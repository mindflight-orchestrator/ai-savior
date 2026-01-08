/**
 * Mock settings data for testing
 */

export interface MockSettings {
  storageMode: 'local' | 'cloud';
  postgrest_url?: string;
  postgrest_auth?: string;
  beast_enabled_per_domain: Record<string, boolean>;
  devModeEnabled: boolean;
}

export const mockSettingsLocal: MockSettings = {
  storageMode: 'local',
  beast_enabled_per_domain: {
    'chat.openai.com': true,
    'chatgpt.com': true,
    'www.chatgpt.com': true,
    'claude.ai': true,
    'www.perplexity.ai': true,
    'kimi.moonshot.cn': false,
    'chat.mistral.ai': true,
    'chat.deepseek.com': true,
    'chat.qwen.ai': true,
    'manus.im': true,
    'grok.com': true,
  },
  devModeEnabled: false,
};

export const mockSettingsCloud: MockSettings = {
  storageMode: 'cloud',
  postgrest_url: 'http://localhost:3000',
  postgrest_auth: 'Bearer test-token',
  beast_enabled_per_domain: {
    'chat.openai.com': true,
    'claude.ai': true,
    'www.perplexity.ai': false,
  },
  devModeEnabled: true,
};
