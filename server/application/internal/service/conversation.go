package service

import (
	"context"
	"fmt"

	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
)

type ConversationService struct {
	repo *repository.ConversationRepository
}

func NewConversationService(repo *repository.ConversationRepository) *ConversationService {
	return &ConversationService{repo: repo}
}

func (s *ConversationService) GetByID(ctx context.Context, id int) (*models.Conversation, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ConversationService) GetByCanonicalURL(ctx context.Context, url string) (*models.Conversation, error) {
	return s.repo.GetByCanonicalURL(ctx, url)
}

func (s *ConversationService) Upsert(ctx context.Context, conv *models.Conversation) error {
	// Validate required fields
	if conv.CanonicalURL == "" {
		return fmt.Errorf("canonical_url is required")
	}
	if conv.Source == "" {
		return fmt.Errorf("source is required")
	}
	if conv.Title == "" {
		return fmt.Errorf("title is required")
	}
	if conv.Content == "" {
		return fmt.Errorf("content is required")
	}

	// Check if conversation exists
	existing, err := s.repo.GetByCanonicalURL(ctx, conv.CanonicalURL)
	if err != nil {
		return fmt.Errorf("failed to check existing conversation: %w", err)
	}

	if existing != nil {
		// Update existing conversation
		conv.ID = existing.ID
		conv.Version = existing.Version + 1
		conv.CreatedAt = existing.CreatedAt
		// Preserve ignore flag if not explicitly set
		if conv.Ignore == false && existing.Ignore == true {
			conv.Ignore = existing.Ignore
		}
		return s.repo.Update(ctx, conv)
	}

	// Create new conversation
	if conv.Version == 0 {
		conv.Version = 1
	}
	return s.repo.Create(ctx, conv)
}

func (s *ConversationService) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

func (s *ConversationService) Search(ctx context.Context, filters models.SearchFilters) ([]models.Conversation, error) {
	return s.repo.Search(ctx, filters)
}

