package models

import "time"

// Snippet represents a code snippet or excerpt
type Snippet struct {
	ID                   *int       `json:"id,omitempty" db:"id"`
	Title                string     `json:"title" db:"title"`
	Content              string     `json:"content" db:"content"`
	SourceURL            *string    `json:"source_url,omitempty" db:"source_url"`
	SourceConversationID *int       `json:"source_conversation_id,omitempty" db:"source_conversation_id"`
	Tags                 []string   `json:"tags" db:"tags"`
	Language             *string    `json:"language,omitempty" db:"language"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
}

