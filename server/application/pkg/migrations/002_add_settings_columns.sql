-- Add missing columns to settings table for backup import compatibility
-- This migration adds backend_url, api_key, and disable_local_cache columns
-- to support importing backups from IndexedDB that include these fields

-- Add backend_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'mfo-server' 
        AND table_name = 'settings' 
        AND column_name = 'backend_url'
    ) THEN
        ALTER TABLE "mfo-server".settings ADD COLUMN backend_url TEXT;
    END IF;
END $$;

-- Add api_key column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'mfo-server' 
        AND table_name = 'settings' 
        AND column_name = 'api_key'
    ) THEN
        ALTER TABLE "mfo-server".settings ADD COLUMN api_key TEXT;
    END IF;
END $$;

-- Add disable_local_cache column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'mfo-server' 
        AND table_name = 'settings' 
        AND column_name = 'disable_local_cache'
    ) THEN
        ALTER TABLE "mfo-server".settings ADD COLUMN disable_local_cache BOOLEAN DEFAULT FALSE;
    END IF;
END $$;


