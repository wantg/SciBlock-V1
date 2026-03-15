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
}

// NewExperimentService creates an ExperimentService with its required dependencies.
func NewExperimentService(repo repository.ExperimentRepository, sciNotes repository.SciNoteRepository) *ExperimentService {
	return &ExperimentService{repo: repo, sciNotes: sciNotes}
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

// Get retrieves a single ExperimentRecord by ID, verifying the caller owns the parent SciNote.
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
	if note == nil || note.UserID != callerUserID {
		return nil, ErrForbidden
	}

	return rec, nil
}

// Create inserts a new ExperimentRecord under sciNoteID.
// Business defaults are applied here before persisting:
//   - ExperimentStatus defaults to domain.StatusExploring when not provided.
//   - Tags nil is normalized to an empty slice.
func (s *ExperimentService) Create(ctx context.Context, sciNoteID string, input domain.ExperimentRecord, callerUserID string) (*domain.ExperimentRecord, error) {
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

	// Apply business defaults.
	if input.ExperimentStatus == "" {
		input.ExperimentStatus = domain.StatusExploring
	}
	if input.Tags == nil {
		input.Tags = []string{}
	}
	input.SciNoteID = sciNoteID

	created, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("create experiment: %w", err)
	}
	return created, nil
}

// Update applies a partial patch to an ExperimentRecord, verifying ownership.
// Only non-nil fields in the patch are written to the database.
func (s *ExperimentService) Update(ctx context.Context, id string, patch domain.ExperimentPatch, callerUserID string) (*domain.ExperimentRecord, error) {
	if _, err := s.Get(ctx, id, callerUserID); err != nil {
		return nil, err
	}
	updated, err := s.repo.Update(ctx, id, patch)
	if err != nil {
		return nil, fmt.Errorf("update experiment: %w", err)
	}
	return updated, nil
}

// SoftDelete moves an ExperimentRecord to the trash (sets is_deleted=true).
func (s *ExperimentService) SoftDelete(ctx context.Context, id, callerUserID string) error {
	if _, err := s.Get(ctx, id, callerUserID); err != nil {
		return err
	}
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("soft delete experiment: %w", err)
	}
	return nil
}

// Restore recovers a soft-deleted ExperimentRecord (sets is_deleted=false).
// Returns ErrForbidden when the parent SciNote is itself soft-deleted,
// because restoring an experiment under a deleted container is semantically ambiguous.
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
	return s.Get(ctx, id, callerUserID)
}
