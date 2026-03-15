import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  /**
   * Migration output directory.
   * - `drizzle-kit generate` writes SQL files here.
   * - `drizzle-kit migrate` reads and applies files from here.
   * Must be committed to version control — this is the schema change history.
   */
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
