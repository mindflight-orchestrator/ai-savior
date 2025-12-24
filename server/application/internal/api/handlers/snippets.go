package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
)

type SnippetsHandler struct {
	service *service.SnippetService
}

func NewSnippetsHandler(service *service.SnippetService) *SnippetsHandler {
	return &SnippetsHandler{service: service}
}

func (h *SnippetsHandler) List(c *fiber.Ctx) error {
	filters := models.SnippetFilters{
		Language: c.Query("language"),
	}

	// Parse tags (comma-separated)
	if tagsStr := c.Query("tags"); tagsStr != "" {
		tags := []string{}
		for _, tag := range splitCommaSeparated(tagsStr) {
			if tag != "" {
				tags = append(tags, tag)
			}
		}
		filters.Tags = tags
	}

	// Parse source_conversation_id
	if convIDStr := c.Query("source_conversation_id"); convIDStr != "" {
		if convID, err := strconv.Atoi(convIDStr); err == nil {
			filters.SourceConversationID = &convID
		}
	}

	snippets, err := h.service.List(c.Context(), filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list snippets"})
	}

	return c.JSON(snippets)
}

func (h *SnippetsHandler) Create(c *fiber.Ctx) error {
	var snippet models.Snippet
	if err := c.BodyParser(&snippet); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.Create(c.Context(), &snippet); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(snippet)
}

func (h *SnippetsHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid snippet ID"})
	}

	var snippet models.Snippet
	if err := c.BodyParser(&snippet); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	snippet.ID = &id
	if err := h.service.Update(c.Context(), &snippet); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(snippet)
}

func (h *SnippetsHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid snippet ID"})
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete snippet"})
	}

	return c.Status(204).Send(nil)
}

