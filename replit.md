# Overview

This project is a pnpm workspace monorepo utilizing TypeScript for a scientific research application. It comprises a React + Vite frontend and an Express backend, designed to facilitate scientific note-taking, experiment management, and AI-powered assistance. The core purpose is to streamline the scientific workflow, from experiment initiation to report generation, with a focus on user-friendly interfaces and robust data management.

Key capabilities include:
- User authentication and access control.
- Creation and management of "SciNotes" for experiments.
- A multi-step wizard for initializing new experiments.
- A 3-panel workbench for detailed experiment tracking, rich-text notes, and AI-powered report generation.
- Integration with external services for AI functionalities.
- Team member management: invite students, student card grid, per-student detail with 5 tabs (info/papers/thesis/records/reports).
- Messaging inbox: invitation, comment, and share-request notifications.
- Real-time clock widget with 12/24h toggle.
- Weekly report system: student side (`/personal/my-reports`) for creating/submitting structured weekly reports; instructor side (`/home/reports`) for reviewing all students' reports by week with status management and comment threads. Status flow: draft → submitted → under_review → needs_revision / reviewed.

The project aims to provide a comprehensive digital lab notebook solution, enhancing productivity and reproducibility in scientific research.

# User Preferences

I prefer iterative development with clear communication on significant changes. I like detailed explanations for complex features or architectural decisions. Please ask before making any major changes to the project structure or core functionalities.

# System Architecture

The project is structured as a pnpm monorepo with distinct `artifacts` (deployable applications) and `lib` (shared libraries) directories.

## Frontend (`artifacts/web`)

- **Framework**: React with Vite.
- **Routing**: Handled by React Router, including authenticated and public routes.
- **State Management**: Primarily uses React Context for global state (e.g., `SciNoteStoreContext`, `UserContext`) and local hooks for component-specific state (e.g., `useLogin`, `useWizardForm`).
- **UI Components**: Leverages `shadcn/ui` primitives and custom components.
- **Design Patterns**: Pages compose layout and feature components, abstracting raw fetch/state logic into hooks. API calls are encapsulated in `api/` modules.
- **Experiment Wizard**: A 6-step process for creating new experiments, featuring configurable field types (text, list, object) for structured data entry.
- **Workbench**: A 3-panel layout (Ontology, Editor, Utility) for in-depth experiment management. The Editor Panel includes rich-text notes (TipTap), module-specific sections, and an AI report generation flow. Report generation is triggered automatically upon module confirmation and allows for editing.

## Backend (`artifacts/api-server`)

- **Framework**: Express 5.
- **Authentication**: Handles user login and admin-only user creation with bcrypt password hashing.
- **Database Interaction**: Uses `@workspace/db` for Drizzle ORM operations.
- **API Design**: Routes are organized in `src/routes/` and leverage `@workspace/api-zod` for request/response validation.

## Shared Libraries (`lib/`)

- **`lib/db`**: Drizzle ORM layer for PostgreSQL, managing schema and database interactions.
- **`lib/api-spec`**: Contains the OpenAPI 3.1 specification (`openapi.yaml`) and Orval configuration for API client and schema generation.
- **`lib/api-zod`**: Generated Zod schemas from the OpenAPI spec for validation.
- **`lib/api-client-react`**: Generated React Query hooks for frontend API interaction.

## Core Technologies

- **Monorepo**: pnpm workspaces
- **Language**: TypeScript 5.9
- **Node.js**: Version 24
- **Package Manager**: pnpm
- **Database**: PostgreSQL with Drizzle ORM
- **API Validation**: Zod
- **API Codegen**: Orval (from OpenAPI spec)
- **Build Tools**: esbuild (backend), Vite (frontend)

## Development Workflow

- **Typechecking**: `tsc --build --emitDeclarationOnly` from the root ensures cross-package type resolution.
- **Project References**: `tsconfig.json` in each package uses project references for efficient incremental builds.

# External Dependencies

- **PostgreSQL**: Primary database for data persistence.
- **bcrypt**: Used for password hashing in authentication.
- **TipTap**: Rich-text editor integrated into the workbench for notes and report editing.
- **OpenAPI**: Specification for defining API endpoints, used for code generation.
- **Orval**: Tool for generating API clients and Zod schemas from the OpenAPI spec.
- **shadcn/ui**: UI component library used in the frontend.
- **React Query**: For data fetching and caching in the frontend.