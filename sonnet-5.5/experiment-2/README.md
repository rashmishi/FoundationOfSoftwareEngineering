# Notes Board (accessible build)

A React notes app with a drag-and-drop column board, built to **WCAG 2.2 Level AA**. Notes have a title,
description, tags, priority and due date. They live in a searchable list and can be placed on a board of
columns. Everything is stored in the browser (`localStorage`); there is no server component.

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for how each accessibility area was handled and how it was checked.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (reducer, import/export, validation, filters)
npm run build      # production build in dist/
```

### Deploy with Docker (single image)

```bash
docker build -t notes-board .
docker run --rm -p 8080:8080 notes-board     # http://localhost:8080
```

The image has two stages: it runs the unit tests and builds the static site with Node, then serves it from
`nginxinc/nginx-unprivileged` (non-root, port 8080, health check, security headers and a strict
Content-Security-Policy in [nginx.conf](nginx.conf)). It works on any host that can run Docker; to use another
port, change the left side of `-p`.

## What it does

| User story | Where |
| --- | --- |
| Create notes with title, description and tags; saving without a title is refused | **Add a note** form |
| Created notes appear in the list with a confirmation message; they survive a refresh | **Notes** list, notification, `localStorage` |
| View, edit (dialog or inline title) and delete notes; deletes survive a refresh | note toolbar and **More actions** menu |
| Export and import the notes as a JSON file; invalid files are rejected with an error | **Export notes** / **Import notes** |
| Drag notes from the list onto board columns; columns persist; dropping elsewhere changes nothing | **Board** |
| Add columns and move notes between them | **Add column**, drag, or **Move to** menu items |
| Runs in a browser; deploys as one Docker image | see above |

Extra features: colour-coded priority levels and tags, auto-dismissing notifications with Undo (plus an always
available Undo button), edit and delete-confirmation dialogs, reordering within a column, an icon toolbar that
appears on hover or focus, inline title editing, a **More actions** menu on notes and columns, live search and
filters, due dates with overdue highlighting, collapsible columns, animations, sound effects and a dark mode
switch. Also: rename, reorder and delete columns, and a settings dialog (text size, animations, notifications).

### Try the examples

[`examples/sample-notes.json`](examples/sample-notes.json) is a ready-made file with seven notes across four
columns (use **Import notes**). [`examples/invalid-notes.json`](examples/invalid-notes.json) is valid JSON with
invalid notes, to see the rejection message.

### File format

```jsonc
{
  "app": "notes-board",
  "version": 1,
  "exportedAt": "2026-11-06T12:00:00.000Z",
  "columns": [{ "id": "col-todo", "name": "To do", "collapsed": false, "noteIds": ["n1"] }],
  "notes": [{
    "id": "n1", "title": "Required", "description": "", "tags": ["a"],
    "priority": "none | low | medium | high", "dueDate": "YYYY-MM-DD or empty",
    "columnId": "col-todo or null", "createdAt": "ISO date", "updatedAt": "ISO date"
  }]
}
```

Import is forgiving about what is *missing* (a bare array of notes with only titles works) and strict about what is
*wrong*: if any note is invalid the whole file is rejected, nothing changes, and the message says which note and why.
Importing **merges**: notes with an id that already exists are updated, others are added, and columns are matched by
id or name.

## Behaviour worth knowing

- **Sound effects are off by default** and always repeat information that is also shown as text.
- **Undo** covers every change except collapsing a column. The history lives only for the current visit.
- If the browser refuses to save (private mode, full storage) a warning banner says so and suggests exporting.
- Changes made in another tab of the same browser are picked up automatically.

## Project layout

```
src/state/       reducer (pure), import/export validation, storage, board store (undo, focus), toasts, settings
src/components/  UI: header, filters, note form, note cards, list, board, columns, menu, dialogs, toasts
src/lib/         dates, filters, note rules, sound
src/styles.css   design tokens (light and dark), layout, components, reduced-motion and forced-colors rules
```
