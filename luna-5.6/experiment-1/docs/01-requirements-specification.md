# Requirements Specification — Shelf Notes

## Product goal
Shelf Notes is a browser-based personal note workspace. A user can capture, organize, search, move, and transport notes without an account or network dependency.

## Functional requirements

1. Notes support a required title, optional description, one or more comma-separated tags, priority, due date, and board column.
2. Notes can be created, edited, deleted, and restored immediately through an Undo toast.
3. The board displays all notes by column. Notes are draggable between columns; dropping outside a column preserves the original assignment.
4. Columns can be added and collapsed.
5. Search and priority filtering update results live.
6. Notes can be exported as valid JSON and imported from a prior export. Invalid files are rejected with an error toast.
7. Notes, columns, and theme preference persist across refreshes using browser localStorage.
8. The interface provides hover actions, due-date/overdue states, responsive layout, dark mode, animations, and accessible labels/tooltips.

## Non-functional requirements

- Works in current evergreen browsers with JavaScript enabled.
- No server-side persistence is required for the initial release.
- A single Docker image serves the production static bundle.
- Required title validation prevents incomplete notes from being saved.
