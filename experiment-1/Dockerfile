# syntax=docker/dockerfile:1

# ---- Build stage: install, test, and build the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Fail the image build if any test fails.
RUN npm test && npm run build

# ---- Runtime stage: serve the bundle with unprivileged nginx ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="notes-kanban" \
      org.opencontainers.image.description="Notes Kanban - notes with tags and a drag-and-drop Kanban board"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
