package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
)

type BackupService struct {
	pool              *pgxpool.Pool
	conversationRepo  *repository.ConversationRepository
	snippetRepo       *repository.SnippetRepository
	collectionRepo    *repository.CollectionRepository
	settingsRepo      *repository.SettingsRepository
}

func NewBackupService(
	pool *pgxpool.Pool,
	conversationRepo *repository.ConversationRepository,
	snippetRepo *repository.SnippetRepository,
	collectionRepo *repository.CollectionRepository,
	settingsRepo *repository.SettingsRepository,
) *BackupService {
	return &BackupService{
		pool:             pool,
		conversationRepo: conversationRepo,
		snippetRepo:      snippetRepo,
		collectionRepo:   collectionRepo,
		settingsRepo:     settingsRepo,
	}
}

func (s *BackupService) Import(ctx context.Context, backup *models.BackupImportRequest) (*models.BackupImportResponse, error) {
	response := &models.BackupImportResponse{}

	// Import conversations
	for _, conv := range backup.Conversations {
		existing, err := s.conversationRepo.GetByCanonicalURL(ctx, conv.CanonicalURL)
		if err != nil {
			response.Errors++
			continue
		}

		if existing != nil {
			// Update existing - preserve original creation date
			conv.ID = existing.ID
			conv.Version = existing.Version + 1
			conv.CreatedAt = existing.CreatedAt // Preserve original creation date
			if err := s.conversationRepo.Update(ctx, &conv); err != nil {
				response.Errors++
				continue
			}
			response.Updated++
		} else {
			// Create new - dates will be preserved if provided in backup
			if conv.Version == 0 {
				conv.Version = 1
			}
			if err := s.conversationRepo.Create(ctx, &conv); err != nil {
				response.Errors++
				continue
			}
			response.Created++
		}
	}

	// Import collections first (they may be referenced by conversations)
	for _, collection := range backup.Collections {
		existing, err := s.collectionRepo.GetByName(ctx, collection.Name)
		if err != nil {
			response.Errors++
			continue
		}

		if existing != nil {
			// Update existing collection
			collection.ID = existing.ID
			collection.CreatedAt = existing.CreatedAt // Preserve original creation date
			if err := s.collectionRepo.Update(ctx, &collection); err != nil {
				response.Errors++
				continue
			}
			response.Updated++
		} else {
			// Create new collection (dates will be preserved if provided in backup)
			if err := s.collectionRepo.Create(ctx, &collection); err != nil {
				response.Errors++
				continue
			}
			response.Created++
		}
	}

	// Import snippets (dates will be preserved if provided in backup)
	for _, snippet := range backup.Snippets {
		if err := s.snippetRepo.Create(ctx, &snippet); err != nil {
			response.Errors++
			continue
		}
		response.Created++
	}

	// Import settings
	if backup.Settings != nil {
		if err := s.settingsRepo.Update(ctx, backup.Settings); err != nil {
			response.Errors++
		} else {
			response.Updated++
		}
	}

	return response, nil
}

