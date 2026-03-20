import { defineConfig } from "drizzle-kit";

// ---------------------------------------------------------------------------
// Connection string resolution
//
// EXTERNAL_DATABASE_URL takes priority over DATABASE_URL.
// This mirrors the runtime resolution in lib/db/src/index.ts so that
// `drizzle-kit generate` and `drizzle-kit migrate` always target the same
// database instance as the running API server.
//
//   Set EXTERNAL_DATABASE_URL to use an external/self-managed Postgres.
//   Unset it to fall back to the Replit-managed internal database.
// ---------------------------------------------------------------------------
const dbUrl =
  process.env.EXTERNAL_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "Neither EXTERNAL_DATABASE_URL nor DATABASE_URL is set. " +
    "Provision a database or set EXTERNAL_DATABASE_URL.",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  /**
   * Migration output directory.
   * - `drizzle-kit generate` writes SQL files here.
   * - `drizzle-kit migrate` reads and applies files from here.
   * Must be committed to version control — this is the schema change history.
   *
   * Relative path from lib/db/ (where drizzle-kit is invoked).
   */
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
