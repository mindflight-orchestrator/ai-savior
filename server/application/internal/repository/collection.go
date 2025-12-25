package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
)

type CollectionRepository struct {
	pool   *pgxpool.Pool
	schema string
}

func NewCollectionRepository(pool *pgxpool.Pool, schema string) *CollectionRepository {
	return &CollectionRepository{
		pool:   pool,
		schema: schema,
	}
}

func (r *CollectionRepository) GetByID(ctx context.Context, id int) (*models.Collection, error) {
	query := fmt.Sprintf(`
		SELECT id, name, icon, color, created_at
		FROM "%s".collections
		WHERE id = $1
	`, r.schema)

	var collection models.Collection
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&collection.ID, &collection.Name, &collection.Icon, &collection.Color, &collection.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get collection by ID: %w", err)
	}
	return &collection, nil
}

func (r *CollectionRepository) GetByName(ctx context.Context, name string) (*models.Collection, error) {
	query := fmt.Sprintf(`
		SELECT id, name, icon, color, created_at
		FROM "%s".collections
		WHERE name = $1
	`, r.schema)

	var collection models.Collection
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&collection.ID, &collection.Name, &collection.Icon, &collection.Color, &collection.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get collection by name: %w", err)
	}
	return &collection, nil
}

func (r *CollectionRepository) List(ctx context.Context) ([]models.Collection, error) {
	query := fmt.Sprintf(`
		SELECT id, name, icon, color, created_at
		FROM "%s".collections
		ORDER BY created_at DESC
	`, r.schema)

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list collections: %w", err)
	}
	defer rows.Close()

	var collections []models.Collection
	for rows.Next() {
		var collection models.Collection
		err := rows.Scan(
			&collection.ID, &collection.Name, &collection.Icon, &collection.Color, &collection.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan collection: %w", err)
		}
		collections = append(collections, collection)
	}

	return collections, nil
}

func (r *CollectionRepository) Create(ctx context.Context, collection *models.Collection) error {
	// Use provided date if not zero, otherwise use NULL to trigger DEFAULT (NOW())
	var createdAt interface{}
	if collection.CreatedAt.IsZero() {
		createdAt = nil // Will use DEFAULT NOW()
	} else {
		createdAt = collection.CreatedAt
	}

	query := fmt.Sprintf(`
		INSERT INTO "%s".collections (name, icon, color, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, r.schema)

	err := r.pool.QueryRow(ctx, query,
		collection.Name, collection.Icon, collection.Color, createdAt,
	).Scan(&collection.ID, &collection.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create collection: %w", err)
	}
	return nil
}

func (r *CollectionRepository) Update(ctx context.Context, collection *models.Collection) error {
	query := fmt.Sprintf(`
		UPDATE "%s".collections
		SET name = $1, icon = $2, color = $3
		WHERE id = $4
	`, r.schema)

	_, err := r.pool.Exec(ctx, query,
		collection.Name, collection.Icon, collection.Color, collection.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update collection: %w", err)
	}
	return nil
}

func (r *CollectionRepository) Delete(ctx context.Context, id int) error {
	query := fmt.Sprintf(`DELETE FROM "%s".collections WHERE id = $1`, r.schema)
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete collection: %w", err)
	}
	return nil
}

