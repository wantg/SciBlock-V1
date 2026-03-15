package repository

import (
	"context"

	"sciblock/go-api/internal/domain"
)

// SciNoteRepository defines all database operations for the scinotes table.
// The interface is the dependency boundary: services depend on this abstraction,
// not on the concrete pgx implementation.
type SciNoteRepository interface {
	// ListByUser returns all non-deleted SciNotes owned by the given user,
	// ordered by updated_at DESC.
	ListByUser(ctx context.Context, userID string) ([]domain.SciNote, error)

	// GetByID retrieves a single SciNote by primary key (regardless of is_deleted status).
	// Returns nil, nil when not found.
	GetByID(ctx context.Context, id string) (*domain.SciNote, error)

	// Create inserts a new SciNote row and returns the persisted record
	// (with server-assigned id, created_at, updated_at).
	Create(ctx context.Context, note domain.SciNote) (*domain.SciNote, error)

	// Update applies a partial patch to an existing SciNote.
	// Only non-nil fields in the patch are written.
	// Returns the updated record.
	Update(ctx context.Context, id string, patch domain.SciNotePatch) (*domain.SciNote, error)

	// SoftDelete sets is_deleted=true on the given SciNote.
	SoftDelete(ctx context.Context, id string) error
}
