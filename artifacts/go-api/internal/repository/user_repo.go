package repository

import (
	"context"

	"sciblock/go-api/internal/domain"
)

// UserRepository defines all database operations for the users table.
// The interface is the dependency boundary: services depend on this abstraction,
// not on the concrete pgx implementation.
type UserRepository interface {
	// GetByEmail retrieves a user by email address (case-insensitive).
	// Returns nil, nil when not found.
	GetByEmail(ctx context.Context, email string) (*domain.User, error)

	// GetByID retrieves a user by primary key.
	// Returns nil, nil when not found.
	GetByID(ctx context.Context, id string) (*domain.User, error)
}
