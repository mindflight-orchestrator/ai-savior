# Database Migrations

This directory contains SQL migration files for the database schema.

## Migration Files

- `001_initial.sql` - Initial schema creation with all tables (conversations, snippets, collections, settings)

## Running Migrations

Migrations are automatically run on server startup via the migration runner in `internal/repository/migrations.go`.

## Schema

All tables are created in the `mfo-server` schema to match the existing PostgreSQL setup.

