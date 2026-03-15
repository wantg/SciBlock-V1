package service

import "errors"

// Service-layer sentinel errors.
//
// These errors are the only errors that handlers are allowed to inspect with errors.Is.
// All other errors from the service layer are treated as 500 Internal Server Error.
// HTTP status code mapping lives exclusively in handler/response.go (mapServiceError).
var (
	// ErrNotFound is returned when the requested resource does not exist.
	ErrNotFound = errors.New("not found")

	// ErrForbidden is returned when the caller does not own or cannot access the resource.
	ErrForbidden = errors.New("forbidden")

	// ErrInvalidCredentials is returned when the email/password pair is wrong.
	ErrInvalidCredentials = errors.New("invalid email or password")
)
