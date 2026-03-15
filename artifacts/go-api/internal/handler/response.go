// Package handler contains HTTP handlers.
//
// Architectural rules enforced in this package:
//   - Handlers decode request → call service → encode response. Nothing else.
//   - All business logic lives in the service layer.
//   - All data-access logic lives in the repository layer.
//   - Domain-to-DTO mapping is delegated to dto.XxxFromDomain functions.
//   - Shared HTTP utilities (writeJSON, writeError, mapServiceError) live here,
//     in response.go, to avoid duplicating them across handler files.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"sciblock/go-api/internal/service"
)

// writeJSON serializes v as JSON and writes it to w with the given HTTP status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

// writeError writes a standard JSON error envelope: {"error": code, "message": message}.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{
		"error":   code,
		"message": message,
	})
}

// mapServiceError translates well-known service sentinel errors into HTTP responses.
// Any unrecognized error is rendered as 500 Internal Server Error.
// Add new sentinel cases here as the service layer grows — never in individual handlers.
func mapServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "Resource not found")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
	default:
		writeError(w, http.StatusInternalServerError, "server_error", "An unexpected error occurred")
	}
}
