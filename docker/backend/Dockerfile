FROM docker.m.daocloud.io/library/golang:1.25-bookworm AS go-builder
WORKDIR /src

COPY artifacts/go-api ./artifacts/go-api
WORKDIR /src/artifacts/go-api
ENV GOPROXY=https://goproxy.cn,direct
RUN go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
COPY --from=go-builder /out/server /app/artifacts/go-api/bin/server

RUN corepack enable \
  && corepack prepare pnpm@10.17.0 --activate \
  && pnpm install --frozen-lockfile \
  && pnpm --filter @workspace/api-server run build \
  && find /app/scripts -name "*.sh" -exec sed -i 's/\r$//' {} \; \
  && find /app/docker/backend -name "*.sh" -exec sed -i 's/\r$//' {} \; \
  && chmod +x /app/docker/backend/entrypoint.sh \
  && chmod +x /app/scripts/*.sh

ENTRYPOINT ["bash", "/app/docker/backend/entrypoint.sh"]
