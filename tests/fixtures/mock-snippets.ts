/**
 * Mock snippet data for testing
 */

export interface MockSnippet {
  id: number;
  title: string;
  content: string;
  source_url?: string;
  source_conversation_id?: number;
  tags: string[];
  language?: string;
  created_at: string;
  preview: string;
}

export const mockSnippets: MockSnippet[] = [
  {
    id: 1,
    title: 'React useState Hook',
    content: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}`,
    source_url: 'https://chat.openai.com/c/abc123',
    tags: ['react', 'hooks', 'javascript'],
    language: 'javascript',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    preview: "import { useState } from 'react';\n\nfunction Counter() {",
  },
  {
    id: 2,
    title: 'Python Async Function',
    content: `import asyncio

async def fetch_data(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()`,
    tags: ['python', 'async'],
    language: 'python',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    preview: 'import asyncio\n\nasync def fetch_data(url):',
  },
  {
    id: 3,
    title: 'TypeScript Interface',
    content: `interface User {
  id: number;
  name: string;
  email: string;
}`,
    tags: ['typescript', 'types'],
    language: 'typescript',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    preview: 'interface User {',
  },
  {
    id: 4,
    title: 'SQL Query Example',
    content: `SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name;`,
    tags: ['sql', 'database'],
    language: 'sql',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    preview: 'SELECT u.name, COUNT(p.id) as post_count',
  },
];
