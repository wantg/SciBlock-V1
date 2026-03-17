import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// 开发服务器默认端口，生产构建时不需要
const DEFAULT_PORT = 22333;
const rawPort = process.env.PORT ?? String(DEFAULT_PORT);
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH defaults to "/" so the server can start outside Replit without
// needing a platform-injected environment variable.
function normalizeBasePath(raw: string | undefined): string {
  if (!raw) return "/";

  const trimmed = raw.trim();
  if (!trimmed) return "/";

  // Guard against accidental filesystem paths from host env vars on Windows.
  // Vite base must be a URL pathname (e.g. "/" or "/app/").
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return "/";
  }

  let normalized = trimmed.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (!normalized.endsWith("/")) normalized += "/";

  return normalized;
}

const basePath = normalizeBasePath(process.env.BASE_PATH);

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // 开发时代理 API 请求到本地 Docker 中的 api-server
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
