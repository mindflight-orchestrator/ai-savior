package service

import (
	"context"
	"fmt"

	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
)

type SnippetService struct {
	repo *repository.SnippetRepository
}

func NewSnippetService(repo *repository.SnippetRepository) *SnippetService {
	return &SnippetService{repo: repo}
}

func (s *SnippetService) GetByID(ctx context.Context, id int) (*models.Snippet, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *SnippetService) List(ctx context.Context, filters models.SnippetFilters) ([]models.Snippet, error) {
	return s.repo.List(ctx, filters)
}

func (s *SnippetService) Create(ctx context.Context, snippet *models.Snippet) error {
	// Validate required fields
	if snippet.Title == "" {
		return fmt.Errorf("title is required")
	}
	if snippet.Content == "" {
		return fmt.Errorf("content is required")
	}
	return s.repo.Create(ctx, snippet)
}

func (s *SnippetService) Update(ctx context.Context, snippet *models.Snippet) error {
	if snippet.ID == nil {
		return fmt.Errorf("id is required for update")
	}
	return s.repo.Update(ctx, snippet)
}

func (s *SnippetService) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

