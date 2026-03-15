// Package middleware provides HTTP middleware for the Go API server.
package middleware

import (
	"net/http"
	"strings"
)

// CORS returns middleware that sets CORS response headers.
//
// allowedOrigins is the list of permitted request origins.
// When empty, the middleware uses Access-Control-Allow-Origin: * (permissive
// mode — suitable for development or environments behind a trusted reverse
// proxy that performs its own origin filtering).
//
// When non-empty, the middleware performs an exact origin match:
//   - Matching origins: Access-Control-Allow-Origin is set to that specific
//     origin, plus Vary: Origin so intermediate caches can distinguish responses.
//   - Non-matching origins: no CORS header is set; the browser blocks the request.
//   - OPTIONS preflight from a non-allowed origin receives 403.
//
// Configure via the CORS_ORIGINS environment variable (comma-separated list).
// See config.Load() / config.parseCORSOrigins() for parsing details.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	// Build a lookup set for O(1) matching.
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			originSet[trimmed] = struct{}{}
		}
	}
	allowAll := len(originSet) == 0

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			_, originAllowed := originSet[origin]

			switch {
			case allowAll:
				w.Header().Set("Access-Control-Allow-Origin", "*")
			case originAllowed:
				// Reflect the specific origin; Vary ensures caching correctness.
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Add("Vary", "Origin")
			}
			// No match: omit the header → browser blocks the cross-origin request.

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id")

			if r.Method == http.MethodOptions {
				if allowAll || originAllowed {
					w.WriteHeader(http.StatusNoContent)
				} else {
					w.WriteHeader(http.StatusForbidden)
				}
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
