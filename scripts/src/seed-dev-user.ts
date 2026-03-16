/**
 * scripts/src/seed-dev-user.ts — Create / reset the dev instructor account.
 *
 * Equivalent to scripts/seed-dev-user.sh but uses Drizzle instead of psql.
 *
 * Creates:
 *   email:    dev@sciblock.local
 *   password: DevPass1234
 *   name:     Dev User
 *   role:     instructor
 *
 * Usage: pnpm --filter @workspace/scripts tsx ./src/seed-dev-user.ts
 */

import bcrypt from "bcryptjs";
import { pool, db, usersTable } from "@workspace/db";

const DEV_USER = {
    email: "dev@sciblock.local",
    password: "DevPass1234",
    name: "Dev User",
    role: "instructor",
} as const;

async function main() {
    console.log("[seed] Hashing password with bcrypt (cost=12)...");
    const passwordHash = await bcrypt.hash(DEV_USER.password, 12);

    console.log(`[seed] Upserting user: ${DEV_USER.email}...`);
    const [user] = await db
        .insert(usersTable)
        .values({
            email: DEV_USER.email,
            passwordHash,
            name: DEV_USER.name,
            role: DEV_USER.role,
        })
        .onConflictDoUpdate({
            target: usersTable.email,
            set: {
                passwordHash,
                name: DEV_USER.name,
                role: DEV_USER.role,
            },
        })
        .returning({ id: usersTable.id });

    console.log(`[seed] Done — user id: ${user.id}`);
    await pool.end();
}

main().catch((err) => {
    console.error("[seed] ERROR:", err);
    process.exit(1);
});
