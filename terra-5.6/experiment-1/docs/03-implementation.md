# NoteFlow — Implementation Record

## Delivered application

The implementation is a Vite/React single-page application. The entry point is `src/main.jsx`; visual styling and responsive behavior are in `src/styles.css`.

### Implemented capabilities

- Create, validate, edit, inline-rename, delete, and undo-delete notes.
- Note descriptions, comma-separated tags, priority rails, and due-date/overdue state.
- Browser-local persistence for notes, Kanban assignments, column collapse state, and theme.
- JSON export and guarded JSON import.
- Drag notes from the source list to columns, between columns, and onto another card to reorder.
- Create/collapse columns, card and column action menus, search/tag filtering, toast feedback, a subtle confirmation sound, dark mode, and responsive styles.
- Multi-stage Docker build that emits a small Nginx-served static site.

## State model

`App` owns a single object: `{ notes, columns, theme }`. Every mutating operation copies the state, applies the scoped change, and the `useEffect` persistence boundary serializes it to `localStorage`. This gives refresh persistence without a server or external dependencies.

## Key implementation paths

| File | Role |
|---|---|
| `src/main.jsx` | UI components, state operations, local persistence, import/export, native DnD, and dialogs. |
| `src/styles.css` | Theme tokens, responsive layout, visual priority/tag states, hover/drop transitions, and modal/toast styling. |
| `Dockerfile` | Node build stage followed by the Nginx runtime image. |
| `package.json` | Development, build, and preview scripts. |

## Data safety behavior

Import verifies basic structural compatibility before replacing notes. Invalid JSON or invalid record structure triggers an error toast without changing stored notes. Deletion holds the removed record in the toast closure so Undo restores it before dismissal.
