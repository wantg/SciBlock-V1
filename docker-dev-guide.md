# SciBlock 本地 Docker 开发环境指南

本文档介绍如何使用 Docker Compose 在本地运行完整的 SciBlock 项目。所有服务（数据库、Redis、Go API、Express API、前端、Nginx）都将容器化，实现一键启动。

## 前提条件

- Docker 和 Docker Compose 已安装（Docker Desktop 或 Docker Engine + Compose Plugin）
- 本地 Git 仓库（已克隆 SciBlock 项目）
- 至少 4GB 内存（推荐 8GB）

## 项目结构

```
sciblock/
├── docker-compose.yml          # 主编排文件
├── Dockerfile.migration        # 数据库迁移镜像
├── artifacts/go-api/Dockerfile.go-api
├── artifacts/api-server/Dockerfile.api-server
├── artifacts/web/Dockerfile.web
├── deploy/nginx.docker.conf    # Nginx 配置
├── .env.docker.example         # 环境变量示例
└── docker-dev-guide.md         # 本文档
```

## 快速开始

### 1. 复制环境变量文件

```bash
cp .env.docker.example .env.docker
```

根据需要编辑 `.env.docker`（至少设置 `JWT_SECRET` 和 `ADMIN_SECRET`）。

### 2. 构建并启动所有服务（含数据初始化）

**首次启动**或**数据库为空**时，需要先运行迁移和种子数据：

```bash
# 第 1 步：启动数据库
docker-compose --env-file .env.docker up -d postgres redis

# 第 2 步：运行迁移和种子数据（创建表结构 + 初始化测试账户）
docker-compose --env-file .env.docker run --rm migration

# 第 3 步：启动其他服务
docker-compose --env-file .env.docker up -d go-api api-server web nginx
```

**非首次启动**（数据库已有数据）：

```bash
docker-compose --env-file .env.docker up -d
```

该命令将：

- 构建 Go API、Express API、前端和迁移服务的 Docker 镜像
- 启动 PostgreSQL、Redis 数据库
- 启动 Go API、Express API、前端和 Nginx 反向代理

> **注意**：`migration` 服务使用 Docker profile，不会自动启动。首次启动时必须手动运行以初始化数据库表结构和测试账户。

### 3. 查看服务状态

```bash
docker-compose ps
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f go-api
docker-compose logs -f api-server
docker-compose logs -f web
docker-compose logs -f nginx
```

### 5. 停止服务

```bash
docker-compose down
```

如需删除数据卷（清空数据库），添加 `-v` 参数：

```bash
docker-compose down -v
```

## 服务详情

| 服务 | 容器内端口 | 主机映射端口 | 说明 |
|------|------------|--------------|------|
| postgres | 5432 | 5432 | PostgreSQL 数据库 |
| redis | 6379 | 6379 | Redis 缓存 |
| go-api | 8082 | 8082 | Go API 服务（健康检查：http://localhost:8082/healthz） |
| api-server | 8080 | 8080 | Express API 服务（健康检查：http://localhost:8080/api/healthz） |
| web | 22333 | 22333 | 前端静态文件（通过 serve 提供） |
| nginx | 80 | 80 | 反向代理，将 / 路由到 web，/api 路由到 api-server |
| migration | - | - | 数据库迁移服务（仅在首次启动时运行） |

## 环境变量

所有环境变量通过 `.env.docker` 文件传递。关键变量如下：

### 共享变量
- `DATABASE_URL=postgresql://sciblock:sciblock_password@postgres:5432/sciblock`（由 docker-compose 自动设置，无需修改）
- `JWT_SECRET`：必须设置，用于 JWT 签名（建议使用 `openssl rand -hex 32` 生成）
- `ADMIN_SECRET`：Express API 的管理员密钥（建议使用 `openssl rand -hex 16` 生成）
- `CORS_ORIGINS`：允许的 CORS 来源，默认 `http://localhost:80`

### Go API 专用
- `PORT=8082`
- `ENV=development`
- `AUTO_MIGRATE=true`（开发环境下自动运行数据库迁移）
- `JWT_EXPIRY_HOURS=168`
- `BCRYPT_COST=12`

### Express API 专用
- `PORT=8080`
- `NODE_ENV=development`
- `GO_API_URL=http://go-api:8082`
- `AI_PROVIDER=qianwen`（可选）
- `DASHSCOPE_API_KEY`、`OPENAI_API_KEY`（可选）

### 前端专用
- `PORT=22333`
- `BASE_PATH=/`
- `VITE_API_BASE_URL`（留空，使用相对路径）

### 示例 `.env.docker` 文件

```env
# 安全密钥
JWT_SECRET=your-jwt-secret-generated-by-openssl-rand-hex-32
ADMIN_SECRET=your-admin-secret-generated-by-openssl-rand-hex-16

# 环境
ENV=development
NODE_ENV=development

# 可选 AI 配置
AI_PROVIDER=qianwen
DASHSCOPE_API_KEY=
OPENAI_API_KEY=

# CORS
CORS_ORIGINS=http://localhost:80
```

## 数据库迁移

默认情况下，Go API 服务启动时会自动运行 Goose 迁移（`AUTO_MIGRATE=true`）。Express 相关的 Drizzle 迁移则通过独立的 `migration` 服务执行。

首次启动时，`migration` 服务将在数据库就绪后自动运行 `pnpm migrate`（包含 Drizzle 和 Goose 迁移）。后续启动可跳过迁移（因为数据已存在）。

如需手动运行迁移，可执行：

```bash
docker-compose run --rm migration
```

或单独运行 Drizzle 迁移：

```bash
docker-compose run --rm migration pnpm migrate drizzle
```

## 前端开发

默认配置使用 **生产静态文件**（通过 `serve` 在容器内提供）。若需要进行前端热重载开发，可修改 `docker-compose.yml` 中的 `web` 服务：

1. 将 `Dockerfile.web` 中的构建命令改为 `pnpm run dev`
2. 调整 Nginx 配置，将 `/` 直接代理到 `web:22333`

但更推荐的做法是：在主机上运行前端开发服务器（`pnpm run dev`），并让 Nginx 代理到主机的 `localhost:22333`（需要调整 Nginx 配置）。此场景不在本文档范围内。

## 访问应用

启动完成后，在浏览器中打开：

- **前端页面**：http://localhost
- **Express API 文档**：http://localhost/api/healthz（健康检查）
- **Go API 健康检查**：http://localhost:8082/healthz

## 测试账户

容器启动后，数据库已预置两个测试账户，可用于快速登录验证：

| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| `dev@sciblock.local` | `DevPass1234` | instructor | 开发导师账户 |
| `demo@sciblock.com` | `DemoPass1234` | student | 演示学生账户 |

可使用这些账户通过以下端点登录：

- **Go API**：`POST http://localhost:8082/api/auth/login`
- **Express API**：`POST http://localhost:8080/api/auth/login`

登录成功后，可使用返回的 JWT 令牌访问受保护端点（如 `/api/auth/me`）。

## 已知问题与解决方案

1. **前端构建在 Alpine 镜像中失败（rollup 兼容性问题）**
   - **现象**：`web` 服务构建时出现 `Error: Dynamic require of ".../node_modules/.pnpm/rollup@..." is not supported`。
   - **解决方案**：已在 `Dockerfile.web` 中切换基础镜像为 `node:20-bookworm-slim`（Debian 系），避免 Alpine 的 musl libc 兼容性问题。

2. **Express API 缺少 `http-proxy-middleware` 依赖**
   - **现象**：启动时出现 `Cannot find module 'http-proxy-middleware'` 错误。
   - **解决方案**：已通过修改 `artifacts/api-server/package.json` 显式添加该依赖并重新构建镜像。

3. **Drizzle 迁移因 `users` 表不存在而失败**
   - **现象**：首次启动时 `migration` 服务失败，因为 Goose 迁移尚未创建 `users` 表。
   - **解决方案**：手动执行 `scripts/migrate.sh drizzle` 创建 Drizzle 所需表结构，或直接使用已提供的 SQL 文件 `seed_users.sql` 创建表。

4. **Go API 自动迁移未创建 Drizzle 所需的 `users` 表**
   - **说明**：Go API 的 Goose 迁移仅创建 Go 所需表，不包括 Express 所需的 `users` 表（Drizzle 管理）。需要单独运行 Drizzle 迁移。
   - **已解决**：我们已手动执行 Drizzle 迁移 SQL，确保两个 API 均可正常使用用户数据。

5. **前端端口映射冲突**
   - **现象**：`web` 服务使用端口 22333，可能与本地其他服务冲突。
   - **解决方案**：修改 `docker-compose.yml` 中 `web` 服务的 `ports` 映射，或停止冲突服务。

6. **Windows 上的路径大小写敏感问题**
   - **现象**：在 Windows 上构建时，某些 import 路径因大小写不一致而失败。
   - **解决方案**：确保 Git 配置为 `core.ignorecase=true`，或统一使用小写路径。

若遇到其他问题，请查阅各服务的日志：`docker-compose logs <service-name>`。

## 故障排除

### 1. 端口冲突

若本地已有服务占用 5432、6379、8080、8082、22333、80 等端口，请修改 `docker-compose.yml` 中的 `ports` 映射。

### 2. 数据库连接失败

确保 PostgreSQL 容器已正常启动并健康检查通过。检查日志：

```bash
docker-compose logs postgres
```

### 3. 迁移失败 / 登录失败

**症状**：无法登录，提示账户不存在或密码错误。

**原因**：首次启动时未运行 `migration` 服务，数据库没有表结构和测试账户。

**解决**：

```bash
# 运行迁移和种子数据
docker-compose --env-file .env.docker run --rm migration
```

检查 `migration` 服务日志：

```bash
docker-compose logs migration
```

若迁移因数据冲突失败，可先清空数据库（**注意：会丢失所有数据**）：

```bash
docker-compose down -v
docker-compose up -d postgres redis
docker-compose --env-file .env.docker run --rm migration
docker-compose --env-file .env.docker up -d go-api api-server web nginx
```

### 4. 前端无法加载

检查 Nginx 和 web 服务日志：

```bash
docker-compose logs nginx
docker-compose logs web
```

确保 Nginx 配置正确代理到 web 服务。

### 5. 健康检查失败

Go API 和 Express API 的健康检查依赖 curl，确保容器内已安装 curl（Dockerfile 已包含）。若健康检查持续失败，可暂时在 `docker-compose.yml` 中注释掉 `healthcheck` 部分。

## 生产部署建议

此 Docker Compose 配置**仅适用于开发环境**。生产环境需至少进行以下调整：

1. 使用独立的 PostgreSQL 和 Redis 实例（或云服务）
2. 启用 HTTPS（在 Nginx 中配置 TLS 证书）
3. 设置强密码和密钥（通过安全机制管理）
4. 关闭 `AUTO_MIGRATE`，改为在部署流程中显式执行迁移
5. 使用多阶段构建减小镜像体积
6. 配置适当的资源限制和重启策略

生产部署请参考 [`docs/deployment.md`](docs/deployment.md)。

## 更新服务

若代码发生变更，需重新构建镜像：

```bash
docker-compose up --build -d
```

或仅重建特定服务（例如 Go API）：

```bash
docker-compose up --build -d go-api
```

## 清理

停止所有服务并删除容器、网络、数据卷：

```bash
docker-compose down -v --rmi local
```

删除所有 Docker 镜像（谨慎操作）：

```bash
docker-compose down --rmi all -v
```

## 贡献

若发现 Docker 配置问题或有改进建议，请提交 Issue 或 Pull Request。

---

祝您开发愉快！