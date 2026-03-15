import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";

const app: Express = express();

app.use(cors());

// ---------------------------------------------------------------------------
// Go API proxy — forward auth + SciNote + experiment routes to the Go server.
// Must be registered BEFORE express.json() and before the Express router so
// the proxy intercepts raw requests (body stream intact) and so Express path
// stripping doesn't corrupt the forwarded URL.
// ---------------------------------------------------------------------------

const GO_API_URL = process.env.GO_API_URL ?? "http://localhost:8082";

// Paths that are handled by the Go API (prefix match).
const GO_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/scinotes",
  "/api/experiments",
];

const goProxy = createProxyMiddleware<Request, Response>({
  target: GO_API_URL,
  changeOrigin: true,
  // pathFilter runs against req.url BEFORE Express strips any prefix,
  // because we mount the proxy at the app root (not a sub-path).
  pathFilter: (pathname: string) =>
    GO_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")),
  on: {
    error: (_err: Error, _req: Request, res: Response) => {
      if (!res.headersSent) {
        res
          .status(502)
          .json({ error: "gateway_error", message: "Go API is unavailable" });
      }
    },
  },
});

// Mount at root so Express never strips any path segments before the proxy sees them.
app.use(goProxy);

// Standard body parsers and Express route handler (non-proxied paths only).
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
