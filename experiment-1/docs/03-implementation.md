# Implementation — Notes Kanban

| Item | Value |
|---|---|
| Document | 03 — Implementation |
| Version | 1.0 |
| Date | 2026-11-02 |
| Design | [02-architecture-and-design.md](02-architecture-and-design.md) |

The complete source is in this folder (`experiment-1/`). This document is a guided tour: where each requirement lives, the non-obvious decisions made while coding, and deviations from the design.

## 1. Project setup

| File | Purpose |
|---|---|
| `package.json` | Scripts: `dev`, `build` (type-check + Vite build), `preview`, `test` (Vitest), `test:e2e` (Playwright). Runtime deps: `react`, `react-dom` only. |
| `tsconfig.json` | Strict TypeScript, `noUnusedLocals/Parameters`, bundler module resolution. Unit tests are excluded from the app type-check. |
| `vite.config.ts` | React plugin; Vitest picks up `src/**/*.test.ts`. |
| `playwright.config.ts` | Builds and serves the production bundle on port 4173, or tests any running deployment when `BASE_URL` is set. |
| `index.html` | Shell with `color-scheme` meta and favicon; no inline script (CSP-safe). |

## 2. Source map

```
src/
├─ main.tsx              applies the saved theme, mounts <App/> in StrictMode
├─ App.tsx               state owner + every user command (create, edit, move, undo…)
├─ types.ts              Note, Column, BoardState, Priority
├─ styles.css            theme tokens, layout, components, animations
├─ model/                pure, framework-free logic (all unit-tested)
│  ├─ notes.ts           factories, validation, tag parsing, default board
│  ├─ boardReducer.ts    every state transition + notePosition() for Undo
│  ├─ transfer.ts        export format, import validation
│  ├─ storage.ts         localStorage load/save with corruption handling
│  ├─ filter.ts          search + filter predicate
│  ├─ dates.ts           local-date helpers, due status
│  └─ colors.ts          stable tag colour hash
├─ lib/                  browser services
│  ├─ dnd.ts             HTML5 drag-and-drop helpers, insertion point
│  ├─ sound.ts           Web Audio sound effects
│  ├─ settings.ts        theme + sound preferences
│  └─ download.ts        Blob download
├─ hooks/useBoard.ts     reducer + persistence
└─ components/           React views (see design doc §5)
```

## 3. Requirement → code

| Requirement | Where | Notes |
|---|---|---|
| FR-1.1 form fields | `NoteFields.tsx` | Shared by `NoteForm` and `EditNoteDialog`. Tags typed as comma-separated text with a live coloured preview. |
| FR-1.2/1.5 create & tags | `notes.ts › createNote, parseTags` | Trims all text, de-duplicates tags case-insensitively. |
| FR-1.3 blank title | `NoteForm.tsx › submit`, `validateDraft` | Sets `aria-invalid`, shows `role="alert"` message, refocuses the title field. Form uses `noValidate` so our message (not the browser bubble) is shown. |
| FR-1.4 confirmation | `App.tsx › createNoteCommand` | Toast “Note “X” created.” in a `role="status"` live region. |
| FR-1.6 persistence | `useBoard.ts`, `storage.ts` | Saves after every state change (skipping the initial load). |
| FR-2.1 list | `NoteList.tsx`, `NoteCard.tsx` | Shows the column name badge, or “Not on board”. |
| FR-2.3 edit | `EditNoteDialog.tsx`, reducer `updateNote` | Reducer refuses to blank a title even if called directly. |
| FR-2.4 delete | `ConfirmDialog.tsx`, reducer `deleteNote` | Removes the id from its column as well. |
| FR-3.1 export | `transfer.ts › serialise`, `download.ts` | Pretty-printed JSON, `notes-YYYY-MM-DD.json`. |
| FR-3.2–3.5 import | `transfer.ts › parseBoardFile`, `App.tsx › importNotes` | Validates fully before touching state; error toast names the exact field. |
| FR-4.2–4.5 drag & drop | `dnd.ts`, `NoteCard.tsx`, `Column.tsx` | See §4. |
| FR-4.7 keyboard alternative | `NoteCard.tsx` menu | Move to → column, Move up/down, Remove from board. |
| FR-5.1 add column | `AddColumnForm.tsx`, `validateColumnName` | Unique, case-insensitive. |
| FR-5.3/5.4 column menu | `Column.tsx` | Delete keeps notes (they become unassigned) and offers Undo. |
| FR-7 Docker | `Dockerfile`, `nginx.conf`, `docker-compose.yml` | See doc 04. |
| AF-1 colours | `colors.ts`, `.priority-*`, `.tag-color-*` | Classes, not inline colours. |
| AF-2 toasts + Undo | `Toasts.tsx`, `App.tsx` | Timer pauses on hover/focus; progress bar; inverse actions. |
| AF-3 modals | `Modal.tsx` | Native `<dialog>.showModal()`; Escape → `onCancel`; backdrop click closes. |
| AF-4 reorder | `Column.tsx › onDrop`, reducer `moveNote` | Same-column move = reorder. |
| AF-5 hover toolbar | `NoteCard.tsx`, `.note-toolbar` CSS | Visible on `:hover`, `:focus-within`, while its menu is open, and always on touch screens. |
| AF-6 inline title | `InlineEdit.tsx` | Double-click / F2 / menu “Rename”; card stops being draggable while editing so text can be selected. |
| AF-7 menus | `Menu.tsx` | Portal + `position: fixed`; arrow keys, Home/End, Escape, Tab; follows its button on scroll. |
| AF-8 search/filter | `filter.ts`, `FilterBar.tsx`, `Highlight.tsx` | Live, AND-combined, matches highlighted with `<mark>`. |
| AF-9 due dates | `dates.ts`, `Badges.tsx › DueBadge` | Overdue/today/soon; notes in “Done” are never overdue. |
| AF-10 collapse | `Column.tsx` collapsed branch | Still a drop target; state persisted with the column. |
| AF-11 animations | `styles.css` keyframes, `@starting-style` for the dialog | Disabled under `prefers-reduced-motion`. |
| AF-12 sounds | `sound.ts` | Synthesised; one lazily created `AudioContext`. |
| AF-13 dark mode | `settings.ts`, `Header.tsx`, `[data-theme]` tokens | Cross-fade via a temporary `.theme-transition` class. |

## 4. Drag and drop details

- `startNoteDrag` stores the id in `dataTransfer` **and** in a module variable, because browsers hide `getData()` during `dragover`.
- The insertion point is computed by `beforeIdAt(columnBody, clientY, draggedId)`: the first visible card whose midpoint is below the pointer. The dragged card itself is ignored, so dropping a card “on itself” is a no-op.
- The insertion line is drawn with a `::before` pseudo-element on the target card (or `::after` on the list for “end”) so it never shifts the layout while dragging — shifting would move midpoints and make the indicator flicker.
- The drop position is **recomputed in `drop`** from the event coordinates instead of trusting the last `dragover` state, which may lag a frame behind.
- The dimmed/tilted style is applied one animation frame after `dragstart` so the browser's drag image is a normal-looking card. A ref keeps the frame id so `dragend` can cancel it: a very fast drag (found by the e2e tests) otherwise left the card stuck in the dragging style.
- Toasts ignore pointer events during a drag so a note can be dropped on a column that lies under a toast.
- Dropping outside any column dispatches nothing, so the note stays where it was (FR-4.5).

## 5. Undo

Each command in `App.tsx` captures what it needs **before** dispatching (e.g. the deleted note, its list index and its `notePosition`) and passes an inverse action to the toast. Commands read state through `stateRef` so callbacks created earlier (like a toast's Undo) never act on a stale snapshot. Positions use `beforeId` rather than indices, so an Undo still lands in the right place after unrelated notes were added or the board was filtered.

## 6. Defensive behaviour

- `loadBoard` validates stored data with the same validator as import. Corrupt data is copied to `notes-kanban:v1:corrupt`, the default board is used, and an error toast explains what happened.
- `saveBoard` returns `false` on quota/disabled storage and the app shows an error toast instead of failing silently.
- The reducer ignores actions that refer to unknown ids, and `restoreColumn` re-validates note ids.
- Audio failures are swallowed — sound is never allowed to break an action.

## 7. Deviations from the design

| Design | Implementation | Reason |
|---|---|---|
| Separate `ImportExport` and `ThemeToggle` components | Folded into `Header` | Each was ~10 lines; one component is simpler to read. |
| Menu closes on scroll | Menu follows its button on scroll | A scroll that brought the button into view could deliver its event just after the menu opened and close it immediately (found by the e2e tests). |

## 8. Sizes

Production build (gzip): 81 kB JS + 4.5 kB CSS + 0.4 kB HTML — within NFR-1 (150 kB). See `npm run build` output.
