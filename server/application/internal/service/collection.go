package service

import (
	"context"
	"fmt"

	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
)

type CollectionService struct {
	repo *repository.CollectionRepository
}

func NewCollectionService(repo *repository.CollectionRepository) *CollectionService {
	return &CollectionService{repo: repo}
}

func (s *CollectionService) GetByID(ctx context.Context, id int) (*models.Collection, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CollectionService) List(ctx context.Context) ([]models.Collection, error) {
	return s.repo.List(ctx)
}

func (s *CollectionService) Create(ctx context.Context, collection *models.Collection) error {
	// Validate required fields
	if collection.Name == "" {
		return fmt.Errorf("name is required")
	}
	return s.repo.Create(ctx, collection)
}

func (s *CollectionService) Update(ctx context.Context, collection *models.Collection) error {
	if collection.ID == nil {
		return fmt.Errorf("id is required for update")
	}
	if collection.Name == "" {
		return fmt.Errorf("name is required")
	}
	return s.repo.Update(ctx, collection)
}

func (s *CollectionService) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

