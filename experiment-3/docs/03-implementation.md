# Implementation Overview — Notes & Kanban Web Application

| Item | Value |
|---|---|
| Document | 03 — Implementation overview |
| Version | 1.0 |
| Date | 2026-10-31 |
| Status | Implementation accepted by accessibility review (2026-10-31) |

The complete implementation is the source code in this repository. This document is a guide to it.

## 1. Technology

React 18, TypeScript (strict), Vite 5, `@dnd-kit/core` (pointer and touch dragging only), Vitest with Testing Library and axe-core, nginx in a single Docker image. See document 02 for the reasons.

## 2. Where each requirement is implemented

| Requirement | Files |
|---|---|
| FR-1 Create note | `src/components/NoteForm.tsx`, `NoteFields.tsx`, `FieldError.tsx`, `useFieldErrorFocus.ts`; `src/model/reducer.ts` (`addNote`), `tags.ts` |
| FR-2 List, edit, delete | `src/components/NotesList.tsx`, `NoteCard.tsx`, `ConfirmDialog.tsx`, `focusTargets.ts`; `src/state/EditingContext.tsx` |
| FR-3 Persistence | `src/model/storage.ts`; `src/state/StoreContext.tsx` |
| FR-4 Export / import | `src/components/ImportExport.tsx`; `src/model/importExport.ts` |
| FR-5 Drag notes onto the board | `src/App.tsx` (`DndContext`, drop handling), `src/components/DragHandle.tsx`, `BoardColumn.tsx`, `ColumnMover.tsx`; `src/state/KeyboardDragContext.tsx` |
| FR-6 Columns, move between columns | `src/components/Board.tsx`, `AddColumnForm.tsx`; `src/model/reducer.ts` (`MOVE_NOTE`, `ADD_COLUMN`, `resolveDrop`) |
| FR-7 Browser access, Docker | `index.html`, `Dockerfile`, `nginx.conf`, `docker-compose.yml` |
| FR-G Focus and announcements | `src/state/FocusContext.tsx`, `src/state/AnnouncerContext.tsx`, `src/components/StatusBar.tsx` |
| AR-* Visual accessibility | `src/styles.css` (tokens, focus, reflow, forced colors, reduced motion) |

## 3. Changes made during implementation

| Change | Reason |
|---|---|
| The confirmation dialog finishes synchronously on its buttons and on Escape; the `close` event is only a fallback. | Chrome deferred the `close` event during testing, so the dialog stayed open. |
| Dismissing a message moves focus to the "Create note" heading. | The Dismiss button disappears with its message; focus must not fall back to `<body>`. |
| `newId()` falls back to `crypto.getRandomValues()`. | `crypto.randomUUID()` does not exist on plain-HTTP remote deployments. |

## 4. Verification summary

- 44 automated tests pass (`npx vitest run`), including axe-core checks in three UI states.
- axe-core in Chrome (with colour contrast), light and dark schemes: 0 violations.
- 320 px viewport: no horizontal scrolling.
- Pointer drag, drop outside a column, dialog focus and Escape, and persistence after reload were checked in Chrome against the Docker image.
