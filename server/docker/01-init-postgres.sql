-- ========================================
-- PostgreSQL Bootstrap Script
-- ========================================
-- This script only sets up the minimal requirements:
-- - Extensions
-- - NanoID functions
-- - Database, user, and schema
-- 
-- All tables and indexes are managed by mfo-server's pg_store.go
-- which is the single source of truth for the schema.
-- ========================================

-- Create extensions in the expected order
CREATE EXTENSION IF NOT EXISTS pgcrypto CASCADE;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_facets;

-- ========================================
-- NanoID Functions
-- ========================================

-- The 'nanoid()' function generates a compact, URL-friendly unique identifier.
-- Based on the given size and alphabet, it creates a randomized string that's ideal for
-- use-cases requiring small, unpredictable IDs (e.g., URL shorteners, generated file names, etc.).
-- While it comes with a default configuration, the function is designed to be flexible,
-- allowing for customization to meet specific needs.

DROP FUNCTION IF EXISTS nanoid(int, text, float) CASCADE;
CREATE OR REPLACE FUNCTION nanoid(
    size int DEFAULT 21, -- The number of symbols in the NanoId String. Must be greater than 0.
    alphabet text DEFAULT '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', -- The symbols used in the NanoId String. Must contain between 1 and 255 symbols.
    additionalBytesFactor float DEFAULT 1.6 -- The additional bytes factor used for calculating the step size. Must be equal or greater then 1.
)
    RETURNS text -- A randomly generated NanoId String
    LANGUAGE plpgsql
    VOLATILE
    PARALLEL SAFE
    -- Uncomment the following line if you have superuser privileges
    -- LEAKPROOF
AS
$$
DECLARE
    alphabetArray  text[];
    alphabetLength int := 64;
    mask           int := 63;
    step           int := 34;
BEGIN
    IF size IS NULL OR size < 1 THEN
        RAISE EXCEPTION 'The size must be defined and greater than 0!';
    END IF;

    IF alphabet IS NULL OR length(alphabet) = 0 OR length(alphabet) > 255 THEN
        RAISE EXCEPTION 'The alphabet can''t be undefined, zero or bigger than 255 symbols!';
    END IF;

    IF additionalBytesFactor IS NULL OR additionalBytesFactor < 1 THEN
        RAISE EXCEPTION 'The additional bytes factor can''t be less than 1!';
    END IF;

    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    mask := (2 << cast(floor(log(alphabetLength - 1) / log(2)) as int)) - 1;
    step := cast(ceil(additionalBytesFactor * mask * size / alphabetLength) AS int);

    IF step > 1024 THEN
        step := 1024; -- The step size can''t be bigger then 1024!
    END IF;

    RETURN nanoid_optimized(size, alphabet, mask, step);
END
$$;

-- Generates an optimized random string of a specified size using the given alphabet, mask, and step.
-- This optimized version is designed for higher performance and lower memory overhead.
-- No checks are performed! Use it only if you really know what you are doing.
DROP FUNCTION IF EXISTS nanoid_optimized(int, text, int, int) CASCADE;
CREATE OR REPLACE FUNCTION nanoid_optimized(
    size int, -- The desired length of the generated string.
    alphabet text, -- The set of characters to choose from for generating the string.
    mask int, -- The mask used for mapping random bytes to alphabet indices. Should be '(2^n) - 1' where 'n' is a power of 2 less than or equal to the alphabet size.
    step int -- The number of random bytes to generate in each iteration. A larger value may speed up the function but increase memory usage.
)
    RETURNS text -- A randomly generated NanoId String
    LANGUAGE plpgsql
    VOLATILE
    PARALLEL SAFE
AS
$$
DECLARE
    idBuilder      text := '';
    counter        int  := 0;
    bytes          bytea;
    alphabetIndex  int;
    alphabetArray  text[];
    alphabetLength int  := 64;
BEGIN
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);

    LOOP
        bytes := gen_random_bytes(step);
        FOR counter IN 0..step - 1
            LOOP
                alphabetIndex := (get_byte(bytes, counter) & mask) + 1;
                IF alphabetIndex <= alphabetLength THEN
                    idBuilder := idBuilder || alphabetArray[alphabetIndex];
                    IF length(idBuilder) = size THEN
                        RETURN idBuilder;
                    END IF;
                END IF;
            END LOOP;
    END LOOP;
END
$$;

-- Enable NOTICE level messages
SET client_min_messages TO NOTICE;

DO $$
DECLARE
    test_id text;
BEGIN
    test_id := nanoid();
    RAISE NOTICE 'nanoid function created: %', test_id;
END
$$;

-- Create the mfoserver user if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'mfoserver') THEN
      CREATE USER mfoserver WITH PASSWORD 'mfoserver';
   END IF;
END
$do$;

-- Create the mfo database if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_database
      WHERE datname = 'mfo') THEN
      CREATE DATABASE mfo;
   END IF;
END
$do$;

-- Grant privileges to mfoserver
GRANT ALL PRIVILEGES ON DATABASE mfo TO mfoserver;

-- Connect to the mfo database
\c mfo

-- Create the mfo-server schema
CREATE SCHEMA IF NOT EXISTS "mfo-server";

-- Grant privileges on the schema
GRANT ALL ON SCHEMA "mfo-server" TO mfoserver;
GRANT ALL ON ALL TABLES IN SCHEMA "mfo-server" TO mfoserver;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "mfo-server" TO mfoserver;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "mfo-server" TO mfoserver;

-- Set the default search path for mfoserver
ALTER ROLE mfoserver SET search_path TO "mfo-server", "$user", public;

-- Set default privileges for future objects created by mfoserver
ALTER DEFAULT PRIVILEGES IN SCHEMA "mfo-server" GRANT ALL ON TABLES TO mfoserver;
ALTER DEFAULT PRIVILEGES IN SCHEMA "mfo-server" GRANT ALL ON SEQUENCES TO mfoserver;
ALTER DEFAULT PRIVILEGES IN SCHEMA "mfo-server" GRANT ALL ON FUNCTIONS TO mfoserver;

-- ========================================
-- Schema Note
-- ========================================
-- All tables, indexes, and constraints are managed by mfo-server.
-- The schema is automatically created/migrated when mfo-server starts
-- via the initializeDatabase() function in pg_store.go.
-- ========================================
