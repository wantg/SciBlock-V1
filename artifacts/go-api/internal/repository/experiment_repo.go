// Package repository defines data-access interfaces and their pgx implementations.
//
// Rules enforced in this package:
//   - Repository functions return domain types, never raw database rows.
//   - Repositories contain no business logic — that belongs in the service layer.
//   - Each repository interface is defined in a *_repo.go file.
//   - Each pgx implementation lives in the corresponding *_repo_pgx.go file.
package repository

import (
        "context"
        "encoding/json"

        "sciblock/go-api/internal/domain"
)

// ExperimentRepository defines all database operations for experiment_records.
// The interface is the dependency boundary: services depend on this abstraction,
// not on the concrete pgx implementation.
type ExperimentRepository interface {
        // ListBySciNote returns ExperimentRecords under the given SciNote.
        // trashOnly=false → active records (is_deleted=false).
        // trashOnly=true  → trash records (is_deleted=true).
        ListBySciNote(ctx context.Context, sciNoteID string, trashOnly bool) ([]domain.ExperimentRecord, error)

        // GetByID retrieves a single ExperimentRecord by primary key.
        // Returns nil, nil when not found.
        GetByID(ctx context.Context, id string) (*domain.ExperimentRecord, error)

        // Create inserts a new ExperimentRecord row and returns the persisted record.
        Create(ctx context.Context, rec domain.ExperimentRecord) (*domain.ExperimentRecord, error)

        // Update applies a partial patch to an existing ExperimentRecord.
        // Only non-nil fields in the patch are written.
        Update(ctx context.Context, id string, patch domain.ExperimentPatch) (*domain.ExperimentRecord, error)

        // UpdateModules replaces the current_modules jsonb column wholesale.
        // Kept for potential future use by a module-level PATCH endpoint.
        UpdateModules(ctx context.Context, id string, modules json.RawMessage) error

        // SoftDelete sets is_deleted=true on the given ExperimentRecord.
        SoftDelete(ctx context.Context, id string) error

        // Restore sets is_deleted=false on the given ExperimentRecord.
        Restore(ctx context.Context, id string) error

        // ListRecentByUser returns the most recently updated active experiment records
        // across all SciNotes owned by userID.  Each row includes the parent SciNote
        // title so callers never need a follow-up query.
        // Only records with is_deleted=false are included.
        // Results are ordered by experiment updated_at DESC.
        // limit must be between 1 and 50 (inclusive); the caller is responsible for
        // clamping the value before calling this method.
        ListRecentByUser(ctx context.Context, userID string, limit int) ([]domain.RecentExperimentRow, error)

        // CountBySciNoteIDs returns a map[sciNoteID]count of non-deleted experiment
        // records for each ID in the supplied slice.  SciNote IDs with zero records
        // are omitted from the returned map (callers should use map[id] with 0 default).
        // A single SQL query is issued regardless of the number of IDs.
        CountBySciNoteIDs(ctx context.Context, ids []string) (map[string]int, error)
}
