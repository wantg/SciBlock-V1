// Package router builds the application HTTP router.
//
// Responsibilities of this package:
//   - Assemble the chi middleware stack.
//   - Declare all URL paths and bind them to handler methods.
//   - Nothing else — no business logic, no dependency construction.
//
// main.go constructs all dependencies and passes them here.
// This separation makes the full route table testable in isolation.
package router

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"

	"sciblock/go-api/internal/handler"
	mw "sciblock/go-api/internal/middleware"
)

// New builds and returns the application router.
// All route registrations live here; main.go only calls this function.
func New(
	jwtSecret string,
	authH *handler.AuthHandler,
	sciNoteH *handler.SciNoteHandler,
	experimentH *handler.ExperimentHandler,
) http.Handler {
	r := chi.NewRouter()

	// ---------------------------------------------------------------------------
	// Global middleware (applied to every request)
	// ---------------------------------------------------------------------------
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(mw.CORS())

	// ---------------------------------------------------------------------------
	// Health check — public, no authentication required
	// ---------------------------------------------------------------------------
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"status":"ok","service":"sciblock-go-api"}`)
	})

	// ---------------------------------------------------------------------------
	// API routes
	// ---------------------------------------------------------------------------
	r.Route("/api", func(r chi.Router) {
		// Public — no JWT required
		r.Post("/auth/login", authH.Login)

		// Protected — all routes below require a valid JWT
		r.Group(func(r chi.Router) {
			r.Use(mw.RequireAuth(jwtSecret))

			// Auth
			r.Get("/auth/me", authH.Me)
			r.Post("/auth/logout", authH.Logout)

			// SciNotes
			r.Get("/scinotes", sciNoteH.List)
			r.Post("/scinotes", sciNoteH.Create)
			r.Get("/scinotes/{id}", sciNoteH.Get)
			r.Patch("/scinotes/{id}", sciNoteH.Update)
			r.Delete("/scinotes/{id}", sciNoteH.Delete)

			// Experiments — nested under SciNote (list + create)
			r.Get("/scinotes/{id}/experiments", experimentH.ListBySciNote)
			r.Post("/scinotes/{id}/experiments", experimentH.Create)

			// Experiments — standalone operations (by experiment ID)
			r.Get("/experiments/{id}", experimentH.Get)
			r.Patch("/experiments/{id}", experimentH.Update)
			r.Delete("/experiments/{id}", experimentH.SoftDelete)
			r.Patch("/experiments/{id}/restore", experimentH.Restore)
		})
	})

	return r
}
