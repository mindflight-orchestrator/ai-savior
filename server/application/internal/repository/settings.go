package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
)

type SettingsRepository struct {
	pool   *pgxpool.Pool
	schema string
}

func NewSettingsRepository(pool *pgxpool.Pool, schema string) *SettingsRepository {
	return &SettingsRepository{
		pool:   pool,
		schema: schema,
	}
}

func (r *SettingsRepository) Get(ctx context.Context) (*models.Settings, error) {
	query := fmt.Sprintf(`
		SELECT id, storage_mode, backend_url, api_key, disable_local_cache,
		       beast_enabled_per_domain, selective_mode_enabled,
		       dev_mode_enabled, xpaths_by_domain, created_at, updated_at
		FROM "%s".settings
		WHERE id = 1
	`, r.schema)

	var settings models.Settings
	var beastEnabledJSON []byte
	var xpathsJSON []byte

	err := r.pool.QueryRow(ctx, query).Scan(
		&settings.ID, &settings.StorageMode, &settings.BackendURL, &settings.APIKey,
		&settings.DisableLocalCache, &beastEnabledJSON,
		&settings.SelectiveModeEnabled, &settings.DevModeEnabled,
		&xpathsJSON, &settings.CreatedAt, &settings.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		// Return default settings if none exist
		return &models.Settings{
			ID:                   intPtr(1),
			StorageMode:          "local",
			BeastEnabledPerDomain: make(map[string]bool),
			XPathsByDomain:       make(map[string]models.XPathConfig),
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	// Parse JSONB fields
	if err := json.Unmarshal(beastEnabledJSON, &settings.BeastEnabledPerDomain); err != nil {
		return nil, fmt.Errorf("failed to parse beast_enabled_per_domain: %w", err)
	}
	if err := json.Unmarshal(xpathsJSON, &settings.XPathsByDomain); err != nil {
		return nil, fmt.Errorf("failed to parse xpaths_by_domain: %w", err)
	}

	return &settings, nil
}

func (r *SettingsRepository) Update(ctx context.Context, settings *models.Settings) error {
	beastEnabledJSON, err := json.Marshal(settings.BeastEnabledPerDomain)
	if err != nil {
		return fmt.Errorf("failed to marshal beast_enabled_per_domain: %w", err)
	}

	xpathsJSON, err := json.Marshal(settings.XPathsByDomain)
	if err != nil {
		return fmt.Errorf("failed to marshal xpaths_by_domain: %w", err)
	}

	query := fmt.Sprintf(`
		INSERT INTO "%s".settings
		(id, storage_mode, backend_url, api_key, disable_local_cache,
		 beast_enabled_per_domain, selective_mode_enabled,
		 dev_mode_enabled, xpaths_by_domain, created_at, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			storage_mode = EXCLUDED.storage_mode,
			backend_url = EXCLUDED.backend_url,
			api_key = EXCLUDED.api_key,
			disable_local_cache = EXCLUDED.disable_local_cache,
			beast_enabled_per_domain = EXCLUDED.beast_enabled_per_domain,
			selective_mode_enabled = EXCLUDED.selective_mode_enabled,
			dev_mode_enabled = EXCLUDED.dev_mode_enabled,
			xpaths_by_domain = EXCLUDED.xpaths_by_domain,
			updated_at = NOW()
		RETURNING created_at, updated_at
	`, r.schema)

	err = r.pool.QueryRow(ctx, query,
		settings.StorageMode, settings.BackendURL, settings.APIKey, settings.DisableLocalCache,
		beastEnabledJSON, settings.SelectiveModeEnabled,
		settings.DevModeEnabled, xpathsJSON,
	).Scan(&settings.CreatedAt, &settings.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	settings.ID = intPtr(1)
	return nil
}

func intPtr(i int) *int {
	return &i
}

