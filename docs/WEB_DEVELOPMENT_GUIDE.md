# SciBlock Web 开发指导文档

> 本文档为 SciBlock 项目的前端/Web 开发提供全面的架构说明、配置指南和开发规范。

## 📑 目录

1. [项目架构概览](#1-项目架构概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [开发环境配置](#4-开发环境配置)
5. [Vite 配置详解](#5-vite-配置详解)
6. [Nginx 代理配置](#6-nginx-代理配置)
7. [Docker 配置](#7-docker-配置)
8. [API 客户端](#8-api-客户端)
9. [权限管理系统](#9-权限管理系统)
10. [样式系统](#10-样式系统)
11. [路由与页面](#11-路由与页面)
12. [构建与部署](#12-构建与部署)
13. [常见问题与解决方案](#13-常见问题与解决方案)

---

## 1. 项目架构概览

SciBlock 采用**微前端 + 多服务后端**架构，Web 前端作为独立的 artifacts 存在：

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                          │
│                    ┌─────────────────┐                         │
│                    │   Web Frontend  │  React + Vite            │
│                    │  (artifacts/web)│  Port: 22333             │
│                    └────────┬────────┘                         │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────┼───────────────────────────────────┐
│                      Nginx  │  反向代理 (Port: 80)              │
│  ┌──────────────────────────┼───────────────────────────────┐  │
│  │  /        → 前端静态文件  │                                │  │
│  │  /api/    → Express API  │  Port: 8080                    │  │
│  │  (内部代理)              → Go API  Port: 8082             │  │
│  └──────────────────────────┴───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Express API  │    │    Go API     │    │  PostgreSQL   │
│   Port: 8080  │◄──►│   Port: 8082  │    │   Port: 5432  │
│  (Node.js)    │    │    (Golang)   │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                                           ▲
        └───────────────────────────────────────────┘
                    Drizzle ORM / pgx
```

### 1.1 服务职责划分

| 服务 | 技术 | 端口 | 职责 |
|------|------|------|------|
| Web Frontend | React + Vite | 22333 | 用户界面、单页应用 |
| Express API | Node.js + Express | 8080 | 业务逻辑、AI 集成、消息、报告 |
| Go API | Golang + Gin | 8082 | 认证、科研笔记(scinotes)、实验记录 |
| PostgreSQL | Postgres 16 | 5432 | 主数据库 |
| Redis | Redis 7 | 6379 | 缓存、会话 |

---

## 2. 技术栈

### 2.1 核心技术

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React | 19.1.0 | UI 框架 |
| 构建工具 | Vite | 7.3.0 | 开发服务器 + 打包 |
| 样式 | Tailwind CSS | 4.1.14 | 原子化 CSS |
| UI 组件 | Radix UI | 最新版 | Headless UI 组件 |
| 组件库 | shadcn/ui | New York | 基于 Radix 的组件 |
| 路由 | wouter | 3.3.5 | 轻量级路由 |
| 状态管理 | TanStack Query | 5.90.21 | 服务端状态管理 |
| 表单 | React Hook Form | 7.55.0 | 表单处理 |
| 校验 | Zod | 3.25.76 | 运行时类型校验 |
| 动画 | Framer Motion | 12.23.24 | 页面动画 |
| 图标 | Lucide React | 0.545.0 | 图标库 |

### 2.2 Monorepo 工具

- **包管理器**: pnpm (workspace)
- **工作区目录**:
  - `artifacts/*` - 可部署的应用
  - `lib/*` - 共享库
  - `scripts` - 构建脚本

---

## 3. 项目结构

```
sciblock/
├── artifacts/
│   ├── web/                    # Web 前端应用
│   │   ├── src/
│   │   │   ├── api/            # API 客户端模块
│   │   │   ├── components/     # React 组件
│   │   │   │   ├── layout/     # 布局组件
│   │   │   │   ├── reports/    # 报告相关组件
│   │   │   │   ├── team/       # 团队相关组件
│   │   │   │   └── ui/         # UI 组件库 (shadcn)
│   │   │   ├── contexts/       # React Context
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── lib/            # 工具函数
│   │   │   ├── pages/          # 页面组件
│   │   │   │   ├── home/       # 首页
│   │   │   │   ├── login/      # 登录
│   │   │   │   ├── messages/   # 消息
│   │   │   │   ├── personal/   # 个人中心
│   │   │   │   └── team/       # 团队管理
│   │   │   ├── types/          # TypeScript 类型
│   │   │   ├── App.tsx         # 根组件
│   │   │   ├── index.css       # 全局样式
│   │   │   └── main.tsx        # 入口文件
│   │   ├── public/             # 静态资源
│   │   ├── index.html          # HTML 模板
│   │   ├── vite.config.ts      # Vite 配置
│   │   ├── tsconfig.json       # TypeScript 配置
│   │   ├── nginx.conf          # Nginx 配置 (Docker)
│   │   └── Dockerfile.web      # Docker 构建文件
│   ├── api-server/             # Express API
│   └── go-api/                 # Go API
├── lib/
│   ├── api-client-react/       # React Query API 客户端
│   ├── api-spec/               # OpenAPI 规范
│   ├── api-zod/                # Zod 类型定义
│   └── db/                     # Drizzle ORM 数据库层
├── deploy/                     # 部署配置
│   ├── nginx.conf.example      # Nginx 配置模板
│   └── nginx.docker.conf       # Docker Nginx 配置
├── docker-compose.yml          # Docker Compose 编排
├── Dockerfile.migration        # 数据库迁移镜像
├── pnpm-workspace.yaml         # pnpm 工作区配置
├── tsconfig.base.json          # 基础 TypeScript 配置
└── docs/
    └── WEB_DEVELOPMENT_GUIDE.md # 本文档
```

### 3.1 Web 应用目录详解

```
artifacts/web/src/
├── api/                        # API 客户端
│   ├── client.ts               # 核心 HTTP 客户端 (apiFetch)
│   ├── auth.ts                 # 认证相关 API
│   ├── ai.ts                   # AI 服务 API
│   ├── aiChat.ts               # AI 对话 API
│   ├── scinotes.ts             # 科研笔记 API
│   ├── experiments.ts          # 实验记录 API
│   ├── messages.ts             # 消息 API
│   ├── team.ts                 # 团队 API
│   ├── users.ts                # 用户 API
│   ├── report.ts               # 报告 API
│   ├── weeklyReport.ts         # 周报 API
│   └── calendarRecords.ts      # 日历记录 API
│
├── components/
│   ├── layout/                 # 布局组件
│   │   ├── AppLayout.tsx       # 应用布局
│   │   ├── AuthenticatedLayout.tsx  # 认证后布局
│   │   ├── TopBar.tsx          # 顶部导航
│   │   └── IdentityBadge.tsx   # 用户身份标识
│   │
│   ├── ui/                     # shadcn/ui 组件库
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   └── ... (50+ 组件)
│   │
│   ├── reports/                # 报告组件
│   │   ├── CommentThread.tsx
│   │   ├── ReportContentForm.tsx
│   │   ├── ReportContentView.tsx
│   │   └── ReportStatusTag.tsx
│   │
│   └── team/                   # 团队组件
│       ├── AttrPill.tsx
│       ├── FieldPill.tsx
│       ├── PaperTypeTag.tsx
│       ├── SectionHeading.tsx
│       └── StudentStatusTag.tsx
│
├── contexts/
│   └── UserContext.tsx         # 用户状态上下文
│
├── hooks/                      # 自定义 Hooks
│
├── lib/
│   └── utils.ts                # 工具函数 (cn, etc.)
│
└── pages/                      # 页面路由
    ├── login/                  # 登录/注册
    ├── home/                   # 首页/仪表盘
    ├── messages/               # 消息中心
    ├── personal/               # 个人中心
    │   ├── NewExperimentPage.tsx
    │   ├── ExperimentDetailPage.tsx
    │   ├── ExperimentWorkbenchPage.tsx
    │   ├── SciNoteDetailPage.tsx
    │   ├── MyReportsPage.tsx
    │   └── trash/
    ├── team/                   # 团队管理
    │   ├── MembersPage.tsx
    │   └── reports/
    └── RequestAccessPage.tsx   # 申请访问
```

---

## 4. 开发环境配置

### 4.1 环境变量

Web 应用使用以下环境变量：

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | ✅ | 22333 | Vite 开发服务器端口 |
| `BASE_PATH` | ❌ | `/` | 应用基础路径 |
| `NODE_ENV` | ❌ | `development` | 运行环境 |

#### 配置文件

- **`.env.web.example`** - Web 环境变量示例
- **`.env.example`** - 根环境变量示例
- **`.env.docker.example`** - Docker 环境变量示例

### 4.2 启动开发服务器

```bash
# 方式 1: 使用根目录脚本（推荐）
pnpm dev:web

# 方式 2: 直接启动
PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev

# 方式 3: 使用 shell 脚本
sh scripts/dev.sh web
```

### 4.3 本地开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
cp artifacts/web/.env.web.example artifacts/web/.env

# 3. 启动数据库（Docker）
docker-compose up -d postgres redis

# 4. 运行数据库迁移
pnpm migrate

# 5. 启动所有服务
pnpm dev

# 或分别启动
pnpm dev:api   # Express API
pnpm dev:go    # Go API
pnpm dev:web   # Web 前端
```

---

## 5. Vite 配置详解

### 5.1 配置文件: `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required...");
}
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),                    // React 支持
    tailwindcss(),              // Tailwind CSS 支持
    runtimeErrorOverlay(),      // 运行时错误弹窗
    // Replit 专用插件（仅在 Replit 环境加载）
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [cartographer(), devBanner()]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],  // 避免 React 多实例
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",            // 允许外部访问
    allowedHosts: true,         // 允许所有 host
    fs: {
      strict: true,
      deny: ["**/.*"],          // 禁止访问隐藏文件
    },
    // 开发时代理 API 请求
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
```

### 5.2 配置要点说明

| 配置项 | 说明 |
|--------|------|
| `base` | 应用部署的基础路径，影响资源加载和路由 |
| `resolve.alias` | `@/` 指向 `src/`，`@assets/` 指向 `attached_assets/` |
| `server.proxy` | 开发时将 `/api/*` 代理到 `localhost:8080` |
| `build.outDir` | 构建输出到 `dist/public/` |
| `server.host` | `0.0.0.0` 允许 Docker/局域网访问 |

---

## 6. Nginx 代理配置

### 6.1 开发环境 (Docker)

配置文件: `deploy/nginx.docker.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # 上游服务定义
    upstream express {
        server api-server:8080;
    }

    upstream web {
        server web:22333;
    }

    server {
        listen 80;
        server_name localhost;

        # 前端静态文件
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API 代理到 Express
        location /api/ {
            proxy_pass http://express;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 超时设置
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 健康检查
        location /healthz {
            return 200 "ok";
            add_header Content-Type text/plain;
        }
    }
}
```

### 6.2 生产环境

配置文件: `deploy/nginx.conf.example`

```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name your-domain.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name your-domain.example.com;

    # TLS 证书
    ssl_certificate     /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

    # 前端静态文件
    root  /opt/sciblock/app/artifacts/web/dist/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA 路由支持
    }

    # 静态资源缓存
    location ~* \.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
        expires     30d;
        add_header  Cache-Control "public, immutable";
        try_files   $uri =404;
    }

    # index.html 禁止缓存
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # API 代理
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 安全响应头
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
}
```

### 6.3 Nginx 配置要点

| 配置 | 说明 |
|------|------|
| `try_files $uri $uri/ /index.html` | 支持 React Router 的浏览器端路由 |
| `proxy_pass` | 将 API 请求转发到后端服务 |
| `X-Forwarded-*` headers | 传递真实客户端信息 |
| 静态资源缓存 | JS/CSS 文件缓存 30 天 |
| index.html 不缓存 | 确保前端更新立即生效 |

---

## 7. Docker 配置

### 7.1 Web 应用 Dockerfile

文件: `artifacts/web/Dockerfile.web`

```dockerfile
# 构建阶段
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 防止 rollup 原生模块错误
ENV ROLLUP_NATIVE=0

# 复制工作区配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY artifacts/web ./artifacts/web
COPY lib ./lib

# 进入 web 目录构建
WORKDIR /app/artifacts/web
RUN pnpm install
ENV ROLLUP_DISABLE_NATIVE=1
ENV PORT=3000
RUN echo '{"compilerOptions": {}}' > ../../tsconfig.base.json
RUN pnpm run build

# 运行时阶段 - 使用 nginx
FROM nginx:alpine

# 复制 nginx 配置
COPY artifacts/web/nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/artifacts/web/dist/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 7.2 docker-compose.yml Web 服务配置

```yaml
services:
  web:
    build:
      context: .
      dockerfile: artifacts/web/Dockerfile.web
    restart: unless-stopped
    depends_on:
      api-server:
        condition: service_healthy
    ports:
      - "80:80"
    networks:
      - sciblock-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:80/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 7.3 Docker 开发流程

```bash
# 1. 复制环境变量
cp .env.docker.example .env.docker

# 2. 启动数据库
docker-compose --env-file .env.docker up -d postgres redis

# 3. 运行迁移
docker-compose --env-file .env.docker run --rm migration

# 4. 启动所有服务
docker-compose --env-file .env.docker up -d go-api api-server web

# 5. 查看日志
docker-compose logs -f web
```

---

## 8. API 客户端

### 8.1 核心 HTTP 客户端

文件: `src/api/client.ts`

```typescript
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TOKEN_KEY = "sciblock:token";
const USER_KEY = "sciblock:currentUser";
const LOGIN_PATH = `${BASE}/login`;

// Token 存储管理
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

// API 错误类
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// 核心请求函数
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getStoredToken();

  const authHeaders: Record<string, string> = {};
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new ApiError(
      res.status,
      body.message ?? "Request failed",
      body.error,
    );

    // 401 自动跳转登录
    if (res.status === 401 && !window.location.pathname.endsWith("/login")) {
      clearSession();
      window.location.assign(LOGIN_PATH);
    }

    throw err;
  }

  return res.json() as Promise<T>;
}
```

### 8.2 API 模块示例

文件: `src/api/auth.ts`

```typescript
import { apiFetch } from "./client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: "student" | "instructor" | "admin";
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
```

### 8.3 使用 TanStack Query

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { login, getCurrentUser } from "@/api/auth";

// 获取当前用户
export function useCurrentUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });
}

// 登录 mutation
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setStoredToken(data.token);
      queryClient.setQueryData(["user", "me"], data.user);
    },
  });
}
```

---

## 9. 权限管理系统

### 9.1 概述

项目采用集中式权限管理系统，所有权限判断统一在 `@/lib/permissions` 中管理。

**设计原则：**
- 权限与角色解耦 - 不直接判断 `role`，而是判断权限点
- 策略集中管理 - 所有权限逻辑在 `policies.ts` 中维护
- 分层设计 - 导航权限、页面权限、功能权限、数据权限
- 易于扩展 - 新增权限只需添加类型和策略

### 9.2 文件结构

```
src/
├── types/permissions.ts          # 权限类型定义
├── lib/permissions/
│   ├── index.ts                  # 统一导出
│   ├── policies.ts               # 策略集中管理（唯一修改点）
│   └── usePermissions.ts         # React Hooks
└── config/navigation.ts          # 导航权限配置
```

### 9.3 使用方式

#### 1. 全局权限（导航、通用功能）

```tsx
import { useGlobalPermissions } from "@/lib/permissions";

function MembersPage() {
  const { canInviteMember, canSeeTeamReportsNav } = useGlobalPermissions();
  
  return (
    <div>
      {canInviteMember && <InviteButton />}
    </div>
  );
}
```

#### 2. 学生详情页权限

```tsx
import { useStudentPermissions } from "@/lib/permissions";

function MemberDetailPage({ student }) {
  const perms = useStudentPermissions(student.userId);
  
  return (
    <>
      <BasicInfoCard canEdit={perms.canEditProfile} />
      <PapersCard 
        canAdd={perms.canAddPaper} 
        canEdit={perms.canEditPaper}
        canDelete={perms.canDeletePaper}
      />
      <WeeklyReportsCard canAdd={perms.canAddReport} />
    </>
  );
}
```

#### 3. 通用权限检查

```tsx
import { useHasPermission } from "@/lib/permissions";

function MyComponent({ student }) {
  const canEdit = useHasPermission('team.profile', 'edit', studentUserId);
  return <button disabled={!canEdit}>编辑</button>;
}
```

### 9.4 权限策略

策略定义在 `src/lib/permissions/policies.ts` 中：

```typescript
// 学生基本信息
'session.profile': {
  view: canViewDefault,      // 所有人可查看
  edit: ownerOrInstructor,   // 本人或导师可编辑
  manage: instructorOnly,    // 仅导师可管理
},

// 学生状态
'session.status': {
  view: canViewDefault,
  edit: instructorOnly,      // 仅导师可修改状态
},

// 论文
'session.papers': {
  view: canViewDefault,
  create: ownerOrInstructor,
  edit: ownerOrInstructor,
  delete: ownerOrInstructor,
},

// 导航
'nav.team_reports': {
  view: instructorOnly,      // 仅导师可见团队周报导航
},
```

### 9.5 预定义策略

| 策略 | 说明 | 使用场景 |
|------|------|----------|
| `instructorOnly` | 仅导师/管理员 | 邀请成员、修改状态 |
| `studentOnly` | 仅学生 | 学生专属功能 |
| `ownerOnly` | 仅资源所有者 | 个人设置 |
| `ownerOrInstructor` | 本人或导师 | 编辑基本信息、论文 |
| `canViewDefault` | 所有已登录用户 | 查看团队成员 |
| `allowAll` | 任何人（包括未登录） | 公开页面 |

### 9.6 导航权限配置

在 `src/config/navigation.ts` 中配置导航权限：

```typescript
{
  label: "周报管理",
  href: "/home/reports",
  Icon: ClipboardList,
  // 使用权限系统
  permission: { resource: 'nav.team_reports', action: 'view' },
}
```

### 9.7 添加新权限

1. **添加资源类型**（`types/permissions.ts`）：

```typescript
export type ExperimentResource =
  | 'experiment.view'
  | 'experiment.create'
  | 'experiment.edit';
```

2. **添加策略**（`lib/permissions/policies.ts`）：

```typescript
'experiment.edit': {
  view: canViewDefault,
  edit: ownerOrInstructor,
},
```

3. **使用权限**：

```tsx
const canEdit = useHasPermission('experiment.edit', 'edit', ownerId);
```

---

## 10. 样式系统

### 9.1 Tailwind CSS v4 配置

文件: `src/index.css` (Tailwind v4 使用 CSS 配置)

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-border: hsl(var(--border));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  /* ... 更多颜色变量 */
  
  --font-sans: var(--app-font-sans);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

/* 亮色模式 */
:root {
  --background: 0 0% 97%;
  --foreground: 220 13% 13%;
  --primary: 220 13% 13%;
  --primary-foreground: 0 0% 100%;
  /* ... */
}

/* 暗色模式 */
.dark {
  --background: 220 13% 8%;
  --foreground: 0 0% 95%;
  --primary: 0 0% 95%;
  --primary-foreground: 220 13% 8%;
  /* ... */
}
```

### 9.2 shadcn/ui 组件

项目使用 shadcn/ui 的 New York 风格组件。组件位于 `src/components/ui/`。

添加新组件：

```bash
# 进入 web 目录
cd artifacts/web

# 使用 shadcn CLI 添加组件
npx shadcn add button
npx shadcn add card
npx shadcn add dialog
```

### 9.3 常用样式模式

```tsx
// 布局
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-6">
<div className="container mx-auto px-4 py-8">

// 间距
<div className="space-y-4">
<div className="p-4 m-2">

// 颜色
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// 边框和圆角
<div className="border border-border rounded-lg shadow-sm">

// 响应式
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## 11. 路由与页面

### 10.1 路由配置

文件: `src/App.tsx`

```tsx
import { Switch, Route, Router as WouterRouter } from "wouter";

function AuthenticatedRouter() {
  return (
    <AuthenticatedLayout>
      <Switch>
        {/* 首页 */}
        <Route path="/home" component={HomePage} />
        
        {/* 消息 */}
        <Route path="/home/messages" component={MessagesPage} />
        
        {/* 团队成员 */}
        <Route path="/home/members" component={MembersPage} />
        <Route path="/home/members/:id" component={MemberDetailPage} />
        
        {/* 报告 */}
        <Route path="/home/reports" component={TeamReportsPage} />
        <Route path="/personal/my-reports" component={MyReportsPage} />
        
        {/* 实验 */}
        <Route path="/personal/new-experiment" component={NewExperimentPage} />
        <Route path="/personal/experiment/:id" component={ExperimentDetailPage} />
        <Route path="/personal/experiment/:id/workbench" component={ExperimentWorkbenchPage} />
        <Route path="/personal/reinitialize/:id" component={ReinitializeExperimentPage} />
        
        {/* 回收站 */}
        <Route path="/personal/trash" component={TrashPage} />
        
        {/* 默认重定向 */}
        <Route path="/">
          {() => {
            window.location.replace(`${BASE}/login`);
            return null;
          }}
        </Route>
        
        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* 公开路由 */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={RequestAccessPage} />
      
      {/* 认证后路由 */}
      <Route>
        <AuthenticatedRouter />
      </Route>
    </Switch>
  );
}
```

### 10.2 路由参数获取

```tsx
import { useRoute } from "wouter";

function MemberDetailPage() {
  // 匹配 /home/members/:id
  const [match, params] = useRoute("/home/members/:id");
  
  if (!match) return null;
  
  const { id } = params;
  
  return <div>Member ID: {id}</div>;
}
```

### 10.3 编程式导航

```tsx
import { useLocation } from "wouter";

function MyComponent() {
  const [, navigate] = useLocation();
  
  const handleClick = () => {
    navigate("/home/messages");
  };
  
  return <button onClick={handleClick}>Go to Messages</button>;
}
```

---

## 12. 构建与部署

### 11.1 构建命令

```bash
# 构建所有服务
pnpm run build

# 仅构建 Web
pnpm run build:web
# 或
sh scripts/build.sh web
```

### 11.2 构建输出

| 服务 | 输出目录 | 入口文件 |
|------|----------|----------|
| Web | `artifacts/web/dist/public/` | `index.html` + 静态资源 |
| Express | `artifacts/api-server/dist/` | `index.cjs` |
| Go | `artifacts/go-api/bin/` | `server` |

### 11.3 生产部署流程

```bash
# 1. 构建
pnpm run build

# 2. 部署静态文件到 Nginx
cp -r artifacts/web/dist/public/* /var/www/sciblock/

# 3. 重启 Nginx
sudo systemctl reload nginx

# 4. 部署 API 服务
# Express
pm2 restart api-server
# Go
systemctl restart sciblock-go
```

### 11.4 Docker 生产部署

```bash
# 构建并推送镜像
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# 在服务器上拉取并运行
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 13. 常见问题与解决方案

### 12.1 端口冲突

**问题**: `EADDRINUSE: Port 22333 is already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :22333
# 或 Windows
netstat -ano | findstr :22333

# 修改环境变量使用其他端口
PORT=30000 pnpm dev:web
```

### 12.2 API 代理失败

**问题**: 开发时 `/api/*` 请求 404

**解决**:
1. 检查 Express API 是否在 `8080` 端口运行
2. 检查 `vite.config.ts` 中的 proxy 配置
3. 检查请求路径是否正确（以 `/api` 开头）

### 12.3 Docker 构建失败 (Rollup 原生模块)

**问题**: `Error: Dynamic require of ".../rollup@..." is not supported`

**解决**:
已在 `Dockerfile.web` 中设置：
```dockerfile
ENV ROLLUP_NATIVE=0
ENV ROLLUP_DISABLE_NATIVE=1
```

### 12.4 TypeScript 类型错误

**问题**: `Cannot find module '@workspace/xxx'`

**解决**:
```bash
# 重新安装依赖
pnpm install

# 检查 workspace 配置
pnpm --filter @workspace/web typecheck
```

### 12.5 环境变量未生效

**问题**: `PORT environment variable is required`

**解决**:
1. 检查 `.env` 文件是否存在
2. 检查变量名是否正确
3. 确保在项目根目录或 artifacts/web 目录下有正确的 `.env` 文件
4. Vite 只暴露 `VITE_` 前缀的变量给浏览器代码

### 12.6 路由刷新 404

**问题**: 刷新页面时出现 404

**解决**:
确保 Nginx 配置了 `try_files`:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 12.7 样式不生效

**问题**: Tailwind 样式丢失

**解决**:
1. 检查 `index.css` 中是否正确导入 Tailwind
2. 检查 `vite.config.ts` 中是否正确配置 Tailwind 插件
3. 检查 className 拼写是否正确

---

## 附录

### A. 常用命令速查

```bash
# 开发
pnpm dev              # 启动所有服务
pnpm dev:web          # 仅启动 Web
pnpm dev:api          # 仅启动 Express
pnpm dev:go           # 仅启动 Go

# 构建
pnpm build            # 构建所有
pnpm build:web        # 仅构建 Web

# 数据库
pnpm migrate          # 运行迁移
pnpm db:generate      # 生成 Drizzle 迁移

# 类型检查
pnpm typecheck        # 所有项目
pnpm typecheck:libs   # 仅库

# Docker
docker-compose up -d              # 启动所有
docker-compose up -d web          # 仅启动 Web
docker-compose logs -f web        # 查看 Web 日志
docker-compose down -v            # 停止并清理
```

### B. 项目依赖关系

```
@workspace/web
├── @workspace/api-client-react (workspace)
├── @tanstack/react-query
├── react 19
├── tailwindcss 4
└── ...

@workspace/api-client-react
├── @tanstack/react-query
└── react (peer)

@workspace/api-server
├── @workspace/db (workspace)
├── @workspace/api-zod (workspace)
├── express 5
└── ...
```

### C. 参考资料

- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [TanStack Query 文档](https://tanstack.com/query)
- [wouter 文档](https://github.com/molefrog/wouter)

---

**文档版本**: 1.0  
**最后更新**: 2026-03-17  
**作者**: SciBlock Team
