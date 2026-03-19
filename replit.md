# Overview

SciBlock is a full-stack scientific lab management platform built as a pnpm workspace monorepo. It functions as a comprehensive digital lab notebook for academic research groups, encompassing experiment creation, tracking, team coordination, and weekly reporting. The platform aims to streamline scientific workflows, enhance collaboration, and automate routine tasks like report generation.

Key capabilities include:
- User authentication with role-based access control (student/instructor).
- Guided experiment creation and management through "SciNotes."
- A rich-text experiment workbench with module-level editing and AI-powered report generation.
- Team and member management, including student invitations and detailed student profiles.
- A messaging system for notifications, share requests, and share deliveries.
- A weekly report system for student submissions, instructor reviews, and AI-driven report summarization.
- Integration with AI chat services.
- A calendar view for scheduling and tracking.

# User Preferences

Iterative development with clear communication on significant changes. Detailed explanations for complex features or architectural decisions. Ask before making major changes to project structure or core functionality.

# System Architecture

The project employs a pnpm monorepo structure, separating deployable services (`artifacts/`) from shared libraries (`lib/`).

**Frontend (`artifacts/web`)**:
-   **Framework**: React 19 + Vite 6 + TypeScript.
-   **Routing**: Wouter.
-   **State Management**: React Context for various application states.
-   **UI**: shadcn/ui primitives styled with Tailwind CSS.
-   **API Client**: Structured client for interacting with backend services.
-   **Key Features**: Shared content display, message detail routing, a well-defined report component tree, and a dual-column layout pattern for member details with permission-gated sections.
-   **Authentication**: JWT-based, stored in `localStorage`.
-   **Persistence**: API-first for SciNote and Experiment data, with `localStorage` and `sessionStorage` fallbacks/caches.
-   **Experiment Inheritance**: Server-side inheritance of modules for new experiment records, with a three-state lifecycle (draft, confirmed, confirmed_dirty).
-   **Module structure vs. content inheritance (critical distinction)**: ALL 5 ontology modules (system, preparation, operation, measurement, **data**) must exist in every experiment record. Only 4 modules are *content-heritable* (system/preparation/operation/measurement) — their content is copied from the chain into new records. The `data` (实验数据) module is **structure-only**: it always exists in every record but its content is never inherited from previous records (starts blank each time). Implemented by `blankAllModules()` in `workbenchUtils.ts`, which sends all 5 empty-content stubs as the `currentModules` base when creating new records. The backend's `MergeHeritableModules` replaces the 4 heritable stubs with chain defaults and keeps the data stub as-is (blank). Do NOT confuse "module existence" with "content inheritance" — they are controlled separately.
-   **confirmed_dirty UI**: `DirtyWarningBanner` (amber strip + "立即确认" button) in `ExperimentHeader`; pulse-ring amber confirm button; amber dot on `RecordSwitcher` tabs; amber `ConfirmationStateBadge`. All triggered when the server returns `confirmationState: "confirmed_dirty"` after a PATCH.
-   **Server State Sync**: `WorkbenchContext.syncServerState()` applies PATCH response `confirmationState` back to local `records` state after every `updateExperiment()` call (modules, title, tags, editor). Fixes confirmed_dirty not appearing in UI.
-   **`AttributeTagRow` null-guard**: `tags` prop defaulted to `[]` to prevent crash when inherited module has no attributes field.
-   **Legacy sequence_number fix**: goose migration `20260318005_fix_legacy_sequence_numbers.sql` repaired 16 legacy records (seq=0 → correct ordinals). All were `draft`, not in any inheritance chain. `RecordSwitcher` now uses `record.sequenceNumber` (not array index) for tab display.

**Express API Server (`artifacts/api-server`)**:
-   **Framework**: Express 5.
-   **Authentication**: Stateless JWT verification with `requireAuth` and `requireInstructor` middleware.
-   **Database**: Drizzle ORM over PostgreSQL (`@workspace/db`).
-   **Architecture**: Layered design (routes → services → repositories) for clear separation of concerns.
-   **Key Services**: Report submission and AI report generation (asynchronous).
-   **Routes**: Handles messages, team, reports, users, and AI chat.
-   **Go API Proxy**: Proxies specific authentication, SciNote, and experiment-related API calls to the Go API server.
-   **Data Ownership**: Manages `users` (shared), `students`, `papers`, `weekly_reports`, `report_comments`, `weekly_report_experiment_links`, `messages`, and `shares` tables.
-   **Share System**: Manages sharing of experiments and reports between users.
-   **Weekly Report ↔ Experiment Linkage**: `weekly_report_experiment_links` junction table stores explicitly student-selected experiment record IDs per report. `PUT /reports/:id/links` replaces the full link set (draft/needs_revision only) and stamps `links_last_saved_at = NOW()` on `weekly_reports`; `GET /reports/:id/links` returns linked experiments with full details. AI fallback rule: `links_last_saved_at IS NULL` → old report, fallback to date-range OK; `links_last_saved_at IS NOT NULL` (even with 0 links) → student explicitly managed links, AI uses links only (no silent date-range injection). Student UI: wizard Step 2 shows candidates with checkboxes (default unselected, re-fetches on date-range change via `[dateStart, dateEnd]` deps); ReportWorkPanel shows a "关联实验记录" section with "管理关联" modal for editable states. Instructor UI: ReportCard shows a collapsible "关联实验记录" list (loads lazily on expand); clicking any experiment row opens a `Sheet` slide panel with title, sciNote, status, date, and purpose input as a proper read-only drill-down.

**Go API Server (`artifacts/go-api`)**:
-   **Framework**: chi v5.
-   **Authentication**: JWT (HMAC-HS256) for protected routes.
-   **Database**: pgx/v5 connection pool for PostgreSQL.
-   **Migrations**: goose v3 for database schema management.
-   **Data Ownership**: Manages `scinotes` and `experiment_records` tables, and adds `role` column to `users`.
-   **Architecture**: Follows a structured design with separate packages for config, DB, domain, repository, service, handler, middleware, and DTOs.

**Shared Libraries (`lib/`)**:
-   **`lib/db`**: Drizzle ORM schema and migration utilities.
-   **`lib/api-spec`**: OpenAPI 3.1 specification.
-   **`lib/api-zod`**: Generated Zod schemas.
-   **`lib/api-client-react`**: Generated React Query hooks.

**Database Migration Strategy**:
-   **Drizzle**: Manages tables owned by the Express API.
-   **Goose**: Manages tables owned by the Go API, including `users.role` alteration. Both tools target the same PostgreSQL database with idempotent migrations.

# External Dependencies

-   **PostgreSQL**: Primary relational database for all services.
-   **bcrypt**: Used for secure password hashing in both Express and Go API.
-   **TipTap**: Rich-text editor used within the experiment workbench.
-   **OpenAPI / Orval**: For API specification and automated client/schema code generation.
-   **shadcn/ui**: UI component library for the frontend.
-   **Wouter**: Lightweight client-side router for React.
-   **chi**: Go HTTP router for the Go API server.
-   **golang-jwt/jwt**: Go library for JSON Web Token handling.
-   **pgx/v5**: PostgreSQL driver for Go.
-   **goose**: Database migration tool for Go.
-   **http-proxy-middleware**: Node.js middleware for proxying requests from Express to the Go API.
-   **Aliyun DashScope / OpenAI**: AI chat providers integrated for AI functionalities.