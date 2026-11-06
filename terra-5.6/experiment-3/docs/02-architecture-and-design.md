# Notes Kanban — Architecture & Design

## 1. System overview

The app is a Vite-built React single-page application. It has no backend: a small storage module validates and persists `AppData` in `localStorage`. Nginx serves the production bundle from the single Docker image.

```text
Browser → React app → state/actions → AppData → storage.ts → localStorage
                 └── composer, list, board, import/export, toast and sound
```

## 2. Component design

| Component/module | Responsibility |
| --- | --- |
| `App` | Owns app data, filters, modal/menu state, persistence effects, and shared actions. |
| `NoteForm` | Accessible create/edit form with title validation. |
| `NoteCard` | Renders a note, inline title editor, hover/focus toolbar, and action menu. |
| `Board` / `Column` | Renders columns, collapse/actions, drag targets, and keyboard destinations. |
| `Modal` | Dialog behavior: label, Escape close, focus entry/trap, and focus restoration. |
| `ToastRegion` | Live feedback; pauses an Undo timer on focus/hover. |
| `storage` | Defaults, parsing, import validation, and storage I/O. |
| `types` | Shared TypeScript data types. |

## 3. State and persistence

`App` initializes with `loadData()`. Every mutation creates a new `AppData` object and writes it to `localStorage` under `notes-kanban:v1`. `loadData()` returns safe defaults if stored data cannot be parsed or fails validation. `validateImportedData()` accepts only a version-1 object whose notes and columns satisfy required shape and type constraints. Imported text is rendered by React as text, never as HTML.

Ordering is represented by each note's numeric `order`; order is normalized per column after moves/reorders. A note with `columnId: null` is unassigned but still shown in the notes list.

## 4. Key workflows

### Create / edit / delete

1. User submits `NoteForm`; title is trimmed and required.
2. The action updates `AppData`, persists it, and announces a toast.
3. Edit uses a modal; delete requires a confirmation modal.
4. Delete retains a snapshot in the toast's Undo handler for 10 seconds.

### Import / export

Export serializes complete `AppData` using `JSON.stringify(data, null, 2)`, creates an `application/json` Blob, and triggers a named download. Import reads the selected file as text, JSON-parses it, validates it, replaces app data, and reports either success or a specific error.

### Board movement

Pointer users can use native HTML drag events. Drag start stores the note ID in a React ref and applies `.is-dragging`; a column/card drop target calls one move function. Since mutations occur only during `drop`, abandoning the drag leaves the card unchanged.

Keyboard and touch users have an equivalent path: each note's More actions menu includes “Move to …” choices for every column plus “Remove from board”. Native drag support is therefore not the only method.

## 5. Accessibility interaction contract

| Concern | Design decision |
| --- | --- |
| Page structure | One `header`, `main`, labelled `section`s, ordered headings, document title “Notes Kanban”. |
| Forms | Visible labels, required title indicator, `aria-describedby` errors, and error/live feedback. |
| Icons | Buttons have `aria-label`; SVGs are decorative. Toolbars appear on hover and `:focus-within`. |
| Dialogs | `role=dialog`, `aria-modal=true`, programmatic label, Escape close, initial focus, focus trap, then restore focus to opener. |
| Menus | Triggers expose `aria-expanded`/`aria-controls`; items are native buttons; close returns focus to trigger. |
| Board | Drop targets have labels and visual states; keyboard move menus provide equivalent operations. |
| Feedback | Toasts are polite live feedback. Undo persists at least 10 seconds and pauses on hover/focus. |
| Color/motion/audio | Priority/tag meaning includes text. Theme colors target AA contrast. Reduced-motion disables animation; persisted mute disables optional sounds. |

## 6. Responsive visual design

CSS custom properties provide light/dark themes. Responsive grids serve the list and board; the board scrolls horizontally rather than shrinking columns below usable width. Cards include readable priority/tag text. Due dates display an explicit “Overdue” word in addition to styling.

## 7. Deployment design

A multi-stage `Dockerfile` runs `npm ci` and `npm run build` in Node, then copies `dist/` into Nginx Alpine. `nginx.conf` provides SPA fallback to `index.html`; port 80 is exposed. `.dockerignore` prevents development files and dependencies entering the build context.

## 8. Test strategy

Vitest tests storage validation and core workflows. React Testing Library tests validation, rendering, persistence boundaries, menu/modal semantics, keyboard move actions, and import failures. The deployment guide adds manual browser, keyboard, and Docker smoke tests.
