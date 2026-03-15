package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"sciblock/go-api/internal/dto"
	"sciblock/go-api/internal/middleware"
	"sciblock/go-api/internal/service"
)

// AuthHandler handles auth-related HTTP endpoints.
// It may only call service methods and write HTTP responses — no business logic here.
type AuthHandler struct {
	auth *service.AuthService
}

// NewAuthHandler creates an AuthHandler.
func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

// Login handles POST /api/auth/login.
// On success returns a JWT token + user DTO.
// On bad credentials returns 401.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON")
		return
	}

	result, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid email or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "server_error", "An unexpected error occurred")
		return
	}

	writeJSON(w, http.StatusOK, dto.LoginResponse{
		Token: result.Token,
		User:  dto.UserDTOFromDomain(result.User),
	})
}

// Me handles GET /api/auth/me — requires RequireAuth middleware.
// Returns the user record associated with the JWT token.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	user, err := h.auth.Me(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	writeJSON(w, http.StatusOK, dto.UserDTOFromDomain(user))
}

// Logout handles POST /api/auth/logout.
//
// JWTs are stateless — client-side token deletion is sufficient.
// This endpoint exists as a clean no-op hook so that:
//  1. The frontend has a symmetric logout API call to make.
//  2. Server-side invalidation (e.g. Redis denylist) can be added here
//     in a future iteration without any frontend changes.
func (h *AuthHandler) Logout(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "Logged out"})
}
