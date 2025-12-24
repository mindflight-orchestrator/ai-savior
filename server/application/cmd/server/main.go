package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/mindflight/save-my-chat-llm/server/application/config"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/api"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/api/handlers"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/repository"
	"github.com/mindflight/save-my-chat-llm/server/application/internal/service"
	"github.com/mindflight/save-my-chat-llm/server/application/pkg/database"
	"github.com/mindflight/save-my-chat-llm/server/application/pkg/migrations"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database connection
	db, err := database.New(cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	sqlDB := stdlib.OpenDB(*db.Pool.Config().ConnConfig)
	defer sqlDB.Close()

	ctx := context.Background()
	if err := migrations.RunMigrations(ctx, sqlDB, cfg.DBSchema); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations completed successfully")

	// Initialize repositories
	conversationRepo := repository.NewConversationRepository(db.Pool, cfg.DBSchema)
	snippetRepo := repository.NewSnippetRepository(db.Pool, cfg.DBSchema)
	collectionRepo := repository.NewCollectionRepository(db.Pool, cfg.DBSchema)
	settingsRepo := repository.NewSettingsRepository(db.Pool, cfg.DBSchema)

	// Initialize services
	conversationService := service.NewConversationService(conversationRepo)
	snippetService := service.NewSnippetService(snippetRepo)
	collectionService := service.NewCollectionService(collectionRepo)
	settingsService := service.NewSettingsService(settingsRepo)
	backupService := service.NewBackupService(
		db.Pool,
		conversationRepo,
		snippetRepo,
		collectionRepo,
		settingsRepo,
	)

	// Initialize handlers
	h := &api.Handlers{
		Conversations: handlers.NewConversationsHandler(conversationService),
		Snippets:      handlers.NewSnippetsHandler(snippetService),
		Collections:   handlers.NewCollectionsHandler(collectionService),
		Settings:      handlers.NewSettingsHandler(settingsService),
		Backup:        handlers.NewBackupHandler(backupService),
		Health:        handlers.NewHealthHandler(db.Pool),
	}

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "AI Saver Backend",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	})

	// Setup routes
	mwConfig := api.MiddlewareConfig{
		JWTSecret:    cfg.JWTSecret,
		APIKeySecret: cfg.APIKeySecret,
		CORSOrigins:  cfg.CORSOrigins,
		RateLimitMax: cfg.RateLimitMax,
	}
	api.SetupRoutes(app, h, mwConfig)

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Error shutting down: %v", err)
		}
	}()

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

