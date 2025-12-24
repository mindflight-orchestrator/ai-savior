package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"
)

//go:embed *.sql
var migrationsFS embed.FS

// RunMigrations runs all migration files from the migrations directory
func RunMigrations(ctx context.Context, db *sql.DB, schema string) error {
	// Read migration files
	files, err := migrationsFS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Filter and sort SQL files
	var migrationFiles []string
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".sql") && file.Name() != "README.md" {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	sort.Strings(migrationFiles)

	// Create migrations table if it doesn't exist
	if err := createMigrationsTable(ctx, db, schema); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Run each migration
	for _, filename := range migrationFiles {
		if err := runMigration(ctx, db, filename, schema); err != nil {
			return fmt.Errorf("failed to run migration %s: %w", filename, err)
		}
	}

	return nil
}

func createMigrationsTable(ctx context.Context, db *sql.DB, schema string) error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS "%s".schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`, schema)
	_, err := db.ExecContext(ctx, query)
	return err
}

func runMigration(ctx context.Context, db *sql.DB, filename string, schema string) error {
	// Check if migration already applied
	var exists bool
	err := db.QueryRowContext(ctx,
		fmt.Sprintf(`SELECT EXISTS(SELECT 1 FROM "%s".schema_migrations WHERE version = $1)`, schema),
		filename,
	).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check migration status: %w", err)
	}

	if exists {
		return nil // Migration already applied
	}

	// Read migration file
	content, err := migrationsFS.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Execute migration in a transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute SQL
	if _, err := tx.ExecContext(ctx, string(content)); err != nil {
		return fmt.Errorf("failed to execute migration: %w", err)
	}

	// Record migration
	if _, err := tx.ExecContext(ctx,
		fmt.Sprintf(`INSERT INTO "%s".schema_migrations (version) VALUES ($1)`, schema),
		filename,
	); err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration: %w", err)
	}

	return nil
}

