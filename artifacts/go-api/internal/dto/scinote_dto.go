package dto

import (
        "encoding/json"
        "time"
)

// CreateSciNoteRequest is the JSON body for POST /api/scinotes.
type CreateSciNoteRequest struct {
        Title          string          `json:"title"`
        Kind           string          `json:"kind"`           // "wizard" | "placeholder"
        ExperimentType *string         `json:"experimentType"` // optional
        Objective      *string         `json:"objective"`      // optional
        FormData       json.RawMessage `json:"formData"`       // opaque JSON blob
}

// UpdateSciNoteRequest is the JSON body for PATCH /api/scinotes/:id.
// All fields are optional — only non-nil values are written.
type UpdateSciNoteRequest struct {
        Title          *string         `json:"title"`
        ExperimentType *string         `json:"experimentType"`
        Objective      *string         `json:"objective"`
        FormData       json.RawMessage `json:"formData"` // nil = no change
}

// SciNoteResponse is the canonical JSON shape returned by all SciNote endpoints.
type SciNoteResponse struct {
        ID             string          `json:"id"`
        UserID         string          `json:"userId"`
        Title          string          `json:"title"`
        Kind           string          `json:"kind"`
        ExperimentType *string         `json:"experimentType"`
        Objective      *string         `json:"objective"`
        FormData       json.RawMessage `json:"formData"`  // null for placeholder kind
        CreatedAt      time.Time       `json:"createdAt"`
        UpdatedAt      time.Time       `json:"updatedAt"`
}

// ListSciNotesResponse is returned by GET /api/scinotes.
type ListSciNotesResponse struct {
        Items []SciNoteResponse `json:"items"`
        Total int               `json:"total"`
}

// InstructorSciNoteResponse extends SciNoteResponse with computed fields
// that are only meaningful in the instructor read path.
type InstructorSciNoteResponse struct {
        SciNoteResponse
        // ExperimentCount is the number of non-deleted experiment records
        // belonging to this SciNote.  Populated by ListMemberSciNotes.
        ExperimentCount int `json:"experimentCount"`
}

// ListInstructorSciNotesResponse is returned by
// GET /api/instructor/members/:userId/scinotes.
type ListInstructorSciNotesResponse struct {
        Items []InstructorSciNoteResponse `json:"items"`
        Total int                         `json:"total"`
}
