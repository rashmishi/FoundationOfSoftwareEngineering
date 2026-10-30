# 3. Implementation — Notes Kanban

The complete source code is in this repository. This document maps it to the design (`02-architecture-and-design.md`) and records implementation notes.

## 3.1 Stack as built

| Package | Version |
|---|---|
| react / react-dom | 19.3 |
| typescript | 7.0 (strict) |
| vite / @vitejs/plugin-react | 8.3 / 6.1 |
| vitest / jsdom | 5.0 / 30.1 |
| @testing-library/react, user-event, jest-dom | 16.3, 14.6, 7.0 |

Runtime dependencies: **react and react-dom only.** Production bundle: 236 kB JS (73 kB gzipped), 6 kB CSS.

## 3.2 Source map

| File | Responsibility | Requirements |
|---|---|---|
| `src/types.ts` | `Note`, `Column`, `AppState`, `ExportFile`, field limits | §1.7 |
| `src/state/notesReducer.ts` | Pure reducer (`addNote`, `updateNote`, `deleteNote`, `moveNote`, `addColumn`, `importData`), `parseTags`, `validateTitle`, `validateColumnName`, `mergeImport`, default columns | FR-1, FR-2, FR-4.3, FR-5 |
| `src/state/storage.ts` | `loadState` / `saveState` with schema validation and safe fallback | FR-1.5, FR-2.5, FR-3.4, FR-4.4, NFR-1 |
| `src/state/importExport.ts` | `buildExport`, `downloadExport`, `parseImport` (strict validation with path-specific messages), `ImportError` | FR-3 |
| `src/state/NotesContext.tsx` | `NotesProvider`: `useReducer`, save-on-change effect, status announcements | — |
| `src/dnd.ts` | Custom drag MIME type and helpers | FR-4 |
| `src/components/NoteForm.tsx` | Create/edit form, inline title validation, focus management | FR-1.1–1.3, FR-2.3 |
| `src/components/NoteList.tsx`, `NoteItem.tsx` | List, view/edit/delete, draggable items, column badge | FR-2, FR-4.1 |
| `src/components/useNoteDrag.ts` | Shared drag-source behaviour + `is-dragging` state | FR-4.2 |
| `src/components/KanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx` | Board, drop targets with highlight, draggable cards | FR-4, FR-5.2 |
| `src/components/AddColumnForm.tsx` | New-column form with validation | FR-5.1 |
| `src/components/MoveToColumn.tsx` | Labelled `<select>` alternative to dragging | NFR-2 (WCAG 2.5.7) |
| `src/components/ImportExport.tsx` | Export button, import file picker, error reporting | FR-3 |
| `src/components/StatusMessage.tsx` | Persistent `role=status` / `role=alert` live regions | FR-1.4, FR-3.3 |
| `src/App.tsx`, `src/main.tsx`, `src/styles.css` | Layout, landmarks, skip link, theme tokens (light/dark) | FR-6, NFR-2, NFR-3 |
| `Dockerfile`, `nginx.conf`, `docker-compose.yml` | Single-image build and serving | FR-7 |

## 3.3 Implementation notes

- **Persistence** — `NotesProvider` lazily initialises the reducer from `loadState()` and writes the whole state after every change. A failed write (quota, disabled storage) shows an error alert instead of crashing.
- **Drop outside a column (FR-4.5)** — only `KanbanColumn` calls `preventDefault()` on `dragover`/`dragenter`, and only when the drag carries the app's MIME type. Everywhere else the browser refuses the drop, so no state change can happen.
- **Highlight flicker** — `dragenter`/`dragleave` fire for each child element; the column keeps an enter/leave depth counter and removes the highlight only when it reaches zero.
- **Editing vs dragging** — a list item is not draggable while in edit mode, so text selection in its inputs works normally.
- **Accessible names** — Edit/Delete buttons carry `aria-label="Edit “<title>”"` so that every button has a unique name; the visible word is the start of the name (WCAG 2.5.3 Label in Name).
- **Focus management** — failed submit → first invalid field; enter edit → title input; save/cancel → the note's Edit button; delete → “All notes” heading.
- **Import is atomic** — `parseImport` validates the whole file before any dispatch; on error nothing changes.
- **Rendering safety** — all user content is rendered as React text nodes (no `dangerouslySetInnerHTML`), so imported files cannot inject markup. The nginx CSP additionally blocks inline and third-party scripts.
