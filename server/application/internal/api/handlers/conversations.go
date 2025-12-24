package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
)

type ConversationsHandler struct {
	service *service.ConversationService
}

func NewConversationsHandler(service *service.ConversationService) *ConversationsHandler {
	return &ConversationsHandler{service: service}
}

func (h *ConversationsHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid conversation ID"})
	}

	conv, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get conversation"})
	}
	if conv == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Conversation not found"})
	}

	return c.JSON(conv)
}

func (h *ConversationsHandler) GetByURL(c *fiber.Ctx) error {
	url := c.Params("url")
	if url == "" {
		return c.Status(400).JSON(fiber.Map{"error": "URL parameter is required"})
	}

	conv, err := h.service.GetByCanonicalURL(c.Context(), url)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get conversation"})
	}
	if conv == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Conversation not found"})
	}

	return c.JSON(conv)
}

func (h *ConversationsHandler) Create(c *fiber.Ctx) error {
	var req models.CreateConversationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	conv := &models.Conversation{
		CanonicalURL: req.CanonicalURL,
		ShareURL:     req.ShareURL,
		Source:       req.Source,
		Title:        req.Title,
		Description:  req.Description,
		Content:      req.Content,
		Tags:         req.Tags,
		CollectionID: req.CollectionID,
		Ignore:       req.Ignore,
		Version:      1,
	}

	if err := h.service.Upsert(c.Context(), conv); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(conv)
}

func (h *ConversationsHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid conversation ID"})
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete conversation"})
	}

	return c.Status(204).Send(nil)
}

func (h *ConversationsHandler) Search(c *fiber.Ctx) error {
	filters := models.SearchFilters{
		Query:        c.Query("q"),
		Source:       c.Query("source"),
		CollectionID: nil,
	}

	// Parse tags (comma-separated or multiple query params)
	if tagsStr := c.Query("tags"); tagsStr != "" {
		// Split comma-separated tags
		tags := []string{}
		for _, tag := range splitCommaSeparated(tagsStr) {
			if tag != "" {
				tags = append(tags, tag)
			}
		}
		filters.Tags = tags
	}

	// Parse collection_id
	if collectionIDStr := c.Query("collection_id"); collectionIDStr != "" {
		if collectionID, err := strconv.Atoi(collectionIDStr); err == nil {
			filters.CollectionID = &collectionID
		}
	}

	conversations, err := h.service.Search(c.Context(), filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to search conversations"})
	}

	return c.JSON(conversations)
}

