package dto

import (
        "encoding/json"
        "time"
)

// CreateExperimentRequest is the JSON body for POST /api/scinotes/:id/experiments.
// currentModules is used to bootstrap scinotes.initial_modules on the very first
// record for a SciNote; all subsequent modules are resolved from the inheritance chain.
type CreateExperimentRequest struct {
        Title              string          `json:"title"`
        PurposeInput       *string         `json:"purposeInput"`
        ExperimentStatus   string          `json:"experimentStatus"`
        ExperimentCode     string          `json:"experimentCode"`
        Tags               []string        `json:"tags"`
        InheritedVersionID *string         `json:"inheritedVersionId"`
        CurrentModules     json.RawMessage `json:"currentModules"` // OntologyModule[] blob (used for bootstrap only)
}

// UpdateExperimentRequest is the JSON body for PATCH /api/experiments/:id.
// All fields are optional.  currentModules replaces the entire modules column
// when provided; omit the field entirely to leave it unchanged.
// Note: patching currentModules on a confirmed record triggers a confirmed_dirty transition.
type UpdateExperimentRequest struct {
        Title            *string         `json:"title"`
        ExperimentStatus *string         `json:"experimentStatus"`
        ExperimentCode   *string         `json:"experimentCode"`
        Tags             []string        `json:"tags"`            // nil = no change; [] = clear
        EditorContent    *string         `json:"editorContent"`
        ReportHtml       *string         `json:"reportHtml"`
        CurrentModules   json.RawMessage `json:"currentModules"` // nil = no change; replaces whole column
}

// ExperimentResponse is the canonical JSON shape for all ExperimentRecord endpoints.
// Includes all inheritance-chain fields so the frontend never needs a follow-up query.
type ExperimentResponse struct {
        ID                 string          `json:"id"`
        SciNoteID          string          `json:"sciNoteId"`
        Title              string          `json:"title"`
        PurposeInput       *string         `json:"purposeInput"`
        ExperimentStatus   string          `json:"experimentStatus"`
        ExperimentCode     string          `json:"experimentCode"`
        Tags               []string        `json:"tags"`
        EditorContent      string          `json:"editorContent"`
        ReportHtml         *string         `json:"reportHtml"`
        // Report metadata (Phase 2)
        ReportGeneratedAt  *time.Time      `json:"reportGeneratedAt"`
        ReportSource       *string         `json:"reportSource"`
        ReportUpdatedAt    *time.Time      `json:"reportUpdatedAt"`
        CurrentModules     json.RawMessage `json:"currentModules"`
        InheritedVersionID *string         `json:"inheritedVersionId"`
        IsDeleted          bool            `json:"isDeleted"`
        CreatedAt          time.Time       `json:"createdAt"`
        UpdatedAt          time.Time       `json:"updatedAt"`

        // Confirmation / lineage fields
        SequenceNumber        int        `json:"sequenceNumber"`
        ConfirmationState     string     `json:"confirmationState"`
        ConfirmedAt           *time.Time `json:"confirmedAt"`
        DerivedFromSourceType string     `json:"derivedFromSourceType"`
        DerivedFromRecordID   *string    `json:"derivedFromRecordId"`
        DerivedFromRecordSeq  *int       `json:"derivedFromRecordSeq"`
        DerivedFromContextVer int        `json:"derivedFromContextVer"`
}

// ListExperimentsResponse is returned by GET /api/scinotes/:id/experiments.
type ListExperimentsResponse struct {
        Items []ExperimentResponse `json:"items"`
        Total int                  `json:"total"`
}

// RecentExperimentItem is the JSON shape for a single entry in the recent-experiments feed.
// It is a JOIN result across experiment_records and sci_notes — never a full ExperimentRecord.
type RecentExperimentItem struct {
        ExperimentID     string    `json:"experimentId"`
        ExperimentTitle  string    `json:"experimentTitle"`
        SciNoteID        string    `json:"sciNoteId"`
        SciNoteTitle     string    `json:"sciNoteTitle"`
        ExperimentStatus string    `json:"experimentStatus"`
        CreatedAt        time.Time `json:"createdAt"`
        UpdatedAt        time.Time `json:"updatedAt"`
}

// ListRecentExperimentsResponse is returned by GET /api/experiments/recent.
type ListRecentExperimentsResponse struct {
        Items []RecentExperimentItem `json:"items"`
}
