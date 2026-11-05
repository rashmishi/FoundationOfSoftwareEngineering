# syntax=docker/dockerfile:1

# ---- Build stage: install, unit-test and compile the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app
ARG SKIP_TESTS=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN if [ "$SKIP_TESTS" != "true" ]; then npx vitest run; fi
RUN npm run build

# ---- Runtime stage: one small nginx image serving the bundle ----
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.title="notes-kanban" \
      org.opencontainers.image.description="Notes with a Kanban board, served as a static single-page app."
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
