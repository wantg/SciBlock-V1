package dto

import "sciblock/go-api/internal/domain"

// ExperimentResponseFromDomain converts a domain.ExperimentRecord to the JSON
// presentation type returned by all ExperimentRecord endpoints.
// Tags are always serialized as a non-null array to simplify frontend consumption.
// All inheritance-chain fields are included so the frontend never needs a follow-up query.
func ExperimentResponseFromDomain(rec *domain.ExperimentRecord) ExperimentResponse {
        tags := rec.Tags
        if tags == nil {
                tags = []string{}
        }

        state := rec.ConfirmationState
        if state == "" {
                state = domain.Statedraft
        }

        sourceType := rec.DerivedFromSourceType
        if sourceType == "" {
                sourceType = domain.SourceInitial
        }

        return ExperimentResponse{
                ID:                    rec.ID,
                SciNoteID:             rec.SciNoteID,
                Title:                 rec.Title,
                PurposeInput:          rec.PurposeInput,
                ExperimentStatus:      rec.ExperimentStatus,
                ExperimentCode:        rec.ExperimentCode,
                Tags:                  tags,
                EditorContent:         rec.EditorContent,
                ReportHtml:            rec.ReportHtml,
                ReportGeneratedAt:     rec.ReportGeneratedAt,
                ReportSource:          rec.ReportSource,
                ReportUpdatedAt:       rec.ReportUpdatedAt,
                CurrentModules:        rec.CurrentModules,
                InheritedVersionID:    rec.InheritedVersionID,
                IsDeleted:             rec.IsDeleted,
                CreatedAt:             rec.CreatedAt,
                UpdatedAt:             rec.UpdatedAt,
                SequenceNumber:        rec.SequenceNumber,
                ConfirmationState:     state,
                ConfirmedAt:           rec.ConfirmedAt,
                DerivedFromSourceType: sourceType,
                DerivedFromRecordID:   rec.DerivedFromRecordID,
                DerivedFromRecordSeq:  rec.DerivedFromRecordSeq,
                DerivedFromContextVer: rec.DerivedFromContextVer,
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

// RecentExperimentItemFromDomain converts a domain.RecentExperimentRow to the
// JSON shape returned by GET /api/experiments/recent.
func RecentExperimentItemFromDomain(row *domain.RecentExperimentRow) RecentExperimentItem {
        return RecentExperimentItem{
                ExperimentID:     row.ExperimentID,
                ExperimentTitle:  row.ExperimentTitle,
                SciNoteID:        row.SciNoteID,
                SciNoteTitle:     row.SciNoteTitle,
                ExperimentStatus: row.ExperimentStatus,
                CreatedAt:        row.CreatedAt,
                UpdatedAt:        row.UpdatedAt,
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
