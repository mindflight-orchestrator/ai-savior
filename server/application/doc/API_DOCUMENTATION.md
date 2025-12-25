# API Documentation

This directory contains the OpenAPI 3.0 specification for the Save My Chat LLM API.

## Files

- `openapi.yaml` - Complete OpenAPI 3.0 specification documenting all API endpoints, request/response schemas, authentication, and error responses

## Usage

### Viewing the Documentation

You can view and interact with the API documentation using various tools:

#### Swagger UI (Recommended)
```bash
# Using Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd)/openapi.yaml:/openapi.yaml swaggerapi/swagger-ui

# Or using npx
npx @redocly/cli preview-docs openapi.yaml
```

#### Redoc
```bash
npx @redocly/cli preview-docs openapi.yaml
```

#### Online Tools
- Upload `openapi.yaml` to [Swagger Editor](https://editor.swagger.io/)
- Upload `openapi.yaml` to [Redocly](https://redocly.com/)

### Code Generation

Generate client SDKs or server stubs from the OpenAPI spec:

```bash
# Using OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o ./generated

# Or for TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated
```

## API Overview

### Base URL
- Development: `http://localhost:8080/api`
- Production: `https://api.example.com/api` (update in `openapi.yaml`)

### Authentication

All protected endpoints require authentication via:
- **JWT Token**: `Authorization: Bearer <jwt_token>`
- **API Key**: `Authorization: Bearer <api_key>`

### Endpoints

#### Health
- `GET /health` - Health check (public)

#### Conversations
- `GET /conversations/search` - Search conversations with filters (query params: `q`, `source`, `tags`, `collection_id`)
- `GET /conversations/{id}` - Get conversation by ID
- `GET /conversations/url/{url}` - Get conversation by URL
- `POST /conversations` - Create/update conversation (upsert based on `canonical_url`)
- `DELETE /conversations/{id}` - Delete conversation

#### Snippets
- `GET /snippets` - List snippets with filters
- `POST /snippets` - Create snippet
- `PUT /snippets/{id}` - Update snippet
- `DELETE /snippets/{id}` - Delete snippet

#### Collections
- `GET /collections` - List collections
- `POST /collections` - Create collection
- `PUT /collections/{id}` - Update collection
- `DELETE /collections/{id}` - Delete collection

#### Settings
- `GET /settings` - Get settings
- `POST /settings` - Update settings

#### Backup
- `POST /backup/import` - Import backup data

## Migration to pg_facets

This OpenAPI specification is essential for migrating from direct SQL queries to queries using the `pg_facets` PostgreSQL extension. The specification documents:

1. **Request/Response Formats**: Exact JSON schemas for all endpoints
2. **Query Parameters**: All filter parameters for search/list endpoints
3. **Data Types**: Field types, nullability, and constraints
4. **Relationships**: How entities relate (e.g., `collection_id` in conversations)

### Key Information for pg_facets Migration

#### Search Endpoints
The following endpoints support filtering and will benefit from `pg_facets`:

- **GET /conversations/search**
  - Query parameters: `q`, `source`, `tags`, `collection_id`
  - Returns: Array of `Conversation` objects

- **GET /snippets**
  - Query parameters: `language`, `tags`, `source_conversation_id`
  - Returns: Array of `Snippet` objects

#### Data Structures

**Conversation**:
- `tags`: Array of strings (PostgreSQL array type)
- `collection_id`: Foreign key to collections
- Full-text search on `content`, `title`, `description`

**Snippet**:
- `tags`: Array of strings
- `source_conversation_id`: Foreign key to conversations
- `language`: String filter

**Collection**:
- Simple structure, used as a filter in conversations

### Example Queries for pg_facets

Based on the API specification, here are example query patterns that can be implemented with `pg_facets`:

```sql
-- Search conversations with multiple filters
SELECT * FROM conversations
WHERE 
  (pg_facets.match_text(content, :query) OR 
   pg_facets.match_text(title, :query))
  AND source = :source
  AND tags && :tags_array
  AND (collection_id = :collection_id OR :collection_id IS NULL);

-- List snippets with filters
SELECT * FROM snippets
WHERE 
  (language = :language OR :language IS NULL)
  AND tags && :tags_array
  AND (source_conversation_id = :conv_id OR :conv_id IS NULL);
```

## Validation

The OpenAPI spec can be validated using:

```bash
# Using Swagger CLI
npx @apidevtools/swagger-cli validate openapi.yaml

# Using Redocly
npx @redocly/cli lint openapi.yaml
```

## Updating the Documentation

When adding new endpoints or modifying existing ones:

1. Update `openapi.yaml` with the new endpoint definition
2. Add request/response schemas to the `components/schemas` section
3. Update this README if needed
4. Validate the spec: `npx @apidevtools/swagger-cli validate openapi.yaml`

## Integration with Code

The Go models in `internal/models/` should match the schemas defined in `openapi.yaml`. When making changes:

1. Update the Go models first
2. Update the OpenAPI spec to reflect the changes
3. Ensure JSON tags match between Go structs and OpenAPI schemas

