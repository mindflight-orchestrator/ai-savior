package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
)

type BackupHandler struct {
	service *service.BackupService
}

func NewBackupHandler(service *service.BackupService) *BackupHandler {
	return &BackupHandler{service: service}
}

func (h *BackupHandler) Import(c *fiber.Ctx) error {
	var req models.BackupImportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	response, err := h.service.Import(c.Context(), &req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to import backup"})
	}

	return c.JSON(response)
}

