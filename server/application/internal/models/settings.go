package models

import (
	"encoding/json"
	"time"
)

// Settings represents extension settings
type Settings struct {
	ID                    *int                  `json:"id,omitempty" db:"id"`
	StorageMode           string                 `json:"storageMode" db:"storage_mode"`
	BeastEnabledPerDomain map[string]bool        `json:"beast_enabled_per_domain" db:"beast_enabled_per_domain"`
	SelectiveModeEnabled  bool                   `json:"selective_mode_enabled" db:"selective_mode_enabled"`
	DevModeEnabled        bool                   `json:"devModeEnabled" db:"dev_mode_enabled"`
	XPathsByDomain        map[string]XPathConfig `json:"xpaths_by_domain" db:"xpaths_by_domain"`
	CreatedAt             time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at" db:"updated_at"`
}

// XPathConfig represents XPath configuration for a domain
type XPathConfig struct {
	Conversation string `json:"conversation"`
	Message       string `json:"message"`
}

// Scan implements the sql.Scanner interface for JSONB fields
func (s *Settings) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}

