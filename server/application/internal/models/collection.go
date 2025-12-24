package models

import "time"

// Collection represents a collection used to organize conversations
type Collection struct {
	ID        *int       `json:"id,omitempty" db:"id"`
	Name      string     `json:"name" db:"name"`
	Icon      *string    `json:"icon,omitempty" db:"icon"`
	Color     *string    `json:"color,omitempty" db:"color"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
}

