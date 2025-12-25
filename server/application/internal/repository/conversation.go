package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
)

type ConversationRepository struct {
	pool   *pgxpool.Pool
	schema string
}

func NewConversationRepository(pool *pgxpool.Pool, schema string) *ConversationRepository {
	return &ConversationRepository{
		pool:   pool,
		schema: schema,
	}
}

func (r *ConversationRepository) GetByID(ctx context.Context, id int) (*models.Conversation, error) {
	query := fmt.Sprintf(`
		SELECT id, canonical_url, share_url, source, title, description, content,
		       tags, collection_id, ignore, version, created_at, updated_at
		FROM "%s".conversations
		WHERE id = $1
	`, r.schema)

	var conv models.Conversation
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&conv.ID, &conv.CanonicalURL, &conv.ShareURL, &conv.Source,
		&conv.Title, &conv.Description, &conv.Content,
		&conv.Tags, &conv.CollectionID, &conv.Ignore,
		&conv.Version, &conv.CreatedAt, &conv.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation by ID: %w", err)
	}
	return &conv, nil
}

func (r *ConversationRepository) GetByCanonicalURL(ctx context.Context, url string) (*models.Conversation, error) {
	query := fmt.Sprintf(`
		SELECT id, canonical_url, share_url, source, title, description, content,
		       tags, collection_id, ignore, version, created_at, updated_at
		FROM "%s".conversations
		WHERE canonical_url = $1
	`, r.schema)

	var conv models.Conversation
	err := r.pool.QueryRow(ctx, query, url).Scan(
		&conv.ID, &conv.CanonicalURL, &conv.ShareURL, &conv.Source,
		&conv.Title, &conv.Description, &conv.Content,
		&conv.Tags, &conv.CollectionID, &conv.Ignore,
		&conv.Version, &conv.CreatedAt, &conv.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation by URL: %w", err)
	}
	return &conv, nil
}

func (r *ConversationRepository) Create(ctx context.Context, conv *models.Conversation) error {
	// Use provided dates if not zero, otherwise use NULL to trigger DEFAULT (NOW())
	var createdAt, updatedAt interface{}
	if conv.CreatedAt.IsZero() {
		createdAt = nil // Will use DEFAULT NOW()
	} else {
		createdAt = conv.CreatedAt
	}
	if conv.UpdatedAt.IsZero() {
		updatedAt = nil // Will use DEFAULT NOW()
	} else {
		updatedAt = conv.UpdatedAt
	}

	query := fmt.Sprintf(`
		INSERT INTO "%s".conversations
		(canonical_url, share_url, source, title, description, content, tags,
		 collection_id, ignore, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`, r.schema)

	err := r.pool.QueryRow(ctx, query,
		conv.CanonicalURL, conv.ShareURL, conv.Source, conv.Title,
		conv.Description, conv.Content, conv.Tags, conv.CollectionID,
		conv.Ignore, conv.Version, createdAt, updatedAt,
	).Scan(&conv.ID, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepository) Update(ctx context.Context, conv *models.Conversation) error {
	query := fmt.Sprintf(`
		UPDATE "%s".conversations
		SET title = $1, description = $2, content = $3, tags = $4,
		    collection_id = $5, ignore = $6, version = $7, updated_at = NOW()
		WHERE id = $8
		RETURNING updated_at
	`, r.schema)

	err := r.pool.QueryRow(ctx, query,
		conv.Title, conv.Description, conv.Content, conv.Tags,
		conv.CollectionID, conv.Ignore, conv.Version, conv.ID,
	).Scan(&conv.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepository) Delete(ctx context.Context, id int) error {
	query := fmt.Sprintf(`DELETE FROM "%s".conversations WHERE id = $1`, r.schema)
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepository) Search(ctx context.Context, filters models.SearchFilters) ([]models.Conversation, error) {
	var conditions []string
	var args []interface{}
	argPos := 1

	baseQuery := fmt.Sprintf(`
		SELECT id, canonical_url, share_url, source, title, description, content,
		       tags, collection_id, ignore, version, created_at, updated_at
		FROM "%s".conversations
	`, r.schema)

	if filters.Query != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(title ILIKE $%d OR description ILIKE $%d OR content ILIKE $%d)",
			argPos, argPos, argPos,
		))
		args = append(args, "%"+filters.Query+"%")
		argPos++
	}

	if filters.Source != "" {
		conditions = append(conditions, fmt.Sprintf("source = $%d", argPos))
		args = append(args, filters.Source)
		argPos++
	}

	if len(filters.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argPos))
		args = append(args, filters.Tags)
		argPos++
	}

	if filters.CollectionID != nil {
		conditions = append(conditions, fmt.Sprintf("collection_id = $%d", argPos))
		args = append(args, *filters.CollectionID)
		argPos++
	}

	if len(conditions) > 0 {
		baseQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	baseQuery += " ORDER BY updated_at DESC LIMIT 100"

	rows, err := r.pool.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search conversations: %w", err)
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var conv models.Conversation
		err := rows.Scan(
			&conv.ID, &conv.CanonicalURL, &conv.ShareURL, &conv.Source,
			&conv.Title, &conv.Description, &conv.Content,
			&conv.Tags, &conv.CollectionID, &conv.Ignore,
			&conv.Version, &conv.CreatedAt, &conv.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation: %w", err)
		}
		conversations = append(conversations, conv)
	}

	return conversations, nil
}

