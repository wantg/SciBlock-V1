# SciBlock — 迁移预演指南

从空白数据库出发，验证完整链路可用后，方可开始正式迁移。

本文档负责完整步骤（建库 → 迁移 → Seed → 启动 → 验证）。  
验证阶段由 `scripts/rehearsal-smoke-test.sh` 自动执行，无需人工逐条 curl。

---

## 一、预演目标

| 编号 | 验证结论 |
|------|---------|
| M1 | `pnpm migrate` 在空库上执行成功（exit 0），所有关键表均存在 |
| M2 | `seed-dev.sh` 幂等完成，两个预设账户均可登录 |
| M3 | Go API 和 Express API 正常启动，健康检查通过 |
| M4 | 认证链路互通：Go API 签发的 JWT，Express 和 Go API 均可验证 |
| M5 | 核心写路径正常：SciNote 创建、Experiment 创建、列表查询 |
| M6 | 认证边界正常：无 token 访问受保护路由返回 401 |
| M7 | AI 未配置时 `/api/ai/status` 返回 `available: false`，前端显示禁用态 |
| M8 | CORS 在 `CORS_ORIGINS` 未设置时宽松，设置后精确匹配 |

---

## 二、环境要求

### 工具版本（最低）

| 工具       | 最低  | 本项目测试版本 |
|------------|-------|--------------|
| Go         | 1.21  | 1.25.5       |
| Node.js    | 20    | 24.13.0      |
| pnpm       | 9     | 10.26.1      |
| PostgreSQL | 14    | 16           |
| psql       | 任意  | 客户端即可    |

### 必填环境变量

将下列变量写入 `.env.rehearsal`，每个终端 `source .env.rehearsal`：

```bash
# 共享 — 两个服务必须使用完全一致的值
export DATABASE_URL="postgresql://postgres:password@localhost:5432/sciblock_rehearsal"
export JWT_SECRET="$(openssl rand -hex 32)"   # 生成一次，全程固定不变

# Express API（终端 B）
export PORT=8080
export GO_API_URL="http://localhost:8082"
export ADMIN_SECRET="rehearsal-admin"
export AI_PROVIDER="qianwen"
# DASHSCOPE_API_KEY 故意不设，用于验证 AI 禁用态
export NODE_ENV="development"

# Go API（终端 A）
# export PORT=8082       ← 使用 Go API 默认值，或手动设置
export ENV="development"
export AUTO_MIGRATE=false  # 迁移已在步骤3单独执行
```

> **注意**：`JWT_SECRET` 必须在两个服务中完全一致。先执行 `export JWT_SECRET="..."` 保存到 shell 变量，再 source 进两个终端，不要分别生成。

---

## 三、预演步骤

### 步骤 0：创建空白数据库

```bash
# 若已存在则先删
psql "postgresql://postgres:password@localhost:5432" \
  -c "DROP DATABASE IF EXISTS sciblock_rehearsal;"
psql "postgresql://postgres:password@localhost:5432" \
  -c "CREATE DATABASE sciblock_rehearsal;"
```

> **新环境**：跳过 `scripts/db-baseline.sh`，直接执行步骤 1。  
> `db-baseline.sh` 仅适用于从旧 `push` 模式迁移的已有数据库，新建库上运行会静默跳过（幂等安全），但不必要。

### 步骤 1：安装依赖

```bash
pnpm install
```

### 步骤 2：执行所有迁移

```bash
source .env.rehearsal
pnpm migrate
```

**成功标准：**
- exit code = 0
- 无 `ERROR` 或 `FATAL` 输出
- 关键表存在（下方验证命令）

```bash
# 验证所有关键表
psql "$DATABASE_URL" -c "\dt" | grep -E \
  "users|students|papers|weekly_reports|report_comments|messages|scinotes|experiment_records|goose_db_version"
```

期望输出中包含以下 8 张业务表（另有 `drizzle.__drizzle_migrations` 和 `goose_db_version` 共 10 个）：

```
users            students         papers
weekly_reports   report_comments  messages
scinotes         experiment_records
```

### 步骤 3：Seed 演示数据

```bash
source .env.rehearsal
bash scripts/seed-dev.sh
```

**成功标准：**

```
Dev seed complete.

  Instructor : dev@sciblock.local  / DevPass1234
  Student    : demo@sciblock.com   / DemoPass1234
```

验证账户已写入：

```bash
psql "$DATABASE_URL" -c "SELECT email, role FROM users ORDER BY created_at;"
# 期望:
#  dev@sciblock.local  | instructor
#  demo@sciblock.com   | student
```

### 步骤 4：启动 Go API（终端 A）

```bash
source .env.rehearsal
cd artifacts/go-api
go run ./cmd/server/main.go
```

**期望启动日志：**

```
database connected
AUTO_MIGRATE not set: skipping migrations (run `make migrate` manually)
Go API server listening on :8082 (env: development)
```

快速健康检查：

```bash
curl -s http://localhost:8082/healthz
# 期望: {"status":"ok","service":"sciblock-go-api"}
```

### 步骤 5：启动 Express API（终端 B）

```bash
source .env.rehearsal
export PORT=8080
pnpm --filter @workspace/api-server run dev
```

**期望日志：**

```
Server listening on port 8080
```

### 步骤 6：（可选）启动前端（终端 C）

```bash
source .env.rehearsal
export PORT=5173
pnpm --filter @workspace/web run dev
```

前端主要用于验证 AI 禁用态 UI（M7）。其余 M1–M6、M8 均可通过 smoke test 脚本验证。

### 步骤 7：执行 Smoke Test

```bash
source .env.rehearsal
bash scripts/rehearsal-smoke-test.sh
```

所有测试 PASS 后，预演通过。

---

## 四、接口路径参考（当前真实代码）

Smoke test 内部使用的路径，基于 `artifacts/api-server/src/routes/` 和 `artifacts/go-api/internal/router/router.go` 确认：

| 功能 | 方法 | 路径（经 Express :8080） | 备注 |
|------|------|------------------------|------|
| 登录 | POST | `/api/auth/login` | 代理到 Go API |
| 当前用户 | GET | `/api/auth/me` | 代理到 Go API |
| SciNote 列表 | GET | `/api/scinotes` | 代理到 Go API |
| SciNote 创建 | POST | `/api/scinotes` | `{"title":"..."}` 为最小合法 payload |
| Experiment 列表 | GET | `/api/scinotes/:id/experiments` | 代理到 Go API |
| Experiment 创建 | POST | `/api/scinotes/:id/experiments` | 需 `title`、`experimentStatus`、`experimentCode` |
| Experiment 详情 | GET | `/api/experiments/:id` | 代理到 Go API |
| 团队成员列表 | GET | `/api/team/members` | Express 直接处理；instructor 可见 |
| 周报列表 | GET | `/api/reports` | Express；student→自己，instructor→全部或 `?studentId=` |
| 消息列表 | GET | `/api/messages` | Express 直接处理 |
| AI 状态 | GET | `/api/ai/status` | Express 直接处理；无需认证 |

> **已修正**：之前清单中的 `/api/team/students` → 实际为 `/api/team/members`；  
> `/api/reports/my` → 实际为 `/api/reports`（按 JWT role 自动路由）。

---

## 五、预演通过与失败标准

### ✅ 通过标准（可以开始正式迁移）

| 现象 |
|------|
| `pnpm migrate` exit 0，无 ERROR 输出 |
| `\dt` 查询包含所有 8 张业务表 |
| `seed-dev.sh` 输出 "Dev seed complete"，账户均可登录 |
| Smoke test 输出全部 PASS，最终 exit 0 |
| `/api/auth/me` 经 Express (:8080) 和 Go API (:8082) 直连均返回 200 |
| `/api/ai/status` 返回 `{"available":false}`（无 AI key 时） |

### ❌ 不能迁移（需先排查）

| 现象 | 可能原因 |
|------|---------|
| `pnpm migrate` 失败 | DATABASE_URL 错误；Postgres 未启动；旧数据存在约束冲突 → 确认 `pre-fk-cleanup.sql` 执行 |
| `\dt` 缺少表（如 `scinotes`、`experiment_records`） | goose 迁移未执行；Go API 与 Express 指向不同 DATABASE_URL |
| `/api/auth/me` 经 Express 返回 200 但经 Go API 直连返回 401 | JWT_SECRET 两个服务中值不一致 |
| SciNote 创建返回 502 | Go API 未启动；GO_API_URL 配置错误 |
| 受保护路由无 token 时返回 500 | requireAuth 中间件异常 |
| Smoke test 有任何 FAIL | 见 smoke test 输出的具体失败项 |
| CORS 精确模式下所有请求均被拒绝 | CORS_ORIGINS 中 origin 含多余空格或协议写错（http vs https） |

---

## 六、常见重置操作

### 重置并重新预演

```bash
psql "postgresql://postgres:password@localhost:5432" \
  -c "DROP DATABASE IF EXISTS sciblock_rehearsal; CREATE DATABASE sciblock_rehearsal;"
source .env.rehearsal
pnpm migrate
bash scripts/seed-dev.sh
```

### 重新 seed（不重建表）

Seed 脚本完全幂等，可安全重复执行：

```bash
source .env.rehearsal
bash scripts/seed-dev.sh
```

### 仅重跑验证

服务已在运行时，直接跑 smoke test：

```bash
source .env.rehearsal
bash scripts/rehearsal-smoke-test.sh
```
