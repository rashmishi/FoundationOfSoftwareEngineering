# syntax=docker/dockerfile:1

# ---- Build stage: install, test, build the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app
ARG SKIP_TESTS=false
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN if [ "$SKIP_TESTS" != "true" ]; then npx vitest run; fi
RUN npm run build

# ---- Runtime stage: one small nginx image serving the bundle ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
