package handler

import (
        "net/http"

        "github.com/go-chi/chi/v5"
        "sciblock/go-api/internal/dto"
        "sciblock/go-api/internal/service"
)

// InstructorHandler handles read-only, instructor-scoped data access.
//
// These endpoints allow an instructor to read any student's SciNotes and
// experiment records.  Role enforcement is applied at the router level via
// middleware.RequireInstructor — individual methods do NOT re-check the role.
//
// URL convention: /api/instructor/members/:userId/...
// The :userId path parameter is the auth user ID (users.id / scinotes.user_id),
// NOT the student profile ID (students.id).  The frontend must supply
// student.userId, not student.id.
type InstructorHandler struct {
        sciNotes    *service.SciNoteService
        experiments *service.ExperimentService
}

// NewInstructorHandler creates an InstructorHandler.
func NewInstructorHandler(
        sciNotes *service.SciNoteService,
        experiments *service.ExperimentService,
) *InstructorHandler {
        return &InstructorHandler{sciNotes: sciNotes, experiments: experiments}
}

// ListMemberSciNotes handles GET /api/instructor/members/:userId/scinotes
//
// Returns all non-deleted SciNotes owned by the target user, enriched with
// experimentCount — the number of non-deleted experiment records per SciNote.
// A single COUNT query is issued after listing the SciNotes (N+1-free).
func (h *InstructorHandler) ListMemberSciNotes(w http.ResponseWriter, r *http.Request) {
        targetUserID := chi.URLParam(r, "userId")

        notes, err := h.sciNotes.List(r.Context(), targetUserID)
        if err != nil {
                mapServiceError(w, err)
                return
        }

        // Collect SciNote IDs for the batch COUNT query.
        ids := make([]string, len(notes))
        for i := range notes {
                ids[i] = notes[i].ID
        }

        counts, err := h.experiments.CountBySciNoteIDs(r.Context(), ids)
        if err != nil {
                mapServiceError(w, err)
                return
        }

        items := make([]dto.InstructorSciNoteResponse, len(notes))
        for i := range notes {
                items[i] = dto.InstructorSciNoteResponse{
                        SciNoteResponse:  dto.SciNoteResponseFromDomain(&notes[i]),
                        ExperimentCount: counts[notes[i].ID], // 0 when key absent
                }
        }
        writeJSON(w, http.StatusOK, dto.ListInstructorSciNotesResponse{Items: items, Total: len(items)})
}

// GetMemberExperiment handles GET /api/instructor/members/:userId/experiments/:experimentId
//
// Returns a single ExperimentRecord owned by targetUserID.
// Ownership is verified inside ExperimentService.Get:
//   experiment → parent scinote → scinote.user_id == targetUserID
// This means a fabricated experimentId belonging to a different user will
// receive 404/403 even though the instructor role has already been confirmed
// by the middleware.  Backend never trusts the URL alone.
func (h *InstructorHandler) GetMemberExperiment(w http.ResponseWriter, r *http.Request) {
        targetUserID := chi.URLParam(r, "userId")
        experimentID := chi.URLParam(r, "experimentId")

        rec, err := h.experiments.Get(r.Context(), experimentID, targetUserID)
        if err != nil {
                mapServiceError(w, err)
                return
        }

        writeJSON(w, http.StatusOK, dto.ExperimentResponseFromDomain(rec))
}

// ListMemberExperiments handles GET /api/instructor/members/:userId/scinotes/:sciNoteId/experiments
//
// Returns all non-deleted experiment records for a SciNote owned by the target user.
// Reuses ExperimentService.List — passing targetUserID verifies SciNote ownership
// (note.UserID == targetUserID) before returning records.
func (h *InstructorHandler) ListMemberExperiments(w http.ResponseWriter, r *http.Request) {
        targetUserID := chi.URLParam(r, "userId")
        sciNoteID    := chi.URLParam(r, "sciNoteId")

        records, err := h.experiments.List(r.Context(), sciNoteID, targetUserID, false)
        if err != nil {
                mapServiceError(w, err)
                return
        }

        items := make([]dto.ExperimentResponse, len(records))
        for i := range records {
                items[i] = dto.ExperimentResponseFromDomain(&records[i])
        }
        writeJSON(w, http.StatusOK, dto.ListExperimentsResponse{Items: items, Total: len(items)})
}
