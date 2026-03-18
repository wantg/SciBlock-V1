FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS build
WORKDIR /app

COPY . .

RUN corepack enable \
  && corepack prepare pnpm@10.17.0 --activate \
  && pnpm install --frozen-lockfile

ENV PORT=4173
ENV BASE_PATH=/
RUN pnpm --filter @workspace/web run build

FROM docker.m.daocloud.io/library/nginx:1.27-alpine

COPY --from=build /app/artifacts/web/dist/public /usr/share/nginx/html
COPY docker/frontend/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
