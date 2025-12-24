package service

import (
	"context"

	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
)

type SettingsService struct {
	repo *repository.SettingsRepository
}

func NewSettingsService(repo *repository.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

func (s *SettingsService) Get(ctx context.Context) (*models.Settings, error) {
	return s.repo.Get(ctx)
}

func (s *SettingsService) Update(ctx context.Context, settings *models.Settings) error {
	return s.repo.Update(ctx, settings)
}

