# syntax=docker/dockerfile:1

# ---- Build stage: install, run unit/component tests, build the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app
ARG SKIP_TESTS=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN if [ "$SKIP_TESTS" != "true" ]; then npx vitest run; fi
RUN npm run build

# ---- Runtime stage: one small, non-root nginx image serving the bundle ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Docker lets non-root processes bind low ports inside containers (ip_unprivileged_port_start=0),
# so the image listens on 80 and `docker run -p 8080:80` works.
EXPOSE 80
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
