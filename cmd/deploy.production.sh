#!/bin/bash
set -euo pipefail

# ============================================
# SciBlock 生产环境部署脚本（简化稳定版）
# 特点: 预构建 + 快速重启 + 健康检查 + 人工回滚
# ============================================

ENV_FILE="docker/.env.production"
COMPOSE_FILE="docker-compose.yml"
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-30}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    log "❌ $1"
    log ""
    log "排查建议:"
    log "  1. 查看日志: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs backend"
    log "  2. 手动回滚: git reset --hard HEAD~1 && ./cmd/deploy.production.sh"
    log "  3. 紧急恢复: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d"
    exit 1
}

# 获取健康检查URL
get_health_url() {
    local port
    port=$(grep -E "^BACKEND_PORT=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "8080")
    echo "http://localhost:${port}/api/healthz"
}

# 健康检查
health_check() {
    local url=$1
    local retries=$((HEALTH_CHECK_TIMEOUT / 2))
    
    for i in $(seq 1 "$retries"); do
        # 检查容器是否 running
        local container_id
        container_id=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q backend 2>/dev/null || true)
        
        if [ -z "$container_id" ]; then
            log "  等待容器启动... ($i/${retries})"
            sleep 2
            continue
        fi
        
        local state
        state=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null || true)
        
        if [ "$state" != "running" ]; then
            log "  容器状态: $state ($i/${retries})"
            sleep 2
            continue
        fi
        
        # HTTP检查
        if curl -sf --max-time 3 "$url" > /dev/null 2>&1; then
            return 0
        fi
        
        log "  健康检查中... ($i/${retries})"
        sleep 2
    done
    
    return 1
}

# ========== 主流程 ==========

log "=========================================="
log "🚀 SciBlock 生产环境部署"
log "=========================================="

# 1. 拉代码
log "[1/4] 拉取最新代码..."
git pull || error_exit "Git pull 失败"

# 2. 预构建（关键：不影响线上）
log "[2/4] 预构建镜像..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build || error_exit "镜像构建失败，线上服务未受影响"

# 3. 快速重启（停机窗口）
log "[3/4] 重启服务..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-build --remove-orphans || error_exit "容器启动失败"

# 4. 健康检查
log "[4/4] 健康检查..."
HEALTH_URL=$(get_health_url)
log "  检查地址: $HEALTH_URL"

if health_check "$HEALTH_URL"; then
    log "✅ 健康检查通过"
else
    log "❌ 健康检查失败"
    log ""
    log "最近日志:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=30 backend 2>/dev/null || true
    error_exit "部署可能失败，请检查上述日志"
fi

log "=========================================="
log "✅ 部署成功"
log "=========================================="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
