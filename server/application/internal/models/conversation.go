package models

import "time"

// Conversation represents a saved conversation from an AI platform
type Conversation struct {
	ID             *int       `json:"id,omitempty" db:"id"`
	CanonicalURL   string     `json:"canonical_url" db:"canonical_url"`
	ShareURL       *string    `json:"share_url,omitempty" db:"share_url"`
	Source         string     `json:"source" db:"source"`
	Title          string     `json:"title" db:"title"`
	Description    *string    `json:"description,omitempty" db:"description"`
	Content        string     `json:"content" db:"content"`
	Tags           []string   `json:"tags" db:"tags"`
	CollectionID   *int       `json:"collection_id,omitempty" db:"collection_id"`
	Ignore         bool       `json:"ignore" db:"ignore"`
	Version        int        `json:"version" db:"version"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

