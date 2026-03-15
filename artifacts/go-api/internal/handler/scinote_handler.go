package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"sciblock/go-api/internal/domain"
	"sciblock/go-api/internal/dto"
	"sciblock/go-api/internal/middleware"
	"sciblock/go-api/internal/service"
)

// SciNoteHandler handles /api/scinotes HTTP endpoints.
// All business logic and ownership validation live in SciNoteService.
type SciNoteHandler struct {
	svc *service.SciNoteService
}

// NewSciNoteHandler creates a SciNoteHandler.
func NewSciNoteHandler(svc *service.SciNoteService) *SciNoteHandler {
	return &SciNoteHandler{svc: svc}
}

// List handles GET /api/scinotes.
// Returns all non-deleted SciNotes owned by the authenticated user.
func (h *SciNoteHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	notes, err := h.svc.List(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to list SciNotes")
		return
	}

	items := make([]dto.SciNoteResponse, len(notes))
	for i := range notes {
		items[i] = dto.SciNoteResponseFromDomain(&notes[i])
	}
	writeJSON(w, http.StatusOK, dto.ListSciNotesResponse{Items: items, Total: len(items)})
}

// Get handles GET /api/scinotes/:id.
func (h *SciNoteHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	note, err := h.svc.Get(r.Context(), id, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.SciNoteResponseFromDomain(note))
}

// Create handles POST /api/scinotes.
// Default field values (e.g. kind) are applied in SciNoteService.Create.
func (h *SciNoteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateSciNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "title is required")
		return
	}

	claims := middleware.ClaimsFromContext(r.Context())

	// Pure data translation from request DTO to domain input type.
	// Business defaults (e.g. default kind) are applied in SciNoteService.Create.
	input := domain.SciNote{
		Title:          req.Title,
		Kind:           req.Kind,
		ExperimentType: req.ExperimentType,
		Objective:      req.Objective,
		FormData:       req.FormData,
	}

	created, err := h.svc.Create(r.Context(), input, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create SciNote")
		return
	}
	writeJSON(w, http.StatusCreated, dto.SciNoteResponseFromDomain(created))
}

// Update handles PATCH /api/scinotes/:id.
// All patch fields are optional; only non-nil fields are written to the database.
func (h *SciNoteHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	var req dto.UpdateSciNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON")
		return
	}

	patch := domain.SciNotePatch{
		Title:          req.Title,
		ExperimentType: req.ExperimentType,
		Objective:      req.Objective,
		FormData:       req.FormData,
	}

	updated, err := h.svc.Update(r.Context(), id, patch, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.SciNoteResponseFromDomain(updated))
}

// Delete handles DELETE /api/scinotes/:id (soft delete).
func (h *SciNoteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	if err := h.svc.Delete(r.Context(), id, claims.UserID); err != nil {
		mapServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
