package repository

import (
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "strings"
        "time"

        "github.com/jackc/pgx/v5"
        "github.com/jackc/pgx/v5/pgxpool"
        "sciblock/go-api/internal/domain"
)

type pgxExperimentRepository struct {
        pool *pgxpool.Pool
}

// NewExperimentRepository returns a pgx-backed ExperimentRepository.
func NewExperimentRepository(pool *pgxpool.Pool) ExperimentRepository {
        return &pgxExperimentRepository{pool: pool}
}

const expColumns = `
        id, sci_note_id, title, purpose_input,
        experiment_status, experiment_code, tags,
        editor_content, report_html, current_modules,
        inherited_version_id, is_deleted, created_at, updated_at,
        sequence_number, confirmation_state, confirmed_at, confirmed_modules,
        derived_from_source_type, derived_from_record_id,
        derived_from_record_seq, derived_from_context_ver`

// ListBySciNote returns ExperimentRecords for a SciNote.
// trashOnly=false → is_deleted=false (normal view)
// trashOnly=true  → is_deleted=true  (trash view)
func (r *pgxExperimentRepository) ListBySciNote(ctx context.Context, sciNoteID string, trashOnly bool) ([]domain.ExperimentRecord, error) {
        rows, err := r.pool.Query(ctx,
                `SELECT`+expColumns+`
                 FROM experiment_records
                 WHERE sci_note_id = $1 AND is_deleted = $2
                 ORDER BY created_at DESC`,
                sciNoteID, trashOnly,
        )
        if err != nil {
                return nil, fmt.Errorf("ListBySciNote query: %w", err)
        }
        defer rows.Close()

        var recs []domain.ExperimentRecord
        for rows.Next() {
                rec, err := scanExperiment(rows)
                if err != nil {
                        return nil, fmt.Errorf("ListBySciNote scan: %w", err)
                }
                recs = append(recs, *rec)
        }
        if err := rows.Err(); err != nil {
                return nil, fmt.Errorf("ListBySciNote rows: %w", err)
        }
        if recs == nil {
                recs = []domain.ExperimentRecord{}
        }
        return recs, nil
}

// GetByID retrieves a single ExperimentRecord by primary key.
// Returns nil, nil when not found.
func (r *pgxExperimentRepository) GetByID(ctx context.Context, id string) (*domain.ExperimentRecord, error) {
        row := r.pool.QueryRow(ctx,
                `SELECT`+expColumns+`
                 FROM experiment_records WHERE id = $1`,
                id,
        )
        rec, err := scanExperiment(row)
        if err != nil {
                if errors.Is(err, pgx.ErrNoRows) {
                        return nil, nil
                }
                return nil, fmt.Errorf("GetByID: %w", err)
        }
        return rec, nil
}

// Create inserts a new ExperimentRecord and returns the persisted row.
func (r *pgxExperimentRepository) Create(ctx context.Context, rec domain.ExperimentRecord) (*domain.ExperimentRecord, error) {
        tags := rec.Tags
        if tags == nil {
                tags = []string{}
        }

        state := rec.ConfirmationState
        if state == "" {
                state = domain.Statedraft
        }

        sourceType := rec.DerivedFromSourceType
        if sourceType == "" {
                sourceType = domain.SourceInitial
        }

        row := r.pool.QueryRow(ctx,
                `INSERT INTO experiment_records
                        (id, sci_note_id, title, purpose_input,
                         experiment_status, experiment_code, tags,
                         editor_content, report_html, current_modules, inherited_version_id,
                         sequence_number, confirmation_state,
                         derived_from_source_type, derived_from_record_id,
                         derived_from_record_seq, derived_from_context_ver)
                 VALUES
                        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                         $11, $12, $13, $14, $15, $16)
                 RETURNING`+expColumns,
                rec.SciNoteID,
                rec.Title,
                rec.PurposeInput,
                rec.ExperimentStatus,
                rec.ExperimentCode,
                tags,
                rec.EditorContent,
                rec.ReportHtml,
                nullableJSON(rec.CurrentModules),
                rec.InheritedVersionID,
                rec.SequenceNumber,
                state,
                sourceType,
                rec.DerivedFromRecordID,
                rec.DerivedFromRecordSeq,
                rec.DerivedFromContextVer,
        )
        created, err := scanExperiment(row)
        if err != nil {
                return nil, fmt.Errorf("Create: %w", err)
        }
        return created, nil
}

// Update applies a partial patch; only non-nil/non-zero fields are written.
// patch.CurrentModules non-nil replaces the whole current_modules column.
func (r *pgxExperimentRepository) Update(ctx context.Context, id string, patch domain.ExperimentPatch) (*domain.ExperimentRecord, error) {
        setClauses := []string{"updated_at = now()"}
        args := []any{}
        argIdx := 1

        if patch.Title != nil {
                setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
                args = append(args, *patch.Title)
                argIdx++
        }
        if patch.ExperimentStatus != nil {
                setClauses = append(setClauses, fmt.Sprintf("experiment_status = $%d", argIdx))
                args = append(args, *patch.ExperimentStatus)
                argIdx++
        }
        if patch.ExperimentCode != nil {
                setClauses = append(setClauses, fmt.Sprintf("experiment_code = $%d", argIdx))
                args = append(args, *patch.ExperimentCode)
                argIdx++
        }
        // Tags: nil = no change; empty slice = clear to {}
        if patch.Tags != nil {
                setClauses = append(setClauses, fmt.Sprintf("tags = $%d", argIdx))
                args = append(args, patch.Tags)
                argIdx++
        }
        if patch.EditorContent != nil {
                setClauses = append(setClauses, fmt.Sprintf("editor_content = $%d", argIdx))
                args = append(args, *patch.EditorContent)
                argIdx++
        }
        if patch.ReportHtml != nil {
                setClauses = append(setClauses, fmt.Sprintf("report_html = $%d", argIdx))
                args = append(args, *patch.ReportHtml)
                argIdx++
        }
        if len(patch.CurrentModules) > 0 {
                setClauses = append(setClauses, fmt.Sprintf("current_modules = $%d", argIdx))
                args = append(args, []byte(patch.CurrentModules))
                argIdx++
        }

        if len(setClauses) == 1 {
                return r.GetByID(ctx, id)
        }

        args = append(args, id)
        query := fmt.Sprintf(
                `UPDATE experiment_records SET %s WHERE id = $%d RETURNING`+expColumns,
                strings.Join(setClauses, ", "),
                argIdx,
        )

        row := r.pool.QueryRow(ctx, query, args...)
        updated, err := scanExperiment(row)
        if err != nil {
                if errors.Is(err, pgx.ErrNoRows) {
                        return nil, nil
                }
                return nil, fmt.Errorf("Update: %w", err)
        }
        return updated, nil
}

// UpdateModules replaces the current_modules column wholesale.
func (r *pgxExperimentRepository) UpdateModules(ctx context.Context, id string, modules json.RawMessage) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE experiment_records SET current_modules = $1, updated_at = now() WHERE id = $2`,
                []byte(modules), id,
        )
        if err != nil {
                return fmt.Errorf("UpdateModules: %w", err)
        }
        return nil
}

// SoftDelete sets is_deleted=true.
func (r *pgxExperimentRepository) SoftDelete(ctx context.Context, id string) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE experiment_records SET is_deleted = true, updated_at = now() WHERE id = $1`,
                id,
        )
        if err != nil {
                return fmt.Errorf("SoftDelete: %w", err)
        }
        return nil
}

// HasDownstreamReference returns true when at least one non-deleted record
// has derived_from_record_id = id, meaning this record is a parent in the
// inheritance chain and must not be deleted.
func (r *pgxExperimentRepository) HasDownstreamReference(ctx context.Context, id string) (bool, error) {
        var exists bool
        err := r.pool.QueryRow(ctx,
                `SELECT EXISTS(
                        SELECT 1 FROM experiment_records
                        WHERE derived_from_record_id = $1
                          AND is_deleted = false
                )`,
                id,
        ).Scan(&exists)
        if err != nil {
                return false, fmt.Errorf("HasDownstreamReference: %w", err)
        }
        return exists, nil
}

// Restore sets is_deleted=false.
func (r *pgxExperimentRepository) Restore(ctx context.Context, id string) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE experiment_records SET is_deleted = false, updated_at = now() WHERE id = $1`,
                id,
        )
        if err != nil {
                return fmt.Errorf("Restore: %w", err)
        }
        return nil
}

// NextSequenceNumber returns COUNT(non-deleted active records) + 1 for the SciNote.
func (r *pgxExperimentRepository) NextSequenceNumber(ctx context.Context, sciNoteID string) (int, error) {
        var count int
        err := r.pool.QueryRow(ctx,
                `SELECT COUNT(*) FROM experiment_records WHERE sci_note_id = $1 AND is_deleted = false`,
                sciNoteID,
        ).Scan(&count)
        if err != nil {
                return 0, fmt.Errorf("NextSequenceNumber: %w", err)
        }
        return count + 1, nil
}

// MarkDirty transitions confirmation_state from "confirmed" → "confirmed_dirty".
// No-op for draft or already confirmed_dirty records.
func (r *pgxExperimentRepository) MarkDirty(ctx context.Context, id string) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE experiment_records
                 SET confirmation_state = $1, updated_at = now()
                 WHERE id = $2 AND confirmation_state = $3`,
                domain.StateConfirmedDirty, id, domain.StateConfirmed,
        )
        if err != nil {
                return fmt.Errorf("MarkDirty: %w", err)
        }
        return nil
}

// ConfirmRecord atomically sets confirmation state and optionally advances the SciNote context.
// The two writes (experiment_records + scinotes) execute inside a single pgx transaction,
// guaranteeing that both succeed or both fail.
func (r *pgxExperimentRepository) ConfirmRecord(
        ctx context.Context,
        id string,
        confirmedModules json.RawMessage,
        advanceContext bool,
        sciNoteID string,
        recordSeq int,
) (*domain.ExperimentRecord, error) {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return nil, fmt.Errorf("ConfirmRecord begin tx: %w", err)
        }
        defer tx.Rollback(ctx) //nolint:errcheck

        // 1. Update the experiment record.
        row := tx.QueryRow(ctx,
                `UPDATE experiment_records
                 SET confirmation_state = $1,
                     confirmed_at       = now(),
                     confirmed_modules  = $2,
                     updated_at         = now()
                 WHERE id = $3
                 RETURNING`+expColumns,
                domain.StateConfirmed, []byte(confirmedModules), id,
        )
        rec, err := scanExperiment(row)
        if err != nil {
                return nil, fmt.Errorf("ConfirmRecord update record: %w", err)
        }

        // 2. Optionally advance the SciNote context (same transaction).
        if advanceContext {
                _, err = tx.Exec(ctx,
                        `UPDATE scinotes
                         SET current_confirmed_modules = $1,
                             context_version           = context_version + 1,
                             last_confirmed_record_id  = $2,
                             last_confirmed_record_seq = $3,
                             updated_at                = now()
                         WHERE id = $4`,
                        []byte(confirmedModules), id, recordSeq, sciNoteID,
                )
                if err != nil {
                        return nil, fmt.Errorf("ConfirmRecord advance context: %w", err)
                }
        }

        if err := tx.Commit(ctx); err != nil {
                return nil, fmt.Errorf("ConfirmRecord commit: %w", err)
        }
        return rec, nil
}

// ListRecentByUser returns the N most recently updated active experiment records
// across all SciNotes owned by userID, joined with their parent SciNote titles.
// Only is_deleted=false records are included.
// limit must be between 1 and 50; the handler layer is responsible for clamping.
func (r *pgxExperimentRepository) ListRecentByUser(ctx context.Context, userID string, limit int) ([]domain.RecentExperimentRow, error) {
        rows, err := r.pool.Query(ctx,
                `SELECT
                        e.id            AS experiment_id,
                        e.title         AS experiment_title,
                        s.id            AS sci_note_id,
                        s.title         AS sci_note_title,
                        e.experiment_status,
                        e.created_at,
                        e.updated_at
                FROM experiment_records e
                JOIN scinotes s ON s.id = e.sci_note_id
                WHERE s.user_id = $1
                  AND e.is_deleted = false
                  AND s.is_deleted = false
                ORDER BY e.updated_at DESC
                LIMIT $2`,
                userID, limit,
        )
        if err != nil {
                return nil, fmt.Errorf("ListRecentByUser query: %w", err)
        }
        defer rows.Close()

        var result []domain.RecentExperimentRow
        for rows.Next() {
                var row domain.RecentExperimentRow
                if err := rows.Scan(
                        &row.ExperimentID,
                        &row.ExperimentTitle,
                        &row.SciNoteID,
                        &row.SciNoteTitle,
                        &row.ExperimentStatus,
                        &row.CreatedAt,
                        &row.UpdatedAt,
                ); err != nil {
                        return nil, fmt.Errorf("ListRecentByUser scan: %w", err)
                }
                result = append(result, row)
        }
        if err := rows.Err(); err != nil {
                return nil, fmt.Errorf("ListRecentByUser rows: %w", err)
        }
        if result == nil {
                result = []domain.RecentExperimentRow{}
        }
        return result, nil
}

// ---------------------------------------------------------------------------
// Scan helpers
// ---------------------------------------------------------------------------

type expScanner interface {
        Scan(dest ...any) error
}

func scanExperiment(row expScanner) (*domain.ExperimentRecord, error) {
        var (
                id                    string
                sciNoteID             string
                title                 string
                purposeInput          *string
                experimentStatus      string
                experimentCode        string
                tags                  []string
                editorContent         string
                reportHtml            *string
                currentModules        []byte
                inheritedVersionID    *string
                isDeleted             bool
                createdAt             time.Time
                updatedAt             time.Time
                sequenceNumber        int
                confirmationState     string
                confirmedAt           *time.Time
                confirmedModules      []byte
                derivedFromSourceType string
                derivedFromRecordID   *string
                derivedFromRecordSeq  *int
                derivedFromContextVer int
        )
        if err := row.Scan(
                &id, &sciNoteID, &title, &purposeInput,
                &experimentStatus, &experimentCode, &tags,
                &editorContent, &reportHtml, &currentModules,
                &inheritedVersionID, &isDeleted, &createdAt, &updatedAt,
                &sequenceNumber, &confirmationState, &confirmedAt, &confirmedModules,
                &derivedFromSourceType, &derivedFromRecordID,
                &derivedFromRecordSeq, &derivedFromContextVer,
        ); err != nil {
                return nil, err
        }
        if tags == nil {
                tags = []string{}
        }
        if confirmationState == "" {
                confirmationState = domain.Statedraft
        }
        if derivedFromSourceType == "" {
                derivedFromSourceType = domain.SourceInitial
        }
        return &domain.ExperimentRecord{
                ID:                    id,
                SciNoteID:             sciNoteID,
                Title:                 title,
                PurposeInput:          purposeInput,
                ExperimentStatus:      experimentStatus,
                ExperimentCode:        experimentCode,
                Tags:                  tags,
                EditorContent:         editorContent,
                ReportHtml:            reportHtml,
                CurrentModules:        jsonOrNil(currentModules),
                InheritedVersionID:    inheritedVersionID,
                IsDeleted:             isDeleted,
                CreatedAt:             createdAt,
                UpdatedAt:             updatedAt,
                SequenceNumber:        sequenceNumber,
                ConfirmationState:     confirmationState,
                ConfirmedAt:           confirmedAt,
                ConfirmedModules:      jsonOrNil(confirmedModules),
                DerivedFromSourceType: derivedFromSourceType,
                DerivedFromRecordID:   derivedFromRecordID,
                DerivedFromRecordSeq:  derivedFromRecordSeq,
                DerivedFromContextVer: derivedFromContextVer,
        }, nil
}

// CountBySciNoteIDs returns a map[sciNoteID]count of non-deleted experiment records
// for each of the given SciNote IDs.  Uses a single ANY($1) query.
// SciNote IDs with zero records are omitted from the map.
func (r *pgxExperimentRepository) CountBySciNoteIDs(ctx context.Context, ids []string) (map[string]int, error) {
        if len(ids) == 0 {
                return map[string]int{}, nil
        }

        rows, err := r.pool.Query(ctx,
                `SELECT sci_note_id, COUNT(*)::int
                 FROM experiment_records
                 WHERE sci_note_id = ANY($1) AND is_deleted = false
                 GROUP BY sci_note_id`,
                ids,
        )
        if err != nil {
                return nil, fmt.Errorf("CountBySciNoteIDs query: %w", err)
        }
        defer rows.Close()

        result := make(map[string]int, len(ids))
        for rows.Next() {
                var sciNoteID string
                var count int
                if err := rows.Scan(&sciNoteID, &count); err != nil {
                        return nil, fmt.Errorf("CountBySciNoteIDs scan: %w", err)
                }
                result[sciNoteID] = count
        }
        if err := rows.Err(); err != nil {
                return nil, fmt.Errorf("CountBySciNoteIDs rows: %w", err)
        }
        return result, nil
}
