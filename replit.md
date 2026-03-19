# Overview

SciBlock is a full-stack scientific lab management platform designed as a pnpm workspace monorepo. It serves as a comprehensive digital lab notebook for academic research groups, facilitating experiment creation, tracking, team coordination, and automated weekly reporting. The platform aims to streamline scientific workflows, enhance collaboration, and automate routine tasks such as report generation.

Key capabilities include:
- User authentication with role-based access control.
- Guided experiment creation and management using "SciNotes."
- A rich-text experiment workbench with module-level editing and AI-powered report generation.
- Team and member management, including student invitations and profiles.
- A messaging system for notifications and sharing.
- A weekly report system for student submissions, instructor reviews, and AI-driven summarization.
- Integration with AI chat services.
- A calendar view for scheduling and tracking.

# User Preferences

Iterative development with clear communication on significant changes. Detailed explanations for complex features or architectural decisions. Ask before making major changes to project structure or core functionality.

# System Architecture

The project utilizes a pnpm monorepo structure, separating deployable services (`artifacts/`) from shared libraries (`lib/`).

**Frontend (`artifacts/web`)**:
-   **Framework**: React 19 + Vite 6 + TypeScript.
-   **Routing**: Wouter.
-   **State Management**: React Context.
-   **UI**: shadcn/ui primitives with Tailwind CSS.
-   **API Client**: Structured client for backend interaction.
-   **Authentication**: JWT-based, stored in `localStorage`.
-   **Persistence**: API-first for SciNote and Experiment data, with `localStorage` and `sessionStorage` fallbacks.
-   **Experiment Inheritance**: Server-side inheritance of modules for new experiment records, supporting a three-state lifecycle (draft, confirmed, confirmed_dirty). Module structure is consistent across experiments (system, preparation, operation, measurement, data), but only content from system, preparation, operation, and measurement modules is heritable. The 'data' module content always starts blank.
-   **`confirmed_dirty` UI**: Visual indicators (banners, badges, pulse rings) in the UI are triggered when an experiment record is in a `confirmed_dirty` state.
-   **Server State Synchronization**: Local state is synchronized with server responses after updates to maintain accurate confirmation states.

**Express API Server (`artifacts/api-server`)**:
-   **Framework**: Express 5.
-   **Authentication**: Stateless JWT verification with role-based middleware.
-   **Database**: Drizzle ORM over PostgreSQL (`@workspace/db`).
-   **Architecture**: Layered design (routes → services → repositories).
-   **Key Services**: Asynchronous report submission and AI report generation.
-   **Routes**: Manages messages, teams, reports, users, and AI chat.
-   **Go API Proxy**: Proxies specific authentication, SciNote, and experiment-related API calls to the Go API server.
-   **Data Ownership**: Manages `users` (shared), `students`, `papers`, `weekly_reports`, `report_comments`, `weekly_report_experiment_links`, `messages`, and `shares` tables.
-   **Share System**: Handles sharing of experiments and reports.
-   **Weekly Report-Experiment Linkage**: Utilizes a junction table (`weekly_report_experiment_links`) to store explicitly selected experiment record IDs per report. The system distinguishes between reports with explicitly managed links (even if empty) and older reports that fall back to date-range-based experiment inclusion for AI generation.
-   **Multi-Date Report Model**: New reports use discrete date selection via `weekly_report_selected_dates` table (one row per selected date). The canonical flow is: `selected_dates → candidate experiments (GET /reports/candidate-experiments?dates[]=…) → explicit links (PUT /reports/:id/links) → AI generation`. Reports with `dates_last_saved_at NOT NULL` use the new model; those with `NULL` fall back to the legacy date-range model. `week_start/week_end` are set to min/max of selected dates (display/ordering only).
-   **Report Generation (AI)**: Uses DashScope qwen-plus as primary AI provider with rule-based fallback. `_generationMeta.source` in `ai_content_json` tracks whether content came from `"llm"` or `"rule_fallback"`. Links (`weekly_report_experiment_links`) are the sole data source for generation regardless of date model.
-   **API endpoints for dates**: `GET /reports/experiment-dates?year=&month=` (calendar dot indicators), `GET /reports/candidate-experiments?dates[]=…` (grouped candidates), `GET /reports/:id/dates`, `PUT /reports/:id/dates` (full replace, stamps `dates_last_saved_at`).

**Go API Server (`artifacts/go-api`)**:
-   **Framework**: chi v5.
-   **Authentication**: JWT (HMAC-HS256) for protected routes.
-   **Database**: pgx/v5 connection pool for PostgreSQL.
-   **Migrations**: goose v3 for database schema management.
-   **Data Ownership**: Manages `scinotes` and `experiment_records` tables, and includes a `role` column in the `users` table.
-   **Architecture**: Structured design with separate packages for config, DB, domain, repository, service, handler, middleware, and DTOs.

**Shared Libraries (`lib/`)**:
-   **`lib/db`**: Drizzle ORM schema and migration utilities.
-   **`lib/api-spec`**: OpenAPI 3.1 specification.
-   **`lib/api-zod`**: Generated Zod schemas.
-   **`lib/api-client-react`**: Generated React Query hooks.

**Database Migration Strategy**:
-   Drizzle manages tables owned by the Express API.
-   Goose manages tables owned by the Go API. Both target the same PostgreSQL database with idempotent migrations.

# Completed Capabilities

## Weekly Report × Experiment Record Linkage (Multi-Date Model)

**Status**: Production-ready as of 2026-03-19. Fully verified end-to-end.

### What was built
The weekly report system was migrated from a "continuous date range" model to a **discrete multi-date selection model**. The canonical flow is now:

```
selected_dates → candidate experiments → explicit links → AI generation
```

### Data model
| Table / Column | Role |
|---|---|
| `weekly_report_selected_dates` | One row per selected date per report. Sole source for candidate discovery. |
| `weekly_reports.dates_last_saved_at` | `NULL` = legacy (date-range) report; `NOT NULL` = new multi-date report. Acts as the model discriminant. |
| `weekly_reports.links_last_saved_at` | `NULL` = links never managed (date-range fallback allowed); `NOT NULL` = student has explicitly managed links (fallback permanently disabled). |
| `weekly_report_experiment_links` | Junction table. **The only data source for AI generation.** |
| `weekly_reports.week_start / week_end` | Set to min/max of selected_dates. Used for display and ordering only. |

### Semantic boundaries (confirmed)
- `selected_dates` is **only** a candidate pool source — used for calendar dot indicators and the `/candidate-experiments` endpoint.
- `links` are the **sole AI material** — the generation service never reads `selected_dates`.
- `dateRangeStart / dateRangeEnd` are **legacy fallback only** — used in the generation service only when `linksLastSavedAt IS NULL` (old reports created before this feature).
- Empty links explicitly saved by the student are **respected** — no silent fallback to date-range even if links are empty.

### API surface
| Endpoint | Purpose |
|---|---|
| `GET /reports/experiment-dates?year=&month=` | Calendar dot indicators — which days have experiment records |
| `GET /reports/candidate-experiments?dates[]=…` | Candidate experiments grouped by date for wizard Step 2 |
| `GET /reports/:id/dates` | Read saved selected dates (student + instructor) |
| `PUT /reports/:id/dates` | Full-replace selected dates, stamps `dates_last_saved_at` |
| `GET /reports/:id/links` | Read linked experiment records (student + instructor) |
| `PUT /reports/:id/links` | Full-replace links, stamps `links_last_saved_at` |

### UI components
- **`GenerateReportWizard`**: Step 1 = multi-date calendar (aria-label YYYY-MM-DD, dot indicators); Step 2 = candidate experiments grouped by date (expand/collapse, group select-all, role=checkbox per row); Step 3 = 4-phase flow (create → save dates → save links → AI generate → poll).
- **`ReportWorkPanel`** (student): `SelectedDatesSection` (read + edit modal, new-model only) + `LinkedExperimentsSection` (supports both models).
- **`TeamReportDetailPanel`** (instructor): Read-only "已选日期" chips + "关联实验记录" list, fetched live via API, visible only for new-model reports.

### Verification results (2026-03-19)
- Multi-date selection with real experiments (03-15 × 4 records, 03-18 × 14 records) ✅
- Step 2 grouped display with correct counts ✅
- 3-experiment selection across 2 dates saved correctly to DB ✅
- Re-entry: dates and links both display correctly ✅
- Instructor API access to dates and links confirmed ✅
- AI generation used `links` (not `selected_dates`): `source="llm"`, `experimentCount=3` ✅

---

## Experiment Report: Phase 1 Refactoring (Report View Model Pipeline)

**Status**: Complete as of 2026-03-19. TypeScript clean (0 errors).

### What changed

Replaced the old local stub (`buildReportHtml` — raw module data serialized to HTML lists via a 1600ms setTimeout) with a proper **three-layer pipeline**:

```
ReportGeneratorInput
  → mapModulesToReportModel()    [utils/reportMapper.ts]
  → ExperimentReportModel
  → renderReportModel()          [utils/reportRenderer.ts]
  → HTML string
```

### New files
| File | Role |
|---|---|
| `src/utils/reportMapper.ts` | Maps ontology module data → ExperimentReportModel. Contains all "modules → report" transformation logic. Caps list lengths (MAX_SYSTEM_OBJECTS=5, MAX_PREP_PER_CAT=5, MAX_PROCEDURE_STEPS=8, MAX_MEASUREMENTS=5). |
| `src/utils/reportRenderer.ts` | Renders ExperimentReportModel → TipTap-compatible HTML. Report-oriented sections with Chinese numeral headings. Placeholder sections for findings and conclusion. |

### Modified files
| File | Change |
|---|---|
| `src/types/report.ts` | Added `ExperimentReportModel` and sub-types (`ReportSystemSummary`, `ReportPreparationSummary`, `ReportProcedureSummary`, `ReportMeasurementDataSummary`, etc.). Infrastructure types (ReportStatus, ExperimentReport, ReportGeneratorInput) unchanged. |
| `src/api/report.ts` | Replaced `buildReportHtml()` body with mapper+renderer call. Function signature and 1.5 s delay preserved — zero changes needed by callers (WorkbenchContext, useExperimentReport). |

### Report structure (9 sections)
1. Header — title, experimentType, generatedAt timestamp
2. 实验目的 — from `objective` (omitted if empty)
3. 实验概述 — template-based 2–4 sentence executive summary (Phase 2: AI-generated)
4. 实验系统与研究对象 — capped role-aware object list
5. 实验准备 — grouped by category, capped per category
6. 实验过程 — top-N key steps with primary param
7. 测量与数据获取 — merged measurement methods + data types
8. 结果分析 — placeholder (Phase 2: AI-generated analysis)
9. 实验结论 — placeholder (Phase 2: AI-generated conclusion)

---

## Experiment Report: Phase 2.1 — Reliability Fixes

**Status**: Complete as of 2026-03-19. Upgrades "可演示" → "可日常使用".

### What changed in Phase 2.1 (reliability fixes, no new features)

**Fix 1 — Synchronous "保存修改"**
- `useExperimentReport.ts`: Removed debounced `updateReport`. New `commitReport(html): Promise<void>` directly awaits `PUT /report` before returning.
- `ReportSection.tsx`: `handleSave()` is now `async`, awaits `commitReport()`, shows "保存中…" spinner and disables buttons. Failure keeps edit mode open with a visible error banner. "保存修改" is now semantically equivalent to "backend has successfully persisted the change".

**Fix 2 — Atomic regenerate (no race condition)**
- New backend endpoint: `POST /api/experiments/:id/report/regenerate` — atomically overwrites the existing report in a single DB UPDATE. No preceding DELETE is needed.
- `useExperimentReport.ts`: New `triggerRegenerate()` — clears local state immediately (spinner), then sends exactly ONE request to `/regenerate`. Replaces the old `clearReport() + triggerReportGeneration()` two-request pattern that had a DELETE/POST race condition.
- `ReportSection.tsx`: `handleRegenerate()` calls `triggerRegenerate()` instead of the old two-call pattern.

**Fix 3 — `source` field semantics (ai_modified)**
- `saveReportHtml` now uses a SQL CASE expression:
  - `'ai'` or `'stub'` → `'ai_modified'` (user edited an AI-generated draft)
  - `'ai_modified'` → `'ai_modified'` (stays — already marked modified)
  - `'manual'` / NULL → `'manual'`
- Source state machine is now: `null → ai/stub → ai_modified → ai` (on next regenerate)

**Fix 4 — `report_model_json` semantics documented**
- Explicit code comments in `generateAndSaveReport` and `saveReportHtml` clarify:
  - `report_model_json` is an AUDIT SNAPSHOT of the last AI generation run.
  - It is NOT updated on manual edits. After a manual edit, `report_html` is the truth source.
  - Never use `report_model_json` for re-rendering in production code.

---

## Experiment Report: Phase 2 — Real AI Backend + DB Persistence

**Status**: Complete as of 2026-03-19. End-to-end verified (source="ai", HTML persisted to DB).
Superseded by Phase 2.1 reliability fixes (see above).

### What changed

The Phase-1 local stub pipeline has been replaced with a full server-side AI generation flow:

```
POST /api/experiments/:id/report/generate   (Express)
  ↓  reads experiment_records + scinotes from DB (ownership check)
  ↓  mapToReportModel()        — same mapper logic as frontend Phase 1
  ↓  callAiForReportBlocks()   — qwen-plus / OpenAI for 3 blocks: summary, analysis, conclusion
  ↓  renderReportModel()        — same renderer logic as frontend Phase 1
  ↓  UPDATE experiment_records  — persists html + metadata
  → returns { html, source, generatedAt }
```

AI failure (no key, timeout, bad JSON) → graceful fallback to placeholder text (`source = "stub"`).

### DB migration — 20260319006_add_report_fields.sql

Four new nullable columns on `experiment_records`:
| Column | Type | Purpose |
|---|---|---|
| `report_generated_at` | TIMESTAMPTZ | Set on first generation (not updated by manual edits) |
| `report_source` | TEXT | `"ai"` / `"stub"` / `"manual"` / NULL (no report) |
| `report_updated_at` | TIMESTAMPTZ | Updated on every save (generate or manual PUT) |
| `report_model_json` | JSONB | ExperimentReportModel snapshot for the last generation |

### New Express endpoints (handled by Express, excluded from Go proxy via EXPERIMENT_REPORT_RE)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/experiments/:id/report/generate` | First-time AI generation pipeline (requires auth, ownership check) |
| `POST` | `/api/experiments/:id/report/regenerate` | Atomic overwrite+regenerate — no race condition (Phase 2.1) |
| `PUT` | `/api/experiments/:id/report` | Save manually edited HTML (source: `ai`→`ai_modified`, else `manual`) |
| `DELETE` | `/api/experiments/:id/report` | Clear all report fields (reset to idle) |

### New Express service

`artifacts/api-server/src/services/experiment-report.service.ts` — fully self-contained:
- `mapToReportModel()` — mapper ported from frontend (reads modules JSON, produces structured model)
- `renderReportModel()` — renderer ported from frontend (same section structure as Phase 1)
- `buildExperimentPrompt()` — constructs Chinese-language structured prompt for the AI
- `generateAndSaveReport(experimentId, userId)` — full pipeline, direct DB access via `pool`
- `saveReportHtml(experimentId, userId, html)` — manual save, sets source="manual"
- `clearReport(experimentId, userId)` — nulls all report fields

### Go API changes

- Migration adds 4 columns (auto-applied via goose on startup)
- `domain/experiment.go` — ExperimentRecord gains `ReportGeneratedAt`, `ReportSource`, `ReportUpdatedAt`, `ReportModelJson`
- `dto/experiment_dto.go` — ExperimentResponse includes the 3 new response fields
- `repository/experiment_repo_pgx.go` — `expColumns` constant and `scanExperiment` extended (fields appended at end)
- No new Go routes needed — report save/clear is handled by Express via direct DB pool

### Frontend changes

| File | Change |
|---|---|
| `types/experiment.ts` | Added `reportSource?`, `reportGeneratedAt?`, `reportUpdatedAt?` to ExperimentRecord |
| `api/experiments.ts` | Wire type updated; `generateReport(id)`, `saveReport(id, html)`, `clearExperimentReport(id)` added |
| `api/memberSciNotes.ts` | MemberExperimentApiResponse updated to include 3 new report fields |
| `hooks/useExperimentReport.ts` | Phase 2: manual trigger via `generateReport(id)`. Phase 2.1: removed debounced `updateReport`; added `commitReport(html)` (direct await) and `triggerRegenerate()` (single atomic call to `/regenerate`). |
| `contexts/WorkbenchContext.tsx` | Auto-trigger in `setModuleStatus` now calls `generateReport(currentRecordId)` instead of local stub |

### AI provider notes

The service uses `buildProviderConfig()` from `ai-client.service.ts`:
- Primary: `AI_PROVIDER=qianwen` → requires `DASHSCOPE_API_KEY`
- Fallback: set `AI_PROVIDER=openai` → uses `OPENAI_API_KEY`
- No key → graceful stub fallback (rule-based report without AI text for findings/conclusion)

---

## Phase 2 Candidate Optimizations (Backlog — Not Yet Implemented)

The following improvements are scoped but deferred:

1. **Date picker UX** — replace the custom mini-calendar with a more polished multi-select calendar component; add keyboard navigation; show month/year jump controls.
2. **Richer candidate experiment info** — show experiment status badge, last-modified time, and a one-line content preview in the Step 2 candidate list to help students make more informed selections.
3. **Instructor drill-down** — allow instructors to click a linked experiment in `TeamReportDetailPanel` to expand its module content (purpose, method, results) inline, without navigating away from the report review context.
4. **Reverse linkage view** — on the experiment workbench, surface a "引用此实验的周报" (reports that cite this experiment) badge or panel so students and instructors can trace which reports reference a given experiment record.

---

# Development Environment Rules

## API Client: Never Hardcode localhost in the Frontend

**Root cause of 2026-03-19 login outage**: `client.ts` had a DEV-mode fallback of `http://localhost:8080/api`. In a Replit / any HTTPS-hosted dev environment the browser loads pages over HTTPS. A fetch to a plain `http://localhost:*` URL is **Mixed Content** and is silently blocked by the browser before it reaches the server. The result is a `TypeError` (no HTTP response), not an `ApiError`, so any generic catch clause that only handles `ApiError` will swallow the real cause.

**Rules going forward**:

1. **Frontend API clients use relative paths (`/api/...`) in all environments.** The Vite dev server proxy (`server.proxy` in `vite.config.ts`) forwards `/api` → `localhost:8080`. This keeps the browser on the same HTTPS origin, eliminating Mixed Content entirely.

2. **`VITE_API_BASE_URL` is the only override mechanism.** Set it when you need to point a local browser at a remote/staging backend. Never hard-code a port in application code.

3. **Backend server-to-server calls may use `localhost`.** `GO_API_URL` (Express → Go, defaults `localhost:8082`) and `LOCAL_AI_BASE_URL` (Ollama fallback, `localhost:11434`) are fine — they run inside the container and are protected by environment variable overrides.

4. **`catch` blocks in critical flows (login, form submission) must distinguish error types.** A bare `catch` that shows a generic "Something went wrong" hides the real failure. At minimum: show `ApiError.message` for server errors and `TypeError.message` in DEV for network-layer failures. Production can stay generic.

## Vite Dev Proxy

`artifacts/web/vite.config.ts` currently proxies:

```
/api  →  http://localhost:8080  (Express API — auth, reports, team, messages)
```

The Go API (`localhost:8082`) is reached exclusively through Express (Express proxies scinote/experiment calls to Go internally). No second proxy entry is needed.

# External Dependencies

-   **PostgreSQL**: Primary relational database.
-   **bcrypt**: Secure password hashing.
-   **TipTap**: Rich-text editor.
-   **OpenAPI / Orval**: API specification and code generation.
-   **shadcn/ui**: UI component library.
-   **Wouter**: Lightweight React router.
-   **chi**: Go HTTP router.
-   **golang-jwt/jwt**: Go JWT library.
-   **pgx/v5**: PostgreSQL driver for Go.
-   **goose**: Go database migration tool.
-   **http-proxy-middleware**: Node.js proxy middleware.
-   **Aliyun DashScope / OpenAI**: AI chat providers for AI functionalities.