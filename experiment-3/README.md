# Notes & Kanban Board

A React web application for creating notes (title, description, tags, priority, due date), managing them in a list, exporting and importing them as JSON, and organising them on a Kanban board with drag and drop. It also has toasts with Undo, dialogs, reordering, a note toolbar, inline renaming, "More actions" menus, live search and filters, collapsible columns, animations, optional sound effects and a dark mode.

It is built to meet WCAG 2.2 level AA. Every drag action also works with the keyboard (keyboard move) and with single clicks (the "Move to…" dialog and menu items).

## Quick start

With Docker:

```bash
docker build -t notes-kanban .
```

```bash
docker run -d -p 8080:80 notes-kanban
```

Then open http://localhost:8080.

For development:

```bash
npm ci
```

```bash
npm run dev
```

Tests: `npm test` (unit, component and contrast tests) and `npm run test:e2e` (Playwright, run `npx playwright install chromium` once first).

An example data file to import is in `examples/notes-export-example.json`.

## Documents

1. [Requirements specification](docs/01-requirements-specification.md)
2. [Architecture and design](docs/02-architecture-and-design.md)
3. [Implementation guide](docs/03-implementation.md)
4. [Testing and deployment instructions](docs/04-testing-and-deployment.md)

Each document was checked by the accessibility reviewer before the next step started; the review history is at the end of each document.
