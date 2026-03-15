package dto

import "sciblock/go-api/internal/domain"

// ExperimentResponseFromDomain converts a domain.ExperimentRecord to the JSON
// presentation type returned by all ExperimentRecord endpoints.
// Tags are always serialized as a non-null array to simplify frontend consumption.
func ExperimentResponseFromDomain(rec *domain.ExperimentRecord) ExperimentResponse {
	tags := rec.Tags
	if tags == nil {
		tags = []string{}
	}
	return ExperimentResponse{
		ID:                 rec.ID,
		SciNoteID:          rec.SciNoteID,
		Title:              rec.Title,
		PurposeInput:       rec.PurposeInput,
		ExperimentStatus:   rec.ExperimentStatus,
		ExperimentCode:     rec.ExperimentCode,
		Tags:               tags,
		EditorContent:      rec.EditorContent,
		ReportHtml:         rec.ReportHtml,
		CurrentModules:     rec.CurrentModules,
		InheritedVersionID: rec.InheritedVersionID,
		IsDeleted:          rec.IsDeleted,
		CreatedAt:          rec.CreatedAt,
		UpdatedAt:          rec.UpdatedAt,
	}
}

// SciNoteResponseFromDomain converts a domain.SciNote to the JSON presentation type
// returned by all SciNote endpoints.
func SciNoteResponseFromDomain(n *domain.SciNote) SciNoteResponse {
	return SciNoteResponse{
		ID:             n.ID,
		UserID:         n.UserID,
		Title:          n.Title,
		Kind:           n.Kind,
		ExperimentType: n.ExperimentType,
		Objective:      n.Objective,
		FormData:       n.FormData,
		CreatedAt:      n.CreatedAt,
		UpdatedAt:      n.UpdatedAt,
	}
}

// UserDTOFromDomain converts a domain.User to the JSON presentation type returned
// by auth endpoints (login, me).
func UserDTOFromDomain(u *domain.User) UserDTO {
	return UserDTO{
		ID:    u.ID,
		Email: u.Email,
		Name:  u.Name,
		Role:  string(u.Role),
	}
}
