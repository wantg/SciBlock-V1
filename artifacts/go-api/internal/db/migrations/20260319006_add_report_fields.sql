-- +goose Up
-- +goose StatementBegin

-- Add experiment-report persistence fields to experiment_records.
--
-- report_html already exists (added in migration 20260315003).
-- This migration adds the metadata fields required for Phase 2:
--   report_generated_at — when the report was first AI/stub-generated
--   report_source       — who/what produced the current report_html:
--                           NULL     = no report yet
--                           'stub'   = local Phase-1 rule-based generation (legacy)
--                           'ai'     = server-side AI generation (Phase 2+)
--                           'manual' = user edited and explicitly saved
--   report_updated_at   — last time report_html was saved (generate or manual edit)
--   report_model_json   — JSONB snapshot of the ExperimentReportModel used for the
--                         last generation; useful for diagnostics and future diffing.

ALTER TABLE experiment_records
    ADD COLUMN IF NOT EXISTS report_generated_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS report_source         TEXT,
    ADD COLUMN IF NOT EXISTS report_updated_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS report_model_json     JSONB;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE experiment_records
    DROP COLUMN IF EXISTS report_model_json,
    DROP COLUMN IF EXISTS report_updated_at,
    DROP COLUMN IF EXISTS report_source,
    DROP COLUMN IF EXISTS report_generated_at;

-- +goose StatementEnd
