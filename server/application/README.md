# AI Saver Backend

Go REST API backend for the AI Saver Chrome extension, providing cloud storage capabilities with PostgreSQL.

## Features

- RESTful API for conversations, snippets, collections, and settings
- PostgreSQL database with automatic migrations
- JWT and API key authentication
- CORS support
- Rate limiting
- Backup import functionality
- Health check endpoint

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 15 or higher
- Docker (optional, for containerized deployment)

## Configuration

Create a `.env` file in the root directory (see `.env.example` for template):

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=mfoserver
DB_PASSWORD=mfoserver
DB_NAME=mfo
DB_SCHEMA=mfo-server
DB_SSL_MODE=disable
JWT_SECRET=your-secret-key
API_KEY_SECRET=your-api-key-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_MAX=100
```

## Local Development

1. Install dependencies:
```bash
go mod download
```

2. Ensure PostgreSQL is running and accessible

3. Run the server:
```bash
go run cmd/server/main.go
```

The server will start on `http://localhost:8080` (or the port specified in `PORT`).

## API Endpoints

### Health Check

- `GET /api/health` - Check server and database health

### Conversations

- `GET /api/conversations/:id` - Get conversation by ID
- `GET /api/conversations/url/:url` - Get conversation by canonical URL (URL encoded)
- `POST /api/conversations` - Create/update conversation (upsert by canonical_url)
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/search?q=...&source=...&tags=...&collection_id=...` - Search conversations

### Snippets

- `GET /api/snippets?language=...&tags=...&source_conversation_id=...` - List snippets with filters
- `POST /api/snippets` - Create snippet
- `PUT /api/snippets/:id` - Update snippet
- `DELETE /api/snippets/:id` - Delete snippet

### Collections

- `GET /api/collections` - List all collections
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

### Settings

- `GET /api/settings` - Get settings
- `POST /api/settings` - Update settings

### Backup

- `POST /api/backup/import` - Import backup JSON

## Authentication

The API supports two authentication methods:

### JWT Authentication

Set `JWT_SECRET` in your environment variables. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### API Key Authentication

Set `API_KEY_SECRET` in your environment variables. Include the API key in the Authorization header:

```
Authorization: Bearer <api-key>
```

## Request/Response Examples

### Create Conversation

**Request:**
```json
POST /api/conversations
{
  "canonical_url": "https://chat.openai.com/c/123",
  "source": "chatgpt",
  "title": "My Conversation",
  "content": "# Conversation\n\nContent here...",
  "tags": ["ai", "chatgpt"],
  "ignore": false
}
```

**Response:**
```json
{
  "id": 1,
  "canonical_url": "https://chat.openai.com/c/123",
  "source": "chatgpt",
  "title": "My Conversation",
  "content": "# Conversation\n\nContent here...",
  "tags": ["ai", "chatgpt"],
  "ignore": false,
  "version": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Search Conversations

**Request:**
```
GET /api/conversations/search?q=python&source=chatgpt&tags=ai
```

**Response:**
```json
[
  {
    "id": 1,
    "canonical_url": "https://chat.openai.com/c/123",
    "source": "chatgpt",
    "title": "Python Tutorial",
    "tags": ["ai", "python"],
    ...
  }
]
```

## Error Codes

- `BAD_REQUEST` (400) - Invalid request data
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `INTERNAL_SERVER_ERROR` (500) - Server error
- `SERVICE_UNAVAILABLE` (503) - Service unavailable (e.g., database connection failed)

## Database Migrations

Migrations are automatically run on server startup. Migration files are located in `pkg/migrations/` and are executed in alphabetical order.

## Docker Deployment

Build the Docker image:

```bash
docker build -t ai-saver-backend .
```

Run the container:

```bash
docker run -p 8080:8080 --env-file .env ai-saver-backend
```

## Project Structure

```
server/application/
├── cmd/server/          # Application entry point
├── internal/
│   ├── api/            # HTTP handlers, routes, middleware
│   ├── models/         # Data models and DTOs
│   ├── repository/     # Database access layer
│   └── service/        # Business logic layer
├── pkg/
│   ├── database/       # Database connection
│   ├── migrations/     # Migration files and runner
│   └── auth/           # Authentication utilities
├── config/             # Configuration management
└── migrations/         # SQL migration files
```

## License

[Your License Here]

