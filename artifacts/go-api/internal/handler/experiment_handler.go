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

// ExperimentHandler handles ExperimentRecord HTTP endpoints.
// All business logic and validation rules live in ExperimentService.
type ExperimentHandler struct {
	svc *service.ExperimentService
}

// NewExperimentHandler creates an ExperimentHandler.
func NewExperimentHandler(svc *service.ExperimentService) *ExperimentHandler {
	return &ExperimentHandler{svc: svc}
}

// ListBySciNote handles GET /api/scinotes/:id/experiments
// Query param: ?deleted=true → return soft-deleted records (trash view).
func (h *ExperimentHandler) ListBySciNote(w http.ResponseWriter, r *http.Request) {
	sciNoteID := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())
	trashOnly := r.URL.Query().Get("deleted") == "true"

	records, err := h.svc.List(r.Context(), sciNoteID, claims.UserID, trashOnly)
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

// Create handles POST /api/scinotes/:id/experiments
// Validation and default field values are applied in the service layer.
func (h *ExperimentHandler) Create(w http.ResponseWriter, r *http.Request) {
	sciNoteID := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	var req dto.CreateExperimentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "title is required")
		return
	}

	// Pure data translation from request DTO to domain input type.
	// Business defaults (e.g. default status) are applied in ExperimentService.Create.
	input := domain.ExperimentRecord{
		Title:              req.Title,
		PurposeInput:       req.PurposeInput,
		ExperimentStatus:   req.ExperimentStatus,
		ExperimentCode:     req.ExperimentCode,
		Tags:               req.Tags,
		CurrentModules:     req.CurrentModules,
		InheritedVersionID: req.InheritedVersionID,
	}

	created, err := h.svc.Create(r.Context(), sciNoteID, input, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, dto.ExperimentResponseFromDomain(created))
}

// Get handles GET /api/experiments/:id
func (h *ExperimentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	rec, err := h.svc.Get(r.Context(), id, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.ExperimentResponseFromDomain(rec))
}

// Update handles PATCH /api/experiments/:id
// All patch fields are optional; only non-nil fields are written to the database.
func (h *ExperimentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	var req dto.UpdateExperimentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON")
		return
	}

	patch := domain.ExperimentPatch{
		Title:            req.Title,
		ExperimentStatus: req.ExperimentStatus,
		ExperimentCode:   req.ExperimentCode,
		Tags:             req.Tags,
		EditorContent:    req.EditorContent,
		ReportHtml:       req.ReportHtml,
		CurrentModules:   req.CurrentModules,
	}

	updated, err := h.svc.Update(r.Context(), id, patch, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.ExperimentResponseFromDomain(updated))
}

// SoftDelete handles DELETE /api/experiments/:id
// Sets is_deleted=true; the record can be restored via the Restore endpoint.
func (h *ExperimentHandler) SoftDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	if err := h.svc.SoftDelete(r.Context(), id, claims.UserID); err != nil {
		mapServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Restore handles PATCH /api/experiments/:id/restore
// Sets is_deleted=false, making the record active again.
func (h *ExperimentHandler) Restore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := middleware.ClaimsFromContext(r.Context())

	restored, err := h.svc.Restore(r.Context(), id, claims.UserID)
	if err != nil {
		mapServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.ExperimentResponseFromDomain(restored))
}
