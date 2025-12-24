# Development environment configuration
COMPOSE_FILE=docker-compose.dev.yml
POSTGRES_SERVICE=postgres
POSTGRES_USER?=mfoserver
POSTGRES_DB?=mfo
POSTGRES_VOLUME=save-my-chat-llm_postgres_data

# Development environment commands
.PHONY: help dev-build dev-run dev-stop dev-logs dev-start-pg dev-start-pg-fresh \
	dev-pg-nuke dev-shell-postgres dev-wait-pg

help:
	@echo "Available commands:"
	@echo "  make dev-build          - Build all Docker images"
	@echo "  make dev-run            - Start all services"
	@echo "  make dev-stop           - Stop all services"
	@echo "  make dev-logs           - Show logs (follow mode)"
	@echo "  make dev-start-pg       - Start PostgreSQL only"
	@echo "  make dev-start-pg-fresh - Rebuild and start PostgreSQL with fresh database"
	@echo "  make dev-pg-nuke        - Completely remove PostgreSQL (container, volume, image)"
	@echo "  make dev-shell-postgres - Open PostgreSQL shell"
	@echo "  make dev-wait-pg        - Wait for PostgreSQL to be ready"

# Build all services
dev-build:
	docker-compose -f $(COMPOSE_FILE) build

# Start all services
dev-run:
	docker-compose -f $(COMPOSE_FILE) up -d

# Stop all services
dev-stop:
	docker-compose -f $(COMPOSE_FILE) down

# Show logs
dev-logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

# Start PostgreSQL only
dev-start-pg:
	docker-compose -f $(COMPOSE_FILE) up -d $(POSTGRES_SERVICE)

# Rebuild and start PostgreSQL with fresh database
dev-start-pg-fresh:
	@echo "Stopping PostgreSQL container..."
	-docker-compose -f $(COMPOSE_FILE) stop $(POSTGRES_SERVICE)
	@echo "Removing PostgreSQL container..."
	-docker-compose -f $(COMPOSE_FILE) rm -f $(POSTGRES_SERVICE)
	@echo "Removing PostgreSQL volume..."
	-docker volume rm -f $(POSTGRES_VOLUME)
	@echo "Removing PostgreSQL image to force rebuild..."
	-docker rmi save-my-chat-llm-postgres
	@echo "Rebuilding PostgreSQL image..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache $(POSTGRES_SERVICE)
	@echo "Starting PostgreSQL with fresh database..."
	docker-compose -f $(COMPOSE_FILE) up -d $(POSTGRES_SERVICE)
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "=== PostgreSQL is ready with fresh database ==="

# Completely remove PostgreSQL (container, volume, image)
dev-pg-nuke:
	@echo "=== Nuking PostgreSQL (container, volume, image) ==="
	@echo "Stopping all services..."
	-docker-compose -f $(COMPOSE_FILE) down
	@echo "Removing PostgreSQL volume..."
	-docker volume rm -f $(POSTGRES_VOLUME)
	@echo "Removing PostgreSQL image..."
	-docker rmi -f save-my-chat-llm-postgres
	@echo "=== PostgreSQL nuked ==="

# Open PostgreSQL shell
dev-shell-postgres:
	docker-compose -f $(COMPOSE_FILE) exec $(POSTGRES_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

# Wait for PostgreSQL to be ready
dev-wait-pg:
	@echo "Waiting for PostgreSQL to be ready..."
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		docker-compose -f $(COMPOSE_FILE) exec -T $(POSTGRES_SERVICE) pg_isready -U $(POSTGRES_USER) -d $(POSTGRES_DB) >/dev/null 2>&1 && \
		echo "PostgreSQL is ready!" && exit 0; \
		sleep 1; \
		timeout=$$((timeout-1)); \
	done; \
	echo "PostgreSQL failed to start within 30 seconds" && exit 1 