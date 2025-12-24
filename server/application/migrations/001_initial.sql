-- Create tables in mfo-server schema
-- Schema should already exist from PostgreSQL initialization

-- Conversations table
CREATE TABLE IF NOT EXISTS "mfo-server".conversations (
    id SERIAL PRIMARY KEY,
    canonical_url TEXT NOT NULL,
    share_url TEXT,
    source VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    collection_id INTEGER,
    ignore BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canonical_url)
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON "mfo-server".conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON "mfo-server".conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON "mfo-server".conversations(source);
CREATE INDEX IF NOT EXISTS idx_conversations_collection_id ON "mfo-server".conversations(collection_id);

-- Snippets table
CREATE TABLE IF NOT EXISTS "mfo-server".snippets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    source_conversation_id INTEGER REFERENCES "mfo-server".conversations(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    language VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snippets_conversation_id ON "mfo-server".snippets(source_conversation_id);
CREATE INDEX IF NOT EXISTS idx_snippets_tags ON "mfo-server".snippets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_snippets_language ON "mfo-server".snippets(language);
CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON "mfo-server".snippets(created_at DESC);

-- Collections table
CREATE TABLE IF NOT EXISTS "mfo-server".collections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS "mfo-server".settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    storage_mode VARCHAR(20) DEFAULT 'local',
    beast_enabled_per_domain JSONB DEFAULT '{}',
    selective_mode_enabled BOOLEAN DEFAULT FALSE,
    dev_mode_enabled BOOLEAN DEFAULT FALSE,
    xpaths_by_domain JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_settings_row CHECK (id = 1)
);

