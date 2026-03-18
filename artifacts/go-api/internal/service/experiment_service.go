// Package service implements the business logic layer.
//
// Rules enforced in this package:
//   - Service functions must NOT import net/http or any handler/dto package.
//   - Service functions must NOT call pgx or any DB driver directly.
//   - All data access goes through repository interfaces.
//   - All cross-cutting sentinel errors (ErrNotFound, ErrForbidden) are declared here
//     and mapped to HTTP status codes exclusively in the handler layer.
package service

import (
        "context"
        "fmt"

        "sciblock/go-api/internal/domain"
        "sciblock/go-api/internal/repository"
)

// ExperimentService handles all business logic for ExperimentRecord.
type ExperimentService struct {
        repo     repository.ExperimentRepository
        sciNotes repository.SciNoteRepository
        shares   repository.ShareRepository
}

// NewExperimentService creates an ExperimentService with its required dependencies.
func NewExperimentService(
        repo repository.ExperimentRepository,
        sciNotes repository.SciNoteRepository,
        shares repository.ShareRepository,
) *ExperimentService {
        return &ExperimentService{repo: repo, sciNotes: sciNotes, shares: shares}
}

// List returns all ExperimentRecords for a SciNote owned by callerUserID.
// When trashOnly is true, only soft-deleted records are returned (trash view).
func (s *ExperimentService) List(ctx context.Context, sciNoteID, callerUserID string, trashOnly bool) ([]domain.ExperimentRecord, error) {
        note, err := s.sciNotes.GetByID(ctx, sciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get scinote: %w", err)
        }
        if note == nil {
                return nil, ErrNotFound
        }
        if note.UserID != callerUserID {
                return nil, ErrForbidden
        }

        records, err := s.repo.ListBySciNote(ctx, sciNoteID, trashOnly)
        if err != nil {
                return nil, fmt.Errorf("list experiments: %w", err)
        }
        return records, nil
}

// Get retrieves a single ExperimentRecord by ID.
//
// Access is granted when either:
//  1. The caller owns the parent SciNote (normal ownership path), or
//  2. The caller has been granted read access via a share record.
//
// Mutating operations (Update, SoftDelete, Restore) always require ownership.
func (s *ExperimentService) Get(ctx context.Context, id, callerUserID string) (*domain.ExperimentRecord, error) {
        rec, err := s.repo.GetByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("get experiment: %w", err)
        }
        if rec == nil {
                return nil, ErrNotFound
        }

        note, err := s.sciNotes.GetByID(ctx, rec.SciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get parent scinote: %w", err)
        }

        // Primary path: caller is the SciNote owner.
        if note != nil && note.UserID == callerUserID {
                return rec, nil
        }

        // Fallback: caller has been granted access via a share record.
        ok, err := s.shares.HasShareAccess(ctx, id, callerUserID)
        if err != nil {
                return nil, fmt.Errorf("check share access: %w", err)
        }
        if ok {
                return rec, nil
        }

        return nil, ErrForbidden
}

// Create inserts a new ExperimentRecord under sciNoteID, applying inheritance logic.
//
// Inheritance resolution (server-authoritative):
//  1. If scinotes.current_confirmed_modules is set → use it as the default for heritable modules.
//  2. Else if scinotes.initial_modules is set → use it.
//  3. Else (first record ever for this SciNote):
//     a. Extract heritable modules from input.CurrentModules.
//     b. Persist them as scinotes.initial_modules (immutable after this first write).
//     c. Use the extracted modules as defaults.
//
// The merged modules are written into experiment_records.current_modules.
// Lineage fields (derived_from_*) are set from the SciNote's current context.
// sequence_number is assigned as COUNT(existing active records) + 1.
func (s *ExperimentService) Create(ctx context.Context, sciNoteID string, input domain.CreateExperimentInput, callerUserID string) (*domain.ExperimentRecord, error) {
        // 1. Ownership check.
        note, err := s.sciNotes.GetByID(ctx, sciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get scinote: %w", err)
        }
        if note == nil {
                return nil, ErrNotFound
        }
        if note.UserID != callerUserID {
                return nil, ErrForbidden
        }

        // 2. Assign next sequence number.
        seqNum, err := s.repo.NextSequenceNumber(ctx, sciNoteID)
        if err != nil {
                return nil, fmt.Errorf("next sequence number: %w", err)
        }

        // 3. Resolve inheritance source.
        var (
                heritableDefaults   = note.CurrentConfirmedModules // non-nil → use confirmed context
                sourceType          = domain.SourceRecord
                sourceDerivedFromID *string
                sourceDerivedSeq    *int
                contextVer          = note.ContextVersion
        )

        if len(heritableDefaults) == 0 {
                // No confirmed context yet — fall back to initial_modules.
                heritableDefaults = note.InitialModules
                sourceType = domain.SourceInitial
                sourceDerivedFromID = nil
                sourceDerivedSeq = nil
        } else {
                // Confirmed context exists — record lineage to the last confirmed record.
                sourceDerivedFromID = note.LastConfirmedRecordID
                sourceDerivedSeq = note.LastConfirmedRecordSeq
        }

        if len(heritableDefaults) == 0 {
                // Bootstrap case: no initial_modules set yet.
                // Extract heritable modules from the caller-supplied modules and store them
                // as the immutable initial_modules for this SciNote.
                extracted, extractErr := domain.ExtractHeritableModules(input.CurrentModules)
                if extractErr != nil {
                        // Non-fatal: proceed without inheritance if extraction fails.
                        extracted = nil
                }
                if len(extracted) > 0 {
                        if _, setErr := s.sciNotes.SetInitialModules(ctx, sciNoteID, extracted); setErr != nil {
                                // Non-fatal: initial_modules may already be set by a concurrent request.
                                // Re-fetch to get the current state.
                                if refreshed, refErr := s.sciNotes.GetByID(ctx, sciNoteID); refErr == nil && refreshed != nil {
                                        note = refreshed
                                        if len(note.InitialModules) > 0 {
                                                heritableDefaults = note.InitialModules
                                        }
                                }
                        } else {
                                heritableDefaults = extracted
                        }
                }
                sourceType = domain.SourceInitial
        }

        // 4. Merge inherited heritable modules into the new record's modules.
        //    Non-heritable slots (e.g. "data") are kept from the caller-supplied modules.
        mergedModules, mergeErr := domain.MergeHeritableModules(input.CurrentModules, heritableDefaults)
        if mergeErr != nil {
                mergedModules = input.CurrentModules // fallback: use caller modules as-is
        }

        // 5. Apply business defaults.
        status := input.ExperimentStatus
        if status == "" {
                status = domain.StatusExploring
        }
        tags := input.Tags
        if tags == nil {
                tags = []string{}
        }

        // 6. Persist the new record.
        rec := domain.ExperimentRecord{
                SciNoteID:             sciNoteID,
                Title:                 input.Title,
                PurposeInput:          input.PurposeInput,
                ExperimentStatus:      status,
                ExperimentCode:        input.ExperimentCode,
                Tags:                  tags,
                EditorContent:         input.EditorContent,
                CurrentModules:        mergedModules,
                InheritedVersionID:    input.InheritedVersionID,
                SequenceNumber:        seqNum,
                ConfirmationState:     domain.Statedraft,
                DerivedFromSourceType: sourceType,
                DerivedFromRecordID:   sourceDerivedFromID,
                DerivedFromRecordSeq:  sourceDerivedSeq,
                DerivedFromContextVer: contextVer,
        }

        created, err := s.repo.Create(ctx, rec)
        if err != nil {
                return nil, fmt.Errorf("create experiment: %w", err)
        }
        return created, nil
}

// Update applies a partial patch to an ExperimentRecord, verifying ownership.
// Only non-nil fields in the patch are written to the database.
//
// Dirty-state transition: if the patch includes CurrentModules AND the record's
// current confirmation_state is "confirmed", the record is transitioned to
// "confirmed_dirty" so the frontend can display the appropriate indicator and
// prompt the user to re-confirm.
//
// Note: Update intentionally does NOT fall back to share access — recipients
// may only read shared content, not modify it.
func (s *ExperimentService) Update(ctx context.Context, id string, patch domain.ExperimentPatch, callerUserID string) (*domain.ExperimentRecord, error) {
        rec, err := s.repo.GetByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("get experiment: %w", err)
        }
        if rec == nil {
                return nil, ErrNotFound
        }

        note, err := s.sciNotes.GetByID(ctx, rec.SciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get parent scinote: %w", err)
        }
        if note == nil || note.UserID != callerUserID {
                return nil, ErrForbidden
        }

        updated, err := s.repo.Update(ctx, id, patch)
        if err != nil {
                return nil, fmt.Errorf("update experiment: %w", err)
        }

        // Dirty-state transition: if current_modules changed on a confirmed record,
        // mark the record confirmed_dirty.  MarkDirty is a no-op for non-confirmed records.
        if len(patch.CurrentModules) > 0 && rec.ConfirmationState == domain.StateConfirmed {
                if dirtyErr := s.repo.MarkDirty(ctx, id); dirtyErr != nil {
                        // Non-fatal: log and continue; the update itself succeeded.
                        // In practice MarkDirty only fails on DB connection errors.
                        _ = dirtyErr
                } else if updated != nil {
                        updated.ConfirmationState = domain.StateConfirmedDirty
                }
        }

        return updated, nil
}

// Confirm executes the confirm-save workflow for an ExperimentRecord.
//
// Idempotency rules:
//   - If the record is already confirmed AND the heritable content of
//     current_modules matches confirmed_modules → pure no-op, return current record.
//   - If the record is draft → first confirm: always advances the inheritance chain.
//   - If the record is confirmed_dirty → re-confirm: advances the chain only if this
//     record is still the "head" (i.e. it is the SciNote's last confirmed record).
//     Otherwise only the record itself is updated (no chain advancement).
//
// All state transitions are managed here; no confirmation logic escapes to the handler.
func (s *ExperimentService) Confirm(ctx context.Context, id, callerUserID string) (*domain.ExperimentRecord, error) {
        // 1. Fetch current record.
        rec, err := s.repo.GetByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("get experiment for confirm: %w", err)
        }
        if rec == nil {
                return nil, ErrNotFound
        }

        // 2. Ownership check.
        note, err := s.sciNotes.GetByID(ctx, rec.SciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get parent scinote for confirm: %w", err)
        }
        if note == nil || note.UserID != callerUserID {
                return nil, ErrForbidden
        }

        // 3. Extract heritable modules from current state.
        newConfirmedModules, err := domain.ExtractHeritableModules(rec.CurrentModules)
        if err != nil {
                return nil, fmt.Errorf("extract heritable modules: %w", err)
        }

        // 4. Idempotency guard: already confirmed with same content → no-op.
        if rec.ConfirmationState == domain.StateConfirmed {
                if modulesJSONEqual(newConfirmedModules, rec.ConfirmedModules) {
                        return rec, nil // true idempotent no-op
                }
                // Content changed on an already-confirmed record → treat as re-confirm
                // (same code path as confirmed_dirty below).
        }

        // 5. Determine whether this confirm should advance the SciNote's inheritance chain.
        //
        //    The chain advances when:
        //      a) The record is being confirmed for the first time (draft), OR
        //      b) The record is re-confirming AND it is the SciNote's current head
        //         (i.e. the SciNote's last_confirmed_record_id == this record's id).
        //
        //    Re-confirming a historical record (not the head) updates the record itself
        //    but does NOT rewrite the current context, avoiding time-travel issues.
        var advanceContext bool
        switch rec.ConfirmationState {
        case domain.Statedraft:
                advanceContext = true
        case domain.StateConfirmed, domain.StateConfirmedDirty:
                isHead := note.LastConfirmedRecordID != nil && *note.LastConfirmedRecordID == id
                advanceContext = isHead
        }

        // 6. Atomically update the record (and optionally the SciNote context).
        confirmed, err := s.repo.ConfirmRecord(
                ctx,
                id,
                newConfirmedModules,
                advanceContext,
                rec.SciNoteID,
                rec.SequenceNumber,
        )
        if err != nil {
                return nil, fmt.Errorf("confirm record: %w", err)
        }
        return confirmed, nil
}

// SoftDelete moves an ExperimentRecord to the trash (sets is_deleted=true).
// Requires ownership — share access is insufficient for destructive actions.
//
// Business rules enforced here (mirrored on the frontend):
//  1. Only draft records may be deleted.  confirmed / confirmed_dirty records
//     represent locked snapshots in the inheritance chain and must not be removed.
//  2. A draft record may not be deleted if any non-deleted record references it
//     via derived_from_record_id (i.e. it is a parent in the inheritance chain).
func (s *ExperimentService) SoftDelete(ctx context.Context, id, callerUserID string) error {
        rec, err := s.repo.GetByID(ctx, id)
        if err != nil {
                return fmt.Errorf("get experiment: %w", err)
        }
        if rec == nil {
                return ErrNotFound
        }

        note, err := s.sciNotes.GetByID(ctx, rec.SciNoteID)
        if err != nil {
                return fmt.Errorf("get parent scinote: %w", err)
        }
        if note == nil || note.UserID != callerUserID {
                return ErrForbidden
        }

        // Guard 1: only draft records may be deleted.
        if rec.ConfirmationState != domain.Statedraft {
                return fmt.Errorf("%w: only draft records can be deleted; confirmed records are locked snapshots", ErrForbidden)
        }

        // Guard 2: refuse if another active record inherits from this one.
        hasDownstream, err := s.repo.HasDownstreamReference(ctx, id)
        if err != nil {
                return fmt.Errorf("check downstream reference: %w", err)
        }
        if hasDownstream {
                return fmt.Errorf("%w: record is referenced by a downstream record and cannot be deleted", ErrForbidden)
        }

        if err := s.repo.SoftDelete(ctx, id); err != nil {
                return fmt.Errorf("soft delete experiment: %w", err)
        }
        return nil
}

// ListRecent returns the N most recently updated active experiment records
// across all SciNotes owned by callerUserID.
// limit is clamped to [1, 50] by the handler before reaching here.
func (s *ExperimentService) ListRecent(ctx context.Context, callerUserID string, limit int) ([]domain.RecentExperimentRow, error) {
        rows, err := s.repo.ListRecentByUser(ctx, callerUserID, limit)
        if err != nil {
                return nil, fmt.Errorf("list recent experiments: %w", err)
        }
        return rows, nil
}

// Restore recovers a soft-deleted ExperimentRecord (sets is_deleted=false).
// Returns ErrForbidden when the parent SciNote is itself soft-deleted,
// because restoring an experiment under a deleted container is semantically ambiguous.
// Requires ownership — share access is insufficient for restore operations.
func (s *ExperimentService) Restore(ctx context.Context, id, callerUserID string) (*domain.ExperimentRecord, error) {
        rec, err := s.repo.GetByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("get experiment for restore: %w", err)
        }
        if rec == nil {
                return nil, ErrNotFound
        }

        note, err := s.sciNotes.GetByID(ctx, rec.SciNoteID)
        if err != nil {
                return nil, fmt.Errorf("get parent scinote for restore: %w", err)
        }
        if note == nil || note.UserID != callerUserID {
                return nil, ErrForbidden
        }
        if note.IsDeleted {
                return nil, fmt.Errorf("%w: parent SciNote is deleted; restore the SciNote first", ErrForbidden)
        }

        if err := s.repo.Restore(ctx, id); err != nil {
                return nil, fmt.Errorf("restore experiment: %w", err)
        }

        // Re-fetch via Get to verify and return the restored record.
        return s.Get(ctx, id, callerUserID)
}

// CountBySciNoteIDs returns a map[sciNoteID]count of non-deleted experiment records
// for the supplied SciNote IDs.  No ownership check is performed — callers (e.g.
// the instructor handler) are responsible for verifying access before calling this.
func (s *ExperimentService) CountBySciNoteIDs(ctx context.Context, ids []string) (map[string]int, error) {
        return s.repo.CountBySciNoteIDs(ctx, ids)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// modulesJSONEqual does a byte-level comparison of two JSON blobs.
// This is sufficient for idempotency checks because the same extracted content
// will produce identical JSON bytes when re-extracted from unchanged modules.
func modulesJSONEqual(a, b []byte) bool {
        if len(a) == 0 && len(b) == 0 {
                return true
        }
        if len(a) != len(b) {
                return false
        }
        for i := range a {
                if a[i] != b[i] {
                        return false
                }
        }
        return true
}
