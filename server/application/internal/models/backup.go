package models

// BackupData represents the complete backup structure exported from the Chrome extension
// This matches the TypeScript BackupData interface defined in chrome_extension/src/types/backup.ts
//
// The JSON format is:
//
//	{
//	  "version": "1.0",
//	  "exported_at": "2024-01-15T10:30:00.000Z",
//	  "conversations": [...],
//	  "snippets": [...],
//	  "collections": [...],
//	  "settings": {...}
//	}
type BackupData struct {
	Version       string         `json:"version"`       // "1.0"
	ExportedAt    string         `json:"exported_at"`   // ISO 8601 timestamp (e.g., "2024-01-15T10:30:00.000Z")
	Conversations []Conversation `json:"conversations"` // Array of Conversation objects
	Snippets      []Snippet      `json:"snippets"`      // Array of Snippet objects
	Collections   []Collection   `json:"collections"`   // Array of Collection objects
	Settings      Settings       `json:"settings"`      // Settings object
}

// Note: The Conversation, Snippet, Collection, and Settings types are already defined
// in their respective files (conversation.go, snippet.go, collection.go, settings.go)
// and match the JSON structure exported from the Chrome extension.

// Note on Date Handling:
// - In the JSON file, all dates are ISO 8601 strings (e.g., "2024-01-15T10:30:00.000Z")
// - Go's encoding/json automatically parses ISO 8601 strings to time.Time when unmarshaling
// - When marshaling to JSON, time.Time is automatically converted to ISO 8601 format
//
// Note on Tags:
// - Tags are always []string (array of strings) in both Go and JSON
// - In JSON: "tags": ["tag1", "tag2", "tag3"]
// - Empty array: "tags": [] (never null)
// - Tags appear in Conversation and Snippet structures
//
// The existing types (Conversation, Snippet, Collection, Settings) already use time.Time
// and will work correctly with the JSON format exported from the Chrome extension.
