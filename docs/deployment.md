# SciBlock — 自有云服务器部署方案

目标：将 SciBlock 部署到一台普通 VPS，通过 Nginx + systemd 以生产级方式运行。

本文档不涉及 Docker、Kubernetes、CI/CD。

---

## 一、推荐的服务器环境

### 操作系统

Ubuntu 22.04 LTS（推荐）。以下所有命令均针对该发行版。

### 最低硬件

| 资源 | 最低 | 建议（小型科研团队 ≤30 人） |
|------|------|--------------------------|
| CPU  | 1 核 | 2 核                      |
| 内存 | 1 GB | 2 GB                     |
| 磁盘 | 20 GB SSD | 40 GB SSD            |

### 软件版本（必须满足）

| 软件       | 最低  | 安装说明 |
|------------|-------|---------|
| Go         | 1.21  | 见下方   |
| Node.js    | 20    | 见下方   |
| pnpm       | 9     | `npm i -g pnpm` |
| PostgreSQL | 14    | `apt install postgresql` |
| Nginx      | 1.18  | `apt install nginx` |

### 同机还是分机

**初始部署建议同机**（数据库与应用同一台服务器）：
- ≤30 人团队负载极低，无需分离
- 减少网络延迟，配置简单
- 需要扩容时再迁移 PostgreSQL 到独立机器

数据库独立的唯一必要场景：团队数据规模达到 GB 级，或需要独立备份策略。

---

## 二、推荐目录结构

```
/opt/sciblock/
├── app/                          # git clone 到这里
│   ├── artifacts/
│   │   ├── web/dist/public/      # ← 前端构建产物（Nginx 直接 serve）
│   │   ├── api-server/dist/      # ← Express 生产包（index.cjs）
│   │   └── go-api/bin/server     # ← Go 二进制
│   ├── lib/
│   ├── scripts/
│   └── docs/
├── env/
│   └── production.env            # 生产环境变量（不提交到 Git）
└── (日志由 systemd journal 管理，用 journalctl 查看)
```

**原则：**
- 代码在 `/opt/sciblock/app/`（不要放在 `/home/` 或 `/root/`）
- 环境变量文件在 `/opt/sciblock/env/production.env`（不在 repo 内）
- 不手动创建 `logs/` 目录——systemd journal 是生产日志的标准来源

---

## 三、进程管理方案

使用 **systemd** 守护两个后端进程。

### 3.1 创建运行用户

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/sciblock sciblock
sudo chown -R sciblock:sciblock /opt/sciblock
```

### 3.2 Go API — `/etc/systemd/system/sciblock-go.service`

```ini
[Unit]
Description=SciBlock Go API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=sciblock
WorkingDirectory=/opt/sciblock/app/artifacts/go-api

EnvironmentFile=/opt/sciblock/env/production.env
# Go API 使用的端口：PORT 默认 8082，通过 EnvironmentFile 设置
# ENV=production 触发生产模式 CORS 启动警告

ExecStart=/opt/sciblock/app/artifacts/go-api/bin/server

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sciblock-go

[Install]
WantedBy=multi-user.target
```

### 3.3 Express API — `/etc/systemd/system/sciblock-api.service`

```ini
[Unit]
Description=SciBlock Express API Server
After=network.target sciblock-go.service
Wants=sciblock-go.service

[Service]
Type=simple
User=sciblock
WorkingDirectory=/opt/sciblock/app/artifacts/api-server

EnvironmentFile=/opt/sciblock/env/production.env

ExecStart=/usr/bin/node dist/index.cjs

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sciblock-api

[Install]
WantedBy=multi-user.target
```

### 3.4 启用与操作

```bash
sudo systemctl daemon-reload
sudo systemctl enable sciblock-go sciblock-api
sudo systemctl start sciblock-go sciblock-api

# 查看状态
sudo systemctl status sciblock-go
sudo systemctl status sciblock-api

# 查看日志（实时）
sudo journalctl -u sciblock-go -f
sudo journalctl -u sciblock-api -f

# 滚动更新后重启
sudo systemctl restart sciblock-go sciblock-api
```

---

## 四、Nginx 反向代理方案

### 4.1 架构决策：Express 作为唯一 API 入口

**不建议** 让 Nginx 同时分流到 Express 和 Go API。原因：
- Express 内部已实现路径路由逻辑（`GO_API_PREFIXES` 列表），重复维护到 Nginx 会产生配置漂移
- Express 的 `requireAuth` 中间件在代理到 Go 之前先完成 JWT 验证
- Go API 绑定 `127.0.0.1`，不对 Nginx 暴露

**推荐架构：**

```
Internet
   │ 443 (HTTPS)
   ▼
 Nginx
   ├── /          → 静态文件  /opt/sciblock/app/artifacts/web/dist/public/
   └── /api/      → Express  127.0.0.1:8080
                       └── (内部代理)
                           ├── /api/auth/login,me,logout  → Go  127.0.0.1:8082
                           ├── /api/scinotes/**           → Go  127.0.0.1:8082
                           ├── /api/experiments/**        → Go  127.0.0.1:8082
                           └── 其余 /api/**               → Express 自处理
```

### 4.2 Nginx 配置文件

`/etc/nginx/sites-available/sciblock`：

```nginx
server {
    listen 80;
    server_name your-domain.example.com;
    # HTTPS 重定向（配置 TLS 后取消注释）
    # return 301 https://$host$request_uri;
}

# 取消注释并填写后启用 HTTPS
# server {
#     listen 443 ssl http2;
#     server_name your-domain.example.com;
#
#     ssl_certificate     /etc/letsencrypt/live/your-domain.example.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.example.com/privkey.pem;
#     include /etc/letsencrypt/options-ssl-nginx.conf;
#     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

server {
    listen 80;
    server_name your-domain.example.com;

    # ── 访问日志 ──────────────────────────────────────────────────────────
    access_log /var/log/nginx/sciblock.access.log;
    error_log  /var/log/nginx/sciblock.error.log;

    # ── 前端静态文件（React SPA）────────────────────────────────────────
    root /opt/sciblock/app/artifacts/web/dist/public;
    index index.html;

    location / {
        # try_files 先找文件，找不到则回落到 index.html（支持前端路由）
        try_files $uri $uri/ /index.html;
    }

    # ── Express API ─────────────────────────────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket（如未来需要）
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        # 超时
        proxy_read_timeout  30s;
        proxy_send_timeout  30s;
        proxy_connect_timeout 5s;
    }

    # ── 安全头 ───────────────────────────────────────────────────────────
    add_header X-Frame-Options        SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy        strict-origin-when-cross-origin;

    # ── 静态资源缓存 ──────────────────────────────────────────────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/sciblock /etc/nginx/sites-enabled/
sudo nginx -t          # 语法检查
sudo systemctl reload nginx
```

**HTTPS（生产必须）：**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
# Certbot 自动修改 Nginx 配置并配置自动续期
```

---

## 五、首次部署步骤

按顺序执行，不可跳步。

### 5.1 安装系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
sudo npm install -g pnpm

# Go 1.21+（从官方下载，apt 版本通常过旧）
GO_VERSION="1.25.5"
curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/golang.sh
source /etc/profile.d/golang.sh
go version    # 确认输出 go1.25.x
```

### 5.2 初始化 PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER sciblock WITH PASSWORD 'your-strong-db-password';
CREATE DATABASE sciblock OWNER sciblock;
SQL
```

### 5.3 拉取代码

```bash
sudo mkdir -p /opt/sciblock/app /opt/sciblock/env
sudo useradd -r -s /usr/sbin/nologin -d /opt/sciblock sciblock

# 以 root 或有权限的用户 clone
sudo git clone https://github.com/your-org/sciblock.git /opt/sciblock/app
sudo chown -R sciblock:sciblock /opt/sciblock
```

### 5.4 写生产环境变量文件

```bash
# 生成 JWT_SECRET（只生成一次，永远不更换除非需要强制所有用户重新登录）
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"  # 备份到密码管理器

sudo tee /opt/sciblock/env/production.env > /dev/null <<EOF
# ── 共享 ───────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://sciblock:your-strong-db-password@localhost:5432/sciblock
JWT_SECRET=${JWT_SECRET}

# ── Go API ─────────────────────────────────────────────────────────────
PORT=8082
ENV=production
AUTO_MIGRATE=false
BCRYPT_COST=12
JWT_EXPIRY_HOURS=168
CORS_ORIGINS=https://your-domain.example.com

# ── Express API ────────────────────────────────────────────────────────
# PORT 在 sciblock-api.service 里覆盖为 8080，不要在此设置为 8082
GO_API_URL=http://127.0.0.1:8082
ADMIN_SECRET=$(openssl rand -hex 16)
NODE_ENV=production

# AI（选填；不填则前端自动显示"AI 未配置"）
AI_PROVIDER=qianwen
# DASHSCOPE_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here
EOF

# Express 的 PORT 单独覆盖（避免与 Go 的 PORT=8082 冲突）
# 在 sciblock-api.service 中用 Environment="PORT=8080" 覆盖（见第三节）
sudo chmod 600 /opt/sciblock/env/production.env
sudo chown sciblock:sciblock /opt/sciblock/env/production.env
```

> **注意**：上面的 `EnvironmentFile` 对 Go 和 Express 是共享的，但 Go 的 `PORT=8082` 会被 Express 的 service 文件里的 `Environment="PORT=8080"` 覆盖。在 systemd 里 `Environment=` 的优先级高于 `EnvironmentFile=`，所以在 `sciblock-api.service` 中加一行：
>
> ```ini
> Environment="PORT=8080"
> ```

### 5.5 安装依赖

```bash
cd /opt/sciblock/app
sudo -u sciblock pnpm install --frozen-lockfile
```

### 5.6 执行数据库迁移

```bash
cd /opt/sciblock/app
sudo -u sciblock bash -c '
  export $(cat /opt/sciblock/env/production.env | grep -v "^#" | xargs)
  pnpm migrate
'
```

验证关键表存在：

```bash
sudo -u postgres psql -d sciblock -c "\dt" | grep -E \
  "users|students|papers|weekly_reports|report_comments|messages|scinotes|experiment_records"
```

### 5.7 构建所有产物

```bash
cd /opt/sciblock/app
sudo -u sciblock bash -c '
  export BASE_PATH=/
  export NODE_ENV=production
  sh scripts/build.sh
'
```

确认三个产物存在：

```bash
ls -lh artifacts/web/dist/public/index.html
ls -lh artifacts/api-server/dist/index.cjs
ls -lh artifacts/go-api/bin/server
```

### 5.8 （可选）Seed 初始数据

只在首次部署时运行。如果生产数据库不需要演示数据，跳过此步，改用 Admin API 手动创建账户：

```bash
# 方式 A：通过 seed 脚本创建演示账户（仅测试/演示用途）
sudo -u sciblock bash -c '
  export $(cat /opt/sciblock/env/production.env | grep -v "^#" | xargs)
  bash scripts/seed-dev.sh
'

# 方式 B：通过 Admin API 创建生产账户（生产推荐，服务启动后执行）
# POST /api/admin/users  Authorization: Bearer <ADMIN_SECRET>
```

### 5.9 安装并启动 systemd 服务

```bash
# 复制 service 文件（内容见第三节）
sudo tee /etc/systemd/system/sciblock-go.service > /dev/null << 'EOF'
[Unit]
Description=SciBlock Go API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=sciblock
WorkingDirectory=/opt/sciblock/app/artifacts/go-api
EnvironmentFile=/opt/sciblock/env/production.env
ExecStart=/opt/sciblock/app/artifacts/go-api/bin/server
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sciblock-go

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/sciblock-api.service > /dev/null << 'EOF'
[Unit]
Description=SciBlock Express API Server
After=network.target sciblock-go.service
Wants=sciblock-go.service

[Service]
Type=simple
User=sciblock
WorkingDirectory=/opt/sciblock/app/artifacts/api-server
EnvironmentFile=/opt/sciblock/env/production.env
Environment="PORT=8080"
ExecStart=/usr/bin/node dist/index.cjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sciblock-api

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable sciblock-go sciblock-api
sudo systemctl start sciblock-go sciblock-api
sudo systemctl status sciblock-go sciblock-api
```

### 5.10 配置并启动 Nginx

```bash
# 复制 Nginx 配置（内容见第四节，替换 your-domain.example.com）
sudo tee /etc/nginx/sites-available/sciblock > /dev/null << '...见第四节...'

sudo ln -s /etc/nginx/sites-available/sciblock /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.11 配置 TLS（生产必须）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
sudo certbot renew --dry-run   # 验证自动续期
```

### 5.12 执行 Smoke Test 验证

```bash
cd /opt/sciblock/app
sudo -u sciblock bash -c '
  export $(cat /opt/sciblock/env/production.env | grep -v "^#" | xargs)
  BASE_URL=https://your-domain.example.com bash scripts/rehearsal-smoke-test.sh
'
```

期望：`ALL TESTS PASSED (26/26)`

---

## 六、生产环境必须替换或确认的配置

在 `/opt/sciblock/env/production.env` 中逐项确认：

| 变量 | 要求 | 生成方式 |
|------|------|---------|
| `JWT_SECRET` | **必须替换**，且 Go API 和 Express 完全一致 | `openssl rand -hex 32` |
| `DATABASE_URL` | 填入真实数据库地址和密码 | 手动填写 |
| `CORS_ORIGINS` | **必须设置**为前端域名，如 `https://app.example.com` | 手动填写 |
| `ADMIN_SECRET` | **必须替换**默认值 | `openssl rand -hex 16` |
| `ENV` | 设为 `production` | 硬写 |
| `NODE_ENV` | 设为 `production` | 硬写 |
| `AUTO_MIGRATE` | 设为 `false`（生产不自动迁移） | 硬写 |
| `GO_API_URL` | `http://127.0.0.1:8082`（不要用 `localhost` 可能解析 IPv6） | 硬写 |
| `AI_PROVIDER` + Key | 按需填写；不填则 AI 功能禁用（前端显示"未配置"） | 可选 |
| `BCRYPT_COST` | 生产建议 12（默认值即可） | 保持默认 |
| `JWT_EXPIRY_HOURS` | 默认 168（7 天），按安全策略调整 | 按需 |

**不需要**在生产环境中设置的变量：
- `BASE_PATH`（构建时用，运行时不需要）
- `EXPRESS_PORT`（仅文档占位符；实际服务用 `PORT`）

---

## 七、上线后的最小验证 Checklist

### 快速 curl 验证（在服务器或本地执行）

```bash
DOMAIN="https://your-domain.example.com"

# 1. 健康检查
curl -s "$DOMAIN/api/healthz" | grep -q "ok" && echo "✅ Express healthz" || echo "❌ Express healthz"
curl -s "http://127.0.0.1:8082/healthz" | grep -q "sciblock-go-api" && echo "✅ Go healthz" || echo "❌ Go healthz"

# 2. 登录 + 保存 token
TOKEN=$(curl -s -X POST "$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@sciblock.local","password":"DevPass1234"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] && echo "✅ Login OK" || echo "❌ Login FAILED"

# 3. auth/me 经 Express（验证 JWT 跨服务）
curl -s -o/dev/null -w "%{http_code}" "$DOMAIN/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | grep -q "200" && echo "✅ auth/me" || echo "❌ auth/me"

# 4. SciNote 创建
STATUS=$(curl -s -o/dev/null -w "%{http_code}" -X POST "$DOMAIN/api/scinotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"prod-verify"}')
[ "$STATUS" = "201" ] && echo "✅ SciNote create" || echo "❌ SciNote create ($STATUS)"

# 5. AI 状态（无 key → false）
curl -s "$DOMAIN/api/ai/status" | grep -q '"available"' && echo "✅ AI status" || echo "❌ AI status"

# 6. CORS — 允许 origin
curl -sI -H "Origin: https://your-domain.example.com" \
  "http://127.0.0.1:8082/healthz" | grep -q "your-domain.example.com" && \
  echo "✅ CORS allowed origin" || echo "❌ CORS allowed origin"

# 7. CORS — 拒绝非允许 origin
CORS_HDR=$(curl -sI -H "Origin: https://evil.example.com" \
  "http://127.0.0.1:8082/healthz" | grep -i "access-control-allow-origin" || true)
[ -z "$CORS_HDR" ] && echo "✅ CORS blocked foreign origin" || echo "❌ CORS should block foreign origin"

# 8. 认证边界（无 token → 401）
curl -s -o/dev/null -w "%{http_code}" "$DOMAIN/api/team/members" | \
  grep -q "401" && echo "✅ Auth boundary" || echo "❌ Auth boundary"
```

### 或者直接跑 smoke test（推荐）

```bash
BASE_URL="https://your-domain.example.com" \
  bash /opt/sciblock/app/scripts/rehearsal-smoke-test.sh
```

---

## 八、更新部署流程（后续版本迭代）

```bash
cd /opt/sciblock/app

# 1. 拉取新代码
sudo -u sciblock git pull

# 2. 安装新依赖（如果 package.json 有变化）
sudo -u sciblock pnpm install --frozen-lockfile

# 3. 执行新迁移（如果有 migration 文件变化）
sudo -u sciblock bash -c '
  export $(cat /opt/sciblock/env/production.env | grep -v "^#" | xargs)
  pnpm migrate
'

# 4. 重新构建
sudo -u sciblock bash -c 'BASE_PATH=/ NODE_ENV=production sh scripts/build.sh'

# 5. 重启服务
sudo systemctl restart sciblock-go sciblock-api

# 6. 验证
BASE_URL=https://your-domain.example.com \
  sudo -u sciblock bash /opt/sciblock/app/scripts/rehearsal-smoke-test.sh
```

---

## 九、常见问题排查

| 现象 | 检查点 |
|------|-------|
| Go API 启动即 exit | `journalctl -u sciblock-go -n 50`；确认 `DATABASE_URL` 和 `JWT_SECRET` 在 `production.env` 中均有值 |
| Express 返回 502 | Go API 未启动；`GO_API_URL` 写的是 `localhost` 而非 `127.0.0.1`（IPv6 解析问题） |
| 前端白屏 | `BASE_PATH` 是否在 build 时设为 `/`；Nginx `try_files` 是否回落 `index.html` |
| `/api/auth/me` 401 | 两服务 `JWT_SECRET` 不一致；检查 `production.env` 是否被两个 service 都加载 |
| CORS 精确模式所有请求被拒 | `CORS_ORIGINS` 中 origin 的协议（`http://` vs `https://`）或端口与浏览器实际请求不符 |
| `pnpm migrate` 在生产失败 | 先看 pre-fk-cleanup.sql 是否有孤儿数据报错；或 `DATABASE_URL` 指向错误 DB |
