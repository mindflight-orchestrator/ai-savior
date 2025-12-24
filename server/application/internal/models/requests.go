package models

// CreateConversationRequest represents a request to create a conversation
type CreateConversationRequest struct {
	CanonicalURL string   `json:"canonical_url" validate:"required"`
	ShareURL     *string  `json:"share_url,omitempty"`
	Source       string   `json:"source" validate:"required"`
	Title        string   `json:"title" validate:"required"`
	Description  *string  `json:"description,omitempty"`
	Content      string   `json:"content" validate:"required"`
	Tags         []string `json:"tags,omitempty"`
	CollectionID *int     `json:"collection_id,omitempty"`
	Ignore       bool     `json:"ignore,omitempty"`
}

// UpdateConversationRequest represents a request to update a conversation
type UpdateConversationRequest struct {
	Title        *string  `json:"title,omitempty"`
	Description  *string  `json:"description,omitempty"`
	Content      *string  `json:"content,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	CollectionID *int     `json:"collection_id,omitempty"`
	Ignore       *bool    `json:"ignore,omitempty"`
}

// SearchConversationsRequest represents search filters
type SearchConversationsRequest struct {
	Query        string   `json:"q,omitempty"`
	Source       string   `json:"source,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	CollectionID *int     `json:"collection_id,omitempty"`
}

// BackupImportRequest represents a backup import request
type BackupImportRequest struct {
	Conversations []Conversation `json:"conversations,omitempty"`
	Snippets      []Snippet      `json:"snippets,omitempty"`
	Collections   []Collection   `json:"collections,omitempty"`
	Settings      *Settings      `json:"settings,omitempty"`
}

// BackupImportResponse represents the result of a backup import
type BackupImportResponse struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
	Errors  int `json:"errors"`
}

