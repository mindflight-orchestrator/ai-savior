/**
 * Mock conversation data for testing
 */

export interface MockConversation {
  id: number;
  canonical_url: string;
  source: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
  collection_id?: number;
}

export const mockConversations: MockConversation[] = [
  {
    id: 1,
    canonical_url: 'https://chat.openai.com/c/abc123',
    source: 'chatgpt',
    title: 'React Hooks Tutorial',
    description: 'Learning about React hooks',
    content: 'User: How do I use useState?\nAssistant: useState is a React hook...',
    tags: ['react', 'javascript', 'tutorial'],
    version: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    canonical_url: 'https://claude.ai/chat/def456',
    source: 'claude',
    title: 'TypeScript Best Practices',
    description: 'Discussion about TypeScript patterns',
    content: 'User: What are best practices for TypeScript?\nAssistant: Here are some...',
    tags: ['typescript', 'programming'],
    version: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    canonical_url: 'https://www.perplexity.ai/search/ghi789',
    source: 'perplexity',
    title: 'Python Async Programming',
    description: 'Understanding async/await in Python',
    content: 'User: How does async work in Python?\nAssistant: Async programming...',
    tags: ['python', 'async'],
    version: 2,
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockTabStateNew = {
  supported: true,
  source: 'chatgpt',
  canonical_url: 'https://chat.openai.com/c/new123',
  url: 'https://chat.openai.com/c/new123',
  known: false,
  ignore: false,
};

export const mockTabStateExisting = {
  supported: true,
  source: 'chatgpt',
  canonical_url: 'https://chat.openai.com/c/abc123',
  url: 'https://chat.openai.com/c/abc123',
  known: true,
  ignore: false,
  version: 1,
  lastUpdated: new Date().toISOString(),
  existingConversation: {
    title: 'React Hooks Tutorial',
    description: 'Learning about React hooks',
    tags: ['react', 'javascript', 'tutorial'],
  },
};

export const mockTabStateUnsupported = {
  supported: false,
  source: 'unknown',
  canonical_url: 'https://example.com/page',
  url: 'https://example.com/page',
  known: false,
  error: 'URL non supportée',
};

export const mockTabStateError = {
  supported: false,
  error: "Impossible de lire l'état de l'onglet.",
};
