/**
 * experiment-report.ts — Express route handlers for experiment report endpoints.
 *
 * These routes are intercepted BEFORE the Go API proxy (via pathFilter exclusion
 * in app.ts) so that experiment report operations are handled here, not forwarded
 * to Go.
 *
 * Routes (all require authentication):
 *   POST /api/experiments/:id/report/generate    — First-time AI report generation
 *   POST /api/experiments/:id/report/regenerate  — Atomic replace + regenerate (no race condition)
 *   PUT  /api/experiments/:id/report             — Save manually edited report HTML
 *   DELETE /api/experiments/:id/report           — Clear report (reset to idle)
 */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  generateAndSaveReport,
  saveReportHtml,
  clearReport,
} from "../services/experiment-report.service";

const router = Router({ mergeParams: true });

/**
 * POST /api/experiments/:id/report/generate
 *
 * First-time AI-powered report generation:
 *  1. Reads experiment + scinote metadata from DB (ownership-checked via user_id)
 *  2. Runs rule-based mapper → ExperimentReportModel
 *  3. Calls AI (qwen-plus / GPT fallback) for summary, analysis, conclusion
 *  4. Renders full HTML via renderer
 *  5. Persists to DB (report_html, report_source, report_generated_at, report_model_json)
 *  6. Returns { html, source, generatedAt }
 *
 * Response 200: { html: string, source: "ai"|"stub", generatedAt: string }
 * Response 404: experiment not found or not owned by caller
 * Response 500: unexpected error
 */
router.post("/:id/report/generate", requireAuth, async (req, res) => {
  const experimentId = String(req.params["id"]);
  const userId       = res.locals.userId as string;

  try {
    const result = await generateAndSaveReport(experimentId, userId);
    res.status(200).json({
      html:        result.html,
      source:      result.source,
      generatedAt: result.generatedAt,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(status).json({ error: "report_generation_failed", message });
  }
});

/**
 * POST /api/experiments/:id/report/regenerate
 *
 * Atomically replace the current report with a newly AI-generated one.
 * This is the backend half of the "重新生成" flow. The single DB UPDATE inside
 * generateAndSaveReport overwrites any existing report_html atomically, so the
 * frontend never needs to call DELETE before POST — eliminating the race condition
 * that existed when two concurrent requests competed to write the same row.
 *
 * Functionally identical to /generate; the separate endpoint exists to make the
 * "replace existing report" semantics explicit and to decouple the two flows in
 * the frontend.
 *
 * Response 200: { html: string, source: "ai"|"stub", generatedAt: string }
 * Response 404: experiment not found or not owned by caller
 * Response 500: unexpected error
 */
router.post("/:id/report/regenerate", requireAuth, async (req, res) => {
  const experimentId = String(req.params["id"]);
  const userId       = res.locals.userId as string;

  try {
    const result = await generateAndSaveReport(experimentId, userId);
    res.status(200).json({
      html:        result.html,
      source:      result.source,
      generatedAt: result.generatedAt,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(status).json({ error: "report_regeneration_failed", message });
  }
});

/**
 * PUT /api/experiments/:id/report
 *
 * Save a manually edited report HTML.
 * Source semantics (applied atomically via SQL CASE in saveReportHtml):
 *   - If current report_source is 'ai' or 'stub' → set 'ai_modified'
 *   - Otherwise (already 'manual', 'ai_modified', or NULL) → set 'manual'
 *
 * Body: { html: string }
 * Response 200: { ok: true }
 * Response 400: missing html
 * Response 404: experiment not found or not owned by caller
 */
router.put("/:id/report", requireAuth, async (req, res) => {
  const experimentId = String(req.params["id"]);
  const userId       = res.locals.userId as string;
  const { html }     = req.body as { html?: string };

  if (typeof html !== "string") {
    res.status(400).json({ error: "validation_error", message: "html is required" });
    return;
  }

  try {
    await saveReportHtml(experimentId, userId, html);
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(status).json({ error: "report_save_failed", message });
  }
});

/**
 * DELETE /api/experiments/:id/report
 *
 * Clear all report fields, resetting the experiment to idle report status.
 *
 * Response 204: no content
 * Response 404: experiment not found or not owned by caller
 */
router.delete("/:id/report", requireAuth, async (req, res) => {
  const experimentId = String(req.params["id"]);
  const userId       = res.locals.userId as string;

  try {
    await clearReport(experimentId, userId);
    res.status(204).send();
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(status).json({ error: "report_clear_failed", message });
  }
});

export default router;
