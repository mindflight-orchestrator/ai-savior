package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/models"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
)

type CollectionsHandler struct {
	service *service.CollectionService
}

func NewCollectionsHandler(service *service.CollectionService) *CollectionsHandler {
	return &CollectionsHandler{service: service}
}

func (h *CollectionsHandler) List(c *fiber.Ctx) error {
	collections, err := h.service.List(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list collections"})
	}

	return c.JSON(collections)
}

func (h *CollectionsHandler) Create(c *fiber.Ctx) error {
	var collection models.Collection
	if err := c.BodyParser(&collection); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.Create(c.Context(), &collection); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(collection)
}

func (h *CollectionsHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid collection ID"})
	}

	var collection models.Collection
	if err := c.BodyParser(&collection); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	collection.ID = &id
	if err := h.service.Update(c.Context(), &collection); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(collection)
}

func (h *CollectionsHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid collection ID"})
	}

	if err := h.service.Delete(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete collection"})
	}

	return c.Status(204).Send(nil)
}

