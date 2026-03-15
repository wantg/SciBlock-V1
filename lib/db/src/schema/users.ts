import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /**
   * User role within the lab system.
   *
   * Authority: Drizzle schema is the single source of truth for this column.
   * History: previously added via goose migration 20260315001_add_users_role.sql,
   * which is now a frozen compatibility artifact.  All future changes to this
   * column MUST go through Drizzle generate + migrate only.
   *
   * Values: 'student' (default) | 'instructor'
   */
  role: text("role").notNull().default("student"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
