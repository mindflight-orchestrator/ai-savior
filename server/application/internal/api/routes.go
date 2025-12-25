package api

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/api/handlers"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/api/middleware"
)

type Handlers struct {
	Conversations *handlers.ConversationsHandler
	Snippets      *handlers.SnippetsHandler
	Collections   *handlers.CollectionsHandler
	Settings      *handlers.SettingsHandler
	Backup        *handlers.BackupHandler
	Health        *handlers.HealthHandler
}

type MiddlewareConfig struct {
	JWTSecret     string
	APIKeySecret   string
	CORSOrigins   []string
	RateLimitMax  int
}

func SetupRoutes(app *fiber.App, h *Handlers, mwConfig MiddlewareConfig) {
	// Global middleware
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			// Always allow Chrome extension origins
			if strings.HasPrefix(origin, "chrome-extension://") {
				return true
			}
			// Check against configured origins
			for _, allowedOrigin := range mwConfig.CORSOrigins {
				if origin == allowedOrigin {
					return true
				}
			}
			return false
		},
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true, // Needed for API key authentication
	}))

	app.Use(limiter.New(limiter.Config{
		Max:        mwConfig.RateLimitMax,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
	}))

	// Error handler
	app.Use(middleware.ErrorHandler)

	// API routes
	api := app.Group("/api")

	// Public routes
	api.Get("/health", h.Health.Check)

	// Protected routes
	authMw := middleware.Auth(middleware.AuthConfig{
		JWTSecret:    mwConfig.JWTSecret,
		APIKeySecret: mwConfig.APIKeySecret,
	})

	protected := api.Group("", authMw)

	// Conversations routes
	conversations := protected.Group("/conversations")
	conversations.Get("/:id", h.Conversations.GetByID)
	conversations.Get("/url/:url", h.Conversations.GetByURL)
	conversations.Post("", h.Conversations.Create)
	conversations.Delete("/:id", h.Conversations.Delete)
	conversations.Get("/search", h.Conversations.Search)

	// Snippets routes
	snippets := protected.Group("/snippets")
	snippets.Get("", h.Snippets.List)
	snippets.Post("", h.Snippets.Create)
	snippets.Put("/:id", h.Snippets.Update)
	snippets.Delete("/:id", h.Snippets.Delete)

	// Collections routes
	collections := protected.Group("/collections")
	collections.Get("", h.Collections.List)
	collections.Post("", h.Collections.Create)
	collections.Put("/:id", h.Collections.Update)
	collections.Delete("/:id", h.Collections.Delete)

	// Settings routes
	settings := protected.Group("/settings")
	settings.Get("", h.Settings.Get)
	settings.Post("", h.Settings.Update)

	// Backup routes
	backup := protected.Group("/backup")
	backup.Post("/import", h.Backup.Import)
}

