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

# Feature Milestones

## 实验记录 ↔ 周报联动 — 第一阶段（已完成）

**完成时间**: 2026-03-19

### 数据层新增
- `weekly_report_experiment_links` 表：`(id, report_id → weekly_reports.id CASCADE, experiment_record_id, created_at)`，`UNIQUE(report_id, experiment_record_id)`
- `weekly_reports.links_last_saved_at TIMESTAMPTZ`：学生最后一次主动保存 links 的时间戳，用于区分"从未管理过"和"显式清空"两种语义

### API 新增
- `PUT /reports/:id/links`：全量替换关联实验记录，仅 draft/needs_revision 状态可用；调用时同步更新 `links_last_saved_at`；验证实验记录归属权
- `GET /reports/:id/links`：返回关联实验记录详情（title、sciNoteTitle、status、purposeInput、createdAt），学生本人与导师均可访问

### 学生端新增
- 位置 1 — 生成向导 Step 2：时间段内候选实验列表，默认全部未勾选，"全选/取消"快捷按钮，至少选 1 条才可继续；Step 3 在触发生成前先保存 links
- 位置 2 — ReportWorkPanel：常驻"关联实验记录"区块，draft/needs_revision 状态下显示"管理关联"按钮，弹出模态框可增删关联实验记录（候选来自 dateRangeStart–dateRangeEnd）

### 导师端新增
- ReportCard 展开后懒加载关联实验记录列表（无关联则不显示该区块）
- 点击任意一条实验记录行 → 右侧 Sheet 面板展开，展示实验标题、所属 SciNote、状态、创建日期、实验目的全文（真正的 read-only drill-down，非堆文字）

### AI 生成逻辑变化
- 优先级 1：若该周报 `weekly_report_experiment_links` 中有 links → 用 links 指定的实验
- 优先级 2（新规则）：若 `links_last_saved_at IS NOT NULL` 且 links 为空 → 返回空集，不注入日期范围素材（尊重学生的显式决策）
- 优先级 3（旧 fallback）：若 `links_last_saved_at IS NULL`（历史旧周报，从未经历链接管理流程）→ 按 dateRangeStart–dateRangeEnd 日期范围查询实验

---

## 实验记录 ↔ 周报联动 — 第二阶段候选优化项（待排期）

以下为候选项，**尚未实现**，供后续排期参考：

1. **AI 提示词针对关联实验深化**：当前 AI 只是把 links 实验的内容拼入 prompt，未来可加强结构化（如按实验目的/结果分段、标注实验序号、强调继承链关系）
2. **导师 drill-down 展示传承链信息**：当前 Sheet 面板只显示单条实验基本信息，可补充：父实验/子实验链路、确认状态、derived_from_record_id 指向
3. **实验记录反向引用：被哪些周报引用**：在实验工作台或实验卡片中增加"已被 N 份周报引用"角标，点击可查看引用的周报列表
4. **候选时间语义优化**：当前候选池按 `experiment_records.created_at` 过滤，语义上是"创建时间"而非"实验进行时间"；引入 `experiment_date` 或 `record_date` 字段作为更准确的候选过滤依据
5. **批量 links 预览**：生成向导 Step 3（确认页）展示所选实验的摘要快照（标题、目的），让学生在生成前再确认一遍
6. **links 修改历史**：记录 links 的增删操作日志，供导师查看学生是否在提交前反复修改关联实验记录