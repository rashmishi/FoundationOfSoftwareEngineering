# Notes Kanban — Implementation Record

## Delivered application

The complete React/Vite application is in `src/`. It is a browser-only personal
notes workspace with persistent local storage and a responsive Kanban board.

| File | Delivered responsibility |
| --- | --- |
| `src/main.tsx` | React UI, state mutations, forms, board movement, dialogs, import/export, toasts, preferences, and accessibility behavior. |
| `src/types.ts` | `Note`, `Column`, `AppData`, and `Priority` contracts. |
| `src/storage.ts` | Versioned storage key, safe default data, storage loading/saving, and strict imported-data validation. |
| `src/styles.css` | Responsive visual system, light/dark theme values, focus indicators, priority/tag styling, board layout, and reduced-motion override. |
| `Dockerfile`, `nginx.conf` | Multi-stage production container image and SPA serving configuration. |

## Feature mapping

| Requirement | Implementation |
| --- | --- |
| N-01–N-06 | `NoteForm` trims and requires titles, saves all fields, shows live feedback, provides edit/delete, and persists every mutation. |
| S-01–S-04 | Live search/filter derives visible notes; Blob export produces JSON; file input parses and validates imports. |
| K-01–K-06 | Default columns, add-column form, HTML drag/drop, card reorder, persisted column state, collapsible columns, and keyboard move menu. |
| U-01–U-05 | Focus-revealed icon toolbar, labelled action menu, pausable 10-second undo toast, persisted theme/mute preferences, reduced-motion CSS. |

## Notable behavior

- Data is stored under `notes-kanban:v1`; invalid saved data safely produces an empty default board.
- Import accepts only the documented v1 `AppData` format, preventing malformed data from entering state.
- Dropping outside a column creates no mutation, retaining the source assignment.
- Within a column, dropping a card over another card computes the target insertion order.
- An inline title editor opens from the title button; Enter/blur saves and Escape cancels.
- Delete creates an Undo action that restores an exact note snapshot.

## Accessibility implementation checklist

- Document language and title are set in `index.html`.
- Semantic header/main/section/article structure and labelled headings are used.
- All icon buttons have accessible names; title editing uses a real button.
- Form validation uses required state, `aria-invalid`, associated error text, and alert feedback.
- Dialogs have a programmatic title, focus trap, Escape handling, and opener focus restoration.
- More-actions menus expose state/control linkage, close on Escape, and restore trigger focus.
- Board drag begins with a visible/live status while a keyboard-equivalent Move-to menu remains available.
- Priority and overdue statuses include text, beyond visual decoration.
- Light/dark themes retain keyboard focus indications; reduced motion turns off transitions.

## Build verification

`npm run build` completes successfully and emits the static production bundle to `dist/`.
