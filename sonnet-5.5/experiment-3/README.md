# Notes Board (Sonnet 5.5)

A React notes app with a Kanban board. Notes have a title, description, tags, priority and due date, and can be dragged from the list into board columns. Everything is stored in the browser's `localStorage`, so there is no backend.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests: reducer, import/export, validation
npm run build      # production build in dist/
```

## Deploy with one Docker image

```bash
docker build -t notes-board .
docker run --rm -p 8080:8080 notes-board
```

Then open <http://localhost:8080>. The image is a two-stage build: the first stage runs the unit tests and builds the static files, the second serves them with `nginx-unprivileged` (non-root, port 8080, health check, strict Content-Security-Policy). To deploy to a remote machine, push the image to a registry and run the same `docker run` command there.

> The Docker build was not run while this was written (Docker Desktop was not running). The same steps (`npm ci`, `npm test`, `npm run build`) were run locally and pass.

## Features

User stories: create, edit, delete and list notes (title, description, tags); data survives a refresh; export and import the notes as JSON (invalid files are rejected with a message); drag notes from the list into Kanban columns and between columns; add columns.

Extra features: colour-coded priorities and tags; auto-dismissing toasts with Undo; modal dialogs for editing and delete confirmation; reordering within a column; hover/focus icon toolbar on each note; inline title editing (double-click, or "Rename title" in the menu); "More actions" menus on notes and columns; live search and filters (text, priority, tag, overdue; they apply to the note list); due dates with overdue highlighting; collapsible columns; animations; sound effects (toggle in the header); dark mode (toggle in the header, follows the system setting by default).

Also: rename and delete columns, an Undo button and Ctrl+Z (Cmd+Z), and keyboard-only alternatives to dragging ("Move to ..." and "Move up/down/top/bottom" in the note menu).

## Import and export format

[`examples/sample-notes.json`](examples/sample-notes.json) shows the format and [`examples/invalid-notes.json`](examples/invalid-notes.json) is a file that is rejected. Importing merges into the existing notes: a note with the same id is replaced, and columns are matched by id, then by name.

## Accessibility review

The app was built first, then reviewed with the `accessibility-reviewer` subagent ([definition](.claude/agents/accessibility-reviewer.md)). The findings and what was changed are in [`reviews/accessibility-review-round-1.md`](reviews/accessibility-review-round-1.md).

## Layout

- `src/state/reducer.js`: pure state logic (notes, columns, moves)
- `src/lib/importExport.js`: JSON export, validation and merge
- `src/lib/helpers.js`: dates, tag colours, storage and sound
- `src/components/`: UI components
