# Notes & Kanban Board

A React web application for creating notes (title, description, tags), managing them in a list, exporting and importing them as JSON, and organising them on a Kanban board with drag-and-drop. It is designed to meet WCAG 2.2 AA: every drag operation also works with the keyboard and with a Column menu plus a Move button.

## Quick start

With Docker:

```bash
docker build -t notes-kanban .
docker run -d -p 8080:80 notes-kanban
```

Then open http://localhost:8080.

For development:

```bash
npm ci
npm run dev
```

Run the tests with `npx vitest run`.

## Documents

1. [Requirements specification](docs/01-requirements-specification.md)
2. [Architecture & design](docs/02-architecture-and-design.md)
3. [Implementation overview](docs/03-implementation.md)
4. [Testing & deployment instructions](docs/04-testing-and-deployment.md)
