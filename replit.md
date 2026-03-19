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