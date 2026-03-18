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

        // NextSequenceNumber returns the next 1-based sequence number for a new record
        // under the given SciNote.  This is COUNT(non-deleted records) + 1.
        // The caller must hold an appropriate lock or accept a small window of
        // concurrent-creation races at very high concurrency (acceptable for this product).
        NextSequenceNumber(ctx context.Context, sciNoteID string) (int, error)

        // MarkDirty transitions a confirmed record to confirmed_dirty.
        // No-op if the record is already draft or confirmed_dirty.
        // Used by the Update path when current_modules changes on a confirmed record.
        MarkDirty(ctx context.Context, id string) error

        // HasDownstreamReference reports whether any non-deleted ExperimentRecord
        // has derived_from_record_id = id.  Used by SoftDelete to prevent removing
        // a record that another record inherits from.
        HasDownstreamReference(ctx context.Context, id string) (bool, error)

        // ConfirmRecord atomically confirms a record.
        //
        // confirmedModules: the heritable modules snapshot (already filtered by ExtractHeritableModules).
        // advanceContext: if true, advances the SciNote's inheritance context
        //                 (sets current_confirmed_modules, increments context_version, etc.).
        //                 This is determined by the service layer based on whether the
        //                 record is the current head of the inheritance chain.
        // sciNoteID: used only when advanceContext=true.
        //
        // Behaviour:
        //   - Sets confirmation_state = "confirmed", confirmed_modules, confirmed_at = now().
        //   - If advanceContext=true: also calls AdvanceContext on the SciNote in the same tx.
        //   - Returns the updated ExperimentRecord.
        ConfirmRecord(
                ctx context.Context,
                id string,
                confirmedModules json.RawMessage,
                advanceContext bool,
                sciNoteID string,
                recordSeq int,
        ) (*domain.ExperimentRecord, error)
}
