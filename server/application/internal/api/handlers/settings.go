package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
)

type SettingsHandler struct {
	service *service.SettingsService
}

func NewSettingsHandler(service *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{service: service}
}

func (h *SettingsHandler) Get(c *fiber.Ctx) error {
	settings, err := h.service.Get(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get settings"})
	}

	return c.JSON(settings)
}

func (h *SettingsHandler) Update(c *fiber.Ctx) error {
	var settings models.Settings
	if err := c.BodyParser(&settings); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.Update(c.Context(), &settings); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(settings)
}

