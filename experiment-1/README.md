# Notes Kanban (experiment 1)

A React + TypeScript single-page app for notes with title, description, tags, priority and due date, a Kanban board you drag them onto, JSON export/import, search and filters, toasts with Undo, dark mode and sound effects. Data stays in the browser (`localStorage`). It ships as a single Docker image.

## Documents

1. [Requirements specification](docs/01-requirements-specification.md)
2. [Architecture & design](docs/02-architecture-and-design.md)
3. [Implementation](docs/03-implementation.md)
4. [Testing & deployment](docs/04-testing-and-deployment.md)

The original brief is in [docs/00-initial-prompt.md](docs/00-initial-prompt.md).

## Quick start

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright; run `npx playwright install chromium` once)
```

## Docker

```bash
docker build -t notes-kanban .
docker run -d -p 8080:80 --name notes-kanban notes-kanban   # http://localhost:8080
```

`examples/sample-notes.json` is a ready-made file to try **Import** with; `examples/invalid-notes.json` shows the error handling.
