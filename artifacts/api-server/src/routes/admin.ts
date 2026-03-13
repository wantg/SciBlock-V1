import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdminSecret(req: Parameters<Parameters<typeof router.use>[0]>[0], res: Parameters<Parameters<typeof router.use>[0]>[1], next: Parameters<Parameters<typeof router.use>[0]>[2]) {
  const secret = process.env["ADMIN_SECRET"];
  const provided = req.headers["x-admin-secret"];

  if (!secret) {
    res.status(500).json({ error: "server_error", message: "ADMIN_SECRET not configured." });
    return;
  }

  if (provided !== secret) {
    res.status(401).json({ error: "unauthorized", message: "Invalid admin secret." });
    return;
  }

  next();
}

router.post("/users", requireAdminSecret, async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: "bad_request", message: "email, password, and name are required." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "bad_request", message: "Password must be at least 6 characters." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ email: email.toLowerCase().trim(), passwordHash, name: name.trim() })
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name });

    res.status(201).json({ success: true, user });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "conflict", message: "A user with that email already exists." });
    } else {
      console.error("Admin create user error:", err);
      res.status(500).json({ error: "server_error", message: "An unexpected error occurred." });
    }
  }
});

export default router;
