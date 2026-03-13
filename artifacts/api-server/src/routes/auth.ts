import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MOCK_USERS = [
  { id: "1", email: "user@sciblock.com", password: "password123", name: "Demo User" },
  { id: "2", email: "admin@sciblock.com", password: "admin123", name: "Admin" },
];

router.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "bad_request", message: "Email and password are required." });
    return;
  }

  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password." });
    return;
  }

  res.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

export default router;
