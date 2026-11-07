# Notes Kanban

A notes app with a Kanban board, built with React and Vite and shipped as a single Docker image (static files served by nginx).

## Run it

**Docker (the deployment path)**

```bash
docker build -t notes-kanban .
docker run -d -p 8080:80 --name notes-kanban notes-kanban
```

Open <http://localhost:8080>. The same image runs on any local or remote host with Docker; map whichever host port you like. `docker compose up -d --build` does the same using `docker-compose.yml`. A health endpoint is available at `/healthz`.

The build stage runs the unit tests, so a failing test stops the image from being built. Pass `--build-arg SKIP_TESTS=true` to skip them.

**Local development**

```bash
npm ci
npm run dev      # http://localhost:5173
npm test         # unit tests for the note, board and import/export logic
npm run build    # production bundle in dist/
```

## Where the data lives

Notes, columns and settings are kept in the browser's `localStorage`, so they survive a refresh and need no backend. This also means each browser (and each origin) has its own notes. Use **Export** and **Import** to move notes between browsers or machines. Changes made in one tab show up in other open tabs.

## What is implemented

**User stories**

| Story | Where |
| --- | --- |
| Create notes with title, description and tags; the title is required | **New note** dialog; an empty title shows an inline error and nothing is saved; a toast confirms creation |
| View and manage notes in a list; edit; delete | Left-hand list, newest first |
| Export and import the note list as JSON | **Export** / **Import** in the top bar. A file that is not valid JSON, or whose notes are malformed, is rejected with an error and changes nothing. Importing merges by note id, so re-importing an export does not create duplicates |
| Drag notes from the list onto a Kanban board | Drag a card onto a column. The dragged card is dimmed, columns show dashed drop zones, and the target column and drop position are highlighted. Dropping anywhere else leaves the note where it was |
| Create columns and move notes between them | **Add column** field above the board; drag between columns |
| Browser access and Docker deployment | Static single-page app in one nginx image |

**Additional features**

1. **Colour-coded priority and tags.** Priority (low, green; medium, amber; high, red) colours the card edge and badge, always with a text label. Each tag name gets its own stable colour.
2. **Auto-dismissing toasts with Undo.** Every change shows a toast for about 5 seconds; hovering or focusing it pauses the countdown. Undo restores the state from just before that change.
3. **Modal dialogs** for creating, editing, renaming a column, and confirming deletes (native `<dialog>`: focus is trapped, Escape closes, focus returns afterwards).
4. **Reordering within a column**: drag a card to a position (an indicator line shows where it will land), or use *Move up / Move down* in the card menu.
5. **Hover toolbar** with icon-only edit, duplicate and delete buttons on every note. It also appears on keyboard focus and is always visible on touch screens.
6. **Inline title editing**: click a title, type, press Enter (Escape cancels).
7. **"More actions" menus** on notes (edit, duplicate, move up/down, move to any column, remove from board, delete) and on columns (rename, collapse, add a note, move left/right, mark as "done" column, clear, delete). Fully keyboard-operable.
8. **Search and filter** by text (title, description, tags), priority, tag and overdue, applied live to both the list and the board.
9. **Due dates with overdue highlighting.** Overdue notes get a red edge and badge. Notes in a column marked as a "done" column (the default *Done* column is one) are never shown as overdue.
10. **Collapsible columns** that shrink to a slim strip and still accept drops.
11. **Animations and transitions** for cards, dialogs, menus, toasts, column collapse and drag feedback. They are disabled when the system asks for reduced motion.
12. **Sound effects**, synthesised with the Web Audio API (no audio files), with a mute toggle in the top bar.
13. **Dark mode toggle.** Follows the system setting until you choose; your choice is remembered.

## Import file format

```json
{
  "columns": [{ "id": "col-todo", "name": "To Do", "collapsed": false, "done": false }],
  "notes": [
    {
      "id": "…", "title": "Required", "description": "", "tags": ["a"],
      "priority": "low | medium | high", "dueDate": "YYYY-MM-DD or null",
      "columnId": "a column id or null", "order": 0
    }
  ]
}
```

Only `title` is required on each note. A bare array of notes is accepted too. [`examples/sample-notes.json`](examples/sample-notes.json) is a ready-made file and [`examples/invalid-notes.json`](examples/invalid-notes.json) shows one that is rejected.

## Project layout

```
src/lib/store.js       pure functions for notes, columns, ordering, filters, import/export
src/lib/store.test.js  unit tests for the above
src/lib/storage.js     localStorage load/save (data and preferences)
src/lib/sound.js       Web Audio sound effects
src/App.jsx            state, actions (each with its toast and Undo), drag-and-drop state
src/components/        UI: note card, list, board, column, menu, modal, toasts, forms
Dockerfile, nginx.conf multi-stage build (Node, then nginx) and server config
```

## Known limitations

- Browser drag-and-drop does not work with touch input on most phones. The *Move to column* item in a note's "More actions" menu does the same job.
- Data is per browser; there is no server-side storage or sync between devices.
