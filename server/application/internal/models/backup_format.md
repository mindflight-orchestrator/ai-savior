# Format JSON de Backup - AI Saver Extension

Ce document décrit le format JSON utilisé pour les backups exportés depuis l'extension Chrome AI Saver.

## Structure Go

```go
package models

import "time"

// BackupData représente la structure complète du backup
type BackupData struct {
    Version       string        `json:"version"`        // "1.0"
    ExportedAt    string        `json:"exported_at"`   // ISO 8601 timestamp
    Conversations []Conversation `json:"conversations"`
    Snippets      []Snippet      `json:"snippets"`
    Collections   []Collection   `json:"collections"`
    Settings      Settings       `json:"settings"`
}
```

## Format JSON

### Structure Principale

```json
{
  "version": "1.0",
  "exported_at": "2024-01-15T10:30:00.000Z",
  "conversations": [...],
  "snippets": [...],
  "collections": [...],
  "settings": {...}
}
```

### Champs

- **`version`** (string, requis) : Version du format de backup, actuellement `"1.0"`
- **`exported_at`** (string, requis) : Date et heure d'export au format ISO 8601 (UTC)
- **`conversations`** (array, requis) : Liste des conversations sauvegardées
- **`snippets`** (array, requis) : Liste des snippets de code
- **`collections`** (array, requis) : Liste des collections
- **`settings`** (object, requis) : Paramètres de l'extension

---

## Tags

Les tags sont un **tableau de chaînes de caractères** (`[]string` en Go, `string[]` en TypeScript).

### Structure

```go
Tags []string `json:"tags"`
```

### Format JSON

```json
"tags": ["tag1", "tag2", "tag3"]
```

### Caractéristiques

- **Type** : Tableau de strings
- **Peut être vide** : `[]` (tableau vide)
- **Jamais null** : Toujours présent, même si vide
- **Pas de doublons** : Les tags sont généralement uniques (gestion côté application)
- **Sensible à la casse** : "JavaScript" et "javascript" sont considérés comme différents
- **Pas de caractères spéciaux** : Généralement des lettres, chiffres, tirets et underscores

### Exemples

```json
// Tags pour une conversation
"tags": ["ai", "chatgpt", "programming", "python"]

// Tags pour un snippet
"tags": ["javascript", "async", "promise", "example"]

// Tableau vide
"tags": []
```

---

## Conversation

### Structure Go

```go
type Conversation struct {
    ID             *int       `json:"id,omitempty"`
    CanonicalURL   string     `json:"canonical_url"`
    ShareURL       *string    `json:"share_url,omitempty"`
    Source         string     `json:"source"`
    Title          string     `json:"title"`
    Description    *string    `json:"description,omitempty"`
    Content        string     `json:"content"`
    Tags           []string   `json:"tags"`
    CollectionID   *int       `json:"collection_id,omitempty"`
    Ignore         bool       `json:"ignore"`
    Version        int        `json:"version"`
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`
}
```

### Format JSON

```json
{
  "id": 1,
  "canonical_url": "https://chat.openai.com/c/abc123def456",
  "share_url": "https://chat.openai.com/share/xyz789",
  "source": "chatgpt",
  "title": "My Conversation Title",
  "description": "A brief description of the conversation",
  "content": "# Conversation\n\nUser: Hello\n\nAssistant: Hi! How can I help you?",
  "tags": ["test", "example", "ai"],  // Voir section "Tags" ci-dessus
  "collection_id": null,
  "ignore": false,
  "version": 1,
  "created_at": "2024-01-15T09:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z"
}
```

**Champ `tags`** : Tableau de strings (voir section "Tags" pour plus de détails)

### Valeurs possibles pour `source`

- `"chatgpt"`
- `"claude"`
- `"perplexity"`
- `"kimi"`
- `"mistral"`
- `"deepseek"`
- `"qwen"`
- `"manus"`
- `"grok"`
- `"other"`

---

## Snippet

### Structure Go

```go
type Snippet struct {
    ID                   *int       `json:"id,omitempty"`
    Title                string     `json:"title"`
    Content              string     `json:"content"`
    SourceURL            *string    `json:"source_url,omitempty"`
    SourceConversationID *int       `json:"source_conversation_id,omitempty"`
    Tags                 []string   `json:"tags"`
    Language             *string    `json:"language,omitempty"`
    CreatedAt            time.Time  `json:"created_at"`
}
```

### Format JSON

```json
{
  "id": 1,
  "title": "Example JavaScript Function",
  "content": "function hello() {\n  return 'world';\n}",
  "source_url": "https://chat.openai.com/c/abc123",
  "source_conversation_id": 1,
  "tags": ["javascript", "example", "function"],  // Voir section "Tags" ci-dessus
  "language": "javascript",
  "created_at": "2024-01-15T10:15:00.000Z"
}
```

**Champ `tags`** : Tableau de strings (voir section "Tags" pour plus de détails)

### Langages supportés

- `"javascript"`, `"typescript"`, `"python"`, `"java"`, `"cpp"`, `"c"`, `"go"`, `"rust"`, `"php"`, `"ruby"`, `"swift"`, `"kotlin"`, `"html"`, `"css"`, `"sql"`, `"bash"`, `"other"`

---

## Collection

### Structure Go

```go
type Collection struct {
    ID        *int       `json:"id,omitempty"`
    Name      string     `json:"name"`
    Icon      *string    `json:"icon,omitempty"`
    Color     *string    `json:"color,omitempty"`
    CreatedAt time.Time  `json:"created_at"`
}
```

### Format JSON

```json
{
  "id": 1,
  "name": "My Collection",
  "icon": "📁",
  "color": "#4285f4",
  "created_at": "2024-01-15T08:00:00.000Z"
}
```

---

## Settings

### Structure Go

```go
type Settings struct {
    ID                    *int                  `json:"id,omitempty"`
    StorageMode           string                 `json:"storageMode"`
    BackendURL            *string                `json:"backend_url,omitempty"`
    APIKey                *string                `json:"api_key,omitempty"`
    DisableLocalCache     bool                   `json:"disable_local_cache,omitempty"`
    BeastEnabledPerDomain map[string]bool        `json:"beast_enabled_per_domain"`
    SelectiveModeEnabled  bool                   `json:"selective_mode_enabled"`
    DevModeEnabled        bool                   `json:"devModeEnabled"`
    XPathsByDomain        map[string]XPathConfig `json:"xpaths_by_domain"`
    CreatedAt             time.Time              `json:"created_at,omitempty"`
    UpdatedAt             time.Time              `json:"updated_at,omitempty"`
}

type XPathConfig struct {
    Conversation string `json:"conversation"`
    Message      string `json:"message"`
}
```

### Format JSON

```json
{
  "id": 1,
  "storageMode": "local",
  "backend_url": null,
  "api_key": null,
  "disable_local_cache": false,
  "beast_enabled_per_domain": {
    "chat.openai.com": true,
    "chatgpt.com": true,
    "claude.ai": true,
    "www.perplexity.ai": true,
    "chat.mistral.ai": true
  },
  "selective_mode_enabled": false,
  "devModeEnabled": false,
  "xpaths_by_domain": {
    "chat.openai.com": {
      "conversation": "//div[@data-message]",
      "message": "//div[@role='article']"
    },
    "claude.ai": {
      "conversation": "//div[@class='conversation']",
      "message": "//div[@class='message']"
    }
  }
}
```

### Valeurs possibles pour `storageMode`

- `"local"` : Mode local uniquement (IndexedDB)
- `"cloud"` : Mode cloud (PostgreSQL + Go Backend)

---

## Exemple Complet

```json
{
  "version": "1.0",
  "exported_at": "2024-01-15T10:30:00.000Z",
  "conversations": [
    {
      "id": 1,
      "canonical_url": "https://chat.openai.com/c/abc123",
      "share_url": "https://chat.openai.com/share/xyz789",
      "source": "chatgpt",
      "title": "My First Conversation",
      "description": "A test conversation",
      "content": "# Conversation\n\nUser: Hello\n\nAssistant: Hi!",
      "tags": ["test", "example"],
      "collection_id": null,
      "ignore": false,
      "version": 1,
      "created_at": "2024-01-15T09:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "canonical_url": "https://claude.ai/chat/def456",
      "share_url": null,
      "source": "claude",
      "title": "Another Conversation",
      "description": null,
      "content": "User: Test\n\nAssistant: Response",
      "tags": ["claude"],
      "collection_id": 1,
      "ignore": false,
      "version": 1,
      "created_at": "2024-01-15T09:30:00.000Z",
      "updated_at": "2024-01-15T09:30:00.000Z"
    }
  ],
  "snippets": [
    {
      "id": 1,
      "title": "Hello World Function",
      "content": "function hello() {\n  return 'world';\n}",
      "source_url": "https://chat.openai.com/c/abc123",
      "source_conversation_id": 1,
      "tags": ["javascript", "example"],
      "language": "javascript",
      "created_at": "2024-01-15T10:15:00.000Z"
    }
  ],
  "collections": [
    {
      "id": 1,
      "name": "My Collection",
      "icon": "📁",
      "color": "#4285f4",
      "created_at": "2024-01-15T08:00:00.000Z"
    }
  ],
  "settings": {
    "id": 1,
    "storageMode": "local",
    "backend_url": null,
    "api_key": null,
    "disable_local_cache": false,
    "beast_enabled_per_domain": {
      "chat.openai.com": true,
      "claude.ai": true
    },
    "selective_mode_enabled": false,
    "devModeEnabled": false,
    "xpaths_by_domain": {}
  }
}
```

---

## Notes Importantes

1. **Dates** : Toutes les dates sont au format ISO 8601 (UTC) : `"2024-01-15T10:30:00.000Z"`

2. **Champs optionnels** : Les champs marqués `omitempty` peuvent être `null` ou absents du JSON

3. **IDs** : Les IDs peuvent être `null` pour les nouveaux éléments non encore sauvegardés

4. **Tags** : Les tags sont toujours un tableau, même s'il est vide : `[]`

5. **Version** : Le champ `version` dans les conversations est incrémenté à chaque mise à jour automatique (Beast Mode)

6. **Import** : Lors de l'import, les éléments existants sont identifiés par :
   - Conversations : `canonical_url`
   - Collections : `name`
   - Snippets : Création d'un nouveau snippet (pas de déduplication)

