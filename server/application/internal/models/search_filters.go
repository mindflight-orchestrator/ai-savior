package models

// SearchFilters represents filters for searching conversations
type SearchFilters struct {
	Query        string
	Source       string
	Tags         []string
	CollectionID *int
}

// SnippetFilters represents filters for listing snippets
type SnippetFilters struct {
	Language             string
	Tags                 []string
	SourceConversationID *int
}

