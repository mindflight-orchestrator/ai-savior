package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
)

type SnippetRepository struct {
	pool   *pgxpool.Pool
	schema string
}

func NewSnippetRepository(pool *pgxpool.Pool, schema string) *SnippetRepository {
	return &SnippetRepository{
		pool:   pool,
		schema: schema,
	}
}

func (r *SnippetRepository) GetByID(ctx context.Context, id int) (*models.Snippet, error) {
	query := fmt.Sprintf(`
		SELECT id, title, content, source_url, source_conversation_id, tags, language, created_at
		FROM "%s".snippets
		WHERE id = $1
	`, r.schema)

	var snippet models.Snippet
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&snippet.ID, &snippet.Title, &snippet.Content, &snippet.SourceURL,
		&snippet.SourceConversationID, &snippet.Tags, &snippet.Language, &snippet.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get snippet by ID: %w", err)
	}
	return &snippet, nil
}

func (r *SnippetRepository) List(ctx context.Context, filters models.SnippetFilters) ([]models.Snippet, error) {
	var conditions []string
	var args []interface{}
	argPos := 1

	baseQuery := fmt.Sprintf(`
		SELECT id, title, content, source_url, source_conversation_id, tags, language, created_at
		FROM "%s".snippets
	`, r.schema)

	if filters.Language != "" {
		conditions = append(conditions, fmt.Sprintf("language = $%d", argPos))
		args = append(args, filters.Language)
		argPos++
	}

	if len(filters.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argPos))
		args = append(args, filters.Tags)
		argPos++
	}

	if filters.SourceConversationID != nil {
		conditions = append(conditions, fmt.Sprintf("source_conversation_id = $%d", argPos))
		args = append(args, *filters.SourceConversationID)
		argPos++
	}

	if len(conditions) > 0 {
		baseQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	baseQuery += " ORDER BY created_at DESC LIMIT 100"

	rows, err := r.pool.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list snippets: %w", err)
	}
	defer rows.Close()

	var snippets []models.Snippet
	for rows.Next() {
		var snippet models.Snippet
		err := rows.Scan(
			&snippet.ID, &snippet.Title, &snippet.Content, &snippet.SourceURL,
			&snippet.SourceConversationID, &snippet.Tags, &snippet.Language, &snippet.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan snippet: %w", err)
		}
		snippets = append(snippets, snippet)
	}

	return snippets, nil
}

func (r *SnippetRepository) Create(ctx context.Context, snippet *models.Snippet) error {
	query := fmt.Sprintf(`
		INSERT INTO "%s".snippets
		(title, content, source_url, source_conversation_id, tags, language, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, created_at
	`, r.schema)

	err := r.pool.QueryRow(ctx, query,
		snippet.Title, snippet.Content, snippet.SourceURL,
		snippet.SourceConversationID, snippet.Tags, snippet.Language,
	).Scan(&snippet.ID, &snippet.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create snippet: %w", err)
	}
	return nil
}

func (r *SnippetRepository) Update(ctx context.Context, snippet *models.Snippet) error {
	query := fmt.Sprintf(`
		UPDATE "%s".snippets
		SET title = $1, content = $2, source_url = $3, source_conversation_id = $4,
		    tags = $5, language = $6
		WHERE id = $7
	`, r.schema)

	_, err := r.pool.Exec(ctx, query,
		snippet.Title, snippet.Content, snippet.SourceURL,
		snippet.SourceConversationID, snippet.Tags, snippet.Language, snippet.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update snippet: %w", err)
	}
	return nil
}

func (r *SnippetRepository) Delete(ctx context.Context, id int) error {
	query := fmt.Sprintf(`DELETE FROM "%s".snippets WHERE id = $1`, r.schema)
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete snippet: %w", err)
	}
	return nil
}

