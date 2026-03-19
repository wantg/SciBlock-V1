package domain

import (
        "encoding/json"
        "time"
)

// ExperimentStatus mirrors the frontend enum.
type ExperimentStatus = string

const (
        StatusExploring    ExperimentStatus = "探索中"
        StatusReproducible ExperimentStatus = "可复现"
        StatusFailed       ExperimentStatus = "失败"
        StatusVerified     ExperimentStatus = "已验证"
)

// ExperimentRecord is a single experiment run inside a SciNote.
//
// CurrentModules stores OntologyModule[] as an opaque JSON blob — the Go
// backend does not parse the individual module structure.  When a single
// module key is updated (PATCH /api/experiments/:id/modules/:key), the
// service layer merges the new module into the existing JSON array in the
// database without full re-serialization of all modules.
//
// Confirmation-state and lineage fields are described in domain/inheritance.go.
type ExperimentRecord struct {
        ID                 string
        SciNoteID          string
        Title              string
        PurposeInput       *string
        ExperimentStatus   ExperimentStatus
        ExperimentCode     string
        Tags               []string
        EditorContent      string
        ReportHtml         *string
        // Report persistence metadata (added Phase 2 — migration 20260319006)
        ReportGeneratedAt  *time.Time
        ReportSource       *string         // "stub" | "ai" | "manual" | nil (no report)
        ReportUpdatedAt    *time.Time
        ReportModelJson    json.RawMessage // ExperimentReportModel JSON snapshot
        CurrentModules     json.RawMessage // OntologyModule[] opaque blob
        InheritedVersionID *string         // forward ref to ontology_versions (Phase 2)
        IsDeleted          bool
        CreatedAt          time.Time
        UpdatedAt          time.Time

        // ---------------------------------------------------------------------------
        // Inheritance-chain fields (added in migration 20260315004)
        // ---------------------------------------------------------------------------

        // SequenceNumber is the 1-based ordinal position of this record within its SciNote.
        SequenceNumber int

        // ConfirmationState is one of: "draft", "confirmed", "confirmed_dirty".
        // Transitions are managed exclusively by ExperimentService.
        ConfirmationState ConfirmationState

        // ConfirmedAt is the timestamp of the most recent confirm action (nil until first confirm).
        ConfirmedAt *time.Time

        // ConfirmedModules is the heritable-modules snapshot stored at the time of
        // the last confirm.  Nil until first confirm.
        ConfirmedModules json.RawMessage

        // DerivedFromSourceType indicates whether this record's defaults came from
        // the SciNote's initial_modules ("initial") or from a prior confirmed record ("record").
        DerivedFromSourceType DerivedFromSourceType

        // DerivedFromRecordID is the ID of the record that provided the defaults.
        // Nil when DerivedFromSourceType == "initial".
        DerivedFromRecordID *string

        // DerivedFromRecordSeq is the sequence_number of the source record.
        // Nil when DerivedFromSourceType == "initial".
        // Stored redundantly so the frontend never needs a follow-up query to display banner text.
        DerivedFromRecordSeq *int

        // DerivedFromContextVer is the context_version of the parent SciNote at the
        // moment this record was created.  Used for audit / future diff features.
        DerivedFromContextVer int
}

// RecentExperimentRow is the result type for the cross-table recent-experiments query.
// It joins experiment_records with sci_notes to produce the fields needed by
// the home page feed without a frontend N+1 loop.
type RecentExperimentRow struct {
        ExperimentID     string
        ExperimentTitle  string
        SciNoteID        string
        SciNoteTitle     string
        ExperimentStatus ExperimentStatus
        CreatedAt        time.Time
        UpdatedAt        time.Time
}

// ExperimentPatch carries optional update fields for PATCH /api/experiments/:id.
// Only non-nil fields are written to the database.
// Tags nil = no change; Tags []string{} = clear to empty array.
// CurrentModules nil = no change; non-nil replaces the entire current_modules column.
type ExperimentPatch struct {
        Title            *string
        ExperimentStatus *string
        ExperimentCode   *string
        Tags             []string
        EditorContent    *string
        ReportHtml       *string
        CurrentModules   json.RawMessage // nil = no change; non-nil replaces whole column
}

// CreateExperimentInput carries the fields supplied by the caller for a new record.
// The service layer resolves inheritance and fills lineage fields before persisting.
type CreateExperimentInput struct {
        Title              string
        PurposeInput       *string
        ExperimentStatus   ExperimentStatus
        ExperimentCode     string
        Tags               []string
        EditorContent      string
        CurrentModules     json.RawMessage // frontend-supplied module array (used to bootstrap initial_modules)
        InheritedVersionID *string
}
