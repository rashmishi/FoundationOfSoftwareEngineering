# Architecture & Design — Notes Kanban

| Item | Value |
|---|---|
| Document | 02 — Architecture & Design |
| Version | 1.0 |
| Date | 2026-11-02 |
| Implements | [01-requirements-specification.md](01-requirements-specification.md) |

## 1. Overview

Notes Kanban is a client-only single-page application. All logic runs in the browser; data lives in `localStorage`. The production build is a folder of static files served by nginx from a single Docker image.

```
┌──────────────────────────── Browser ─────────────────────────────┐
│                                                                   │
│  React components (view)  ──dispatch(action)──▶  boardReducer     │
│        ▲                                          (pure, tested)  │
│        │ state                                         │          │
│        └───────────── useBoard hook ◀──────────────────┘          │
│                          │  save on every change                  │
│                          ▼                                        │
│                    storage.ts ──▶ localStorage["notes-kanban:v1"] │
│                                                                   │
│  transfer.ts  ◀── Import (File API)     Export (Blob download) ──▶│
│  settings.ts  ──▶ localStorage["notes-kanban:settings"]           │
│  sound.ts     ──▶ Web Audio API                                   │
└───────────────────────────────────────────────────────────────────┘
                 ▲ static files (HTML, JS, CSS, SVG)
┌────────────────┴──────── Docker image ────────────────────────────┐
│ nginx:alpine  —  /usr/share/nginx/html  —  /healthz  —  CSP       │
└───────────────────────────────────────────────────────────────────┘
```

### 1.1 Key decisions

| # | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| D1 | Client-only SPA, `localStorage` persistence | The brief needs persistence across refresh only, for one user. No server means one tiny image and no data to secure. | REST API + DB: more moving parts, contradicts "single image" simplicity. IndexedDB: async API, unnecessary for < 5 MB of text. |
| D2 | `useReducer` with one pure reducer | All state changes are explicit, serialisable actions; easy to unit-test; Undo is just "dispatch the inverse action". | Redux/Zustand: extra dependency for a small app. |
| D3 | Native HTML5 drag and drop | No dependency; works with Playwright's `dragTo` for end-to-end tests; built-in "drop outside does nothing" semantics. Touch/keyboard users get menu actions instead (FR-4.7). | dnd-kit: heavier, its own a11y layer; we keep the menu fallback either way. |
| D4 | Column membership stored as `column.noteIds[]` | Order within a column is a first-class part of the data, so reordering is a list operation and export preserves it. A note's column is derived. | `note.columnId + note.order`: needs renumbering, two sources of truth for order. |
| D5 | Import **replaces** data, with Undo | An exported file round-trips exactly; no id-collision rules needed. Undo makes the replace safe. | Merge: ambiguous with duplicate ids/titles. |
| D6 | Native `<dialog>` + `showModal()` for modals | Browser-provided focus trap, Escape handling, inert background and top layer. | Custom portal + focus trap: more code, more bugs. |
| D7 | Synthesised sounds (Web Audio oscillators) | No binary assets, no licensing, tiny; CSP-friendly. | Audio files: size, licensing, an extra fetch. |
| D8 | CSS custom properties for theming, `data-theme` on `<html>` | Single stylesheet, instant theme switch with a cross-fade. | CSS-in-JS: runtime cost, conflicts with strict CSP. |
| D9 | nginx:alpine runtime image, multi-stage build | ~50 MB image, battle-tested static server, health endpoint and security headers in config. | Node `serve`: larger image, more attack surface. |

## 2. Technology stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React 19 (function components + hooks) |
| Build / dev server | Vite |
| Unit tests | Vitest (Node environment, pure modules) |
| End-to-end tests | Playwright (Chromium) |
| Runtime server | nginx 1.27 (Alpine) |
| Container | Docker multi-stage build (`node:22-alpine` → `nginx:1.27-alpine`) |

No runtime dependencies besides `react` and `react-dom`.

## 3. Data model

```ts
type Priority = 'none' | 'low' | 'medium' | 'high';

interface Note {
  id: string;            // crypto.randomUUID()
  title: string;         // 1..120 chars, trimmed
  description: string;   // 0..2000 chars
  tags: string[];        // trimmed, unique (case-insensitive)
  priority: Priority;
  dueDate: string | null; // 'YYYY-MM-DD' (local calendar date) or null
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}

interface Column {
  id: string;
  name: string;          // 1..40 chars, unique ignoring case
  collapsed: boolean;
  noteIds: string[];     // ordered, top to bottom
}

interface BoardState {
  notes: Note[];         // newest first (list order)
  columns: Column[];     // left to right
}
```

**Invariants** (enforced by the reducer and by import validation):

1. Note ids are unique; column ids are unique.
2. Every id in any `column.noteIds` refers to an existing note.
3. A note id appears in at most one column, at most once.
4. Column names are unique, ignoring case.

### 3.1 Persistence format

`localStorage["notes-kanban:v1"]` holds the same JSON as an export file (section 3.2). On start-up `storage.load()` parses it with the import validator; if missing it returns the default board (three empty columns), and if invalid it returns the default board plus an error that the UI shows as a toast. The previous corrupt value is copied to `notes-kanban:v1:corrupt` so nothing is silently lost.

`localStorage["notes-kanban:settings"]` holds `{ "theme": "light" | "dark", "sound": boolean }`.

### 3.2 Export file format

```json
{
  "format": "notes-kanban",
  "version": 1,
  "exportedAt": "2026-11-02T10:15:00.000Z",
  "notes": [
    {
      "id": "7c0…", "title": "Write report", "description": "Section 3",
      "tags": ["uni", "writing"], "priority": "high", "dueDate": "2026-11-05",
      "createdAt": "2026-11-01T09:00:00.000Z", "updatedAt": "2026-11-01T09:00:00.000Z"
    }
  ],
  "columns": [
    { "id": "todo", "name": "To do", "collapsed": false, "noteIds": ["7c0…"] }
  ]
}
```

### 3.3 Import validation (`transfer.ts › parseBoardFile`)

```
text ──JSON.parse──▶ value
  ├─ array?           → treat as { notes: value }
  ├─ not an object    → error "File must contain a JSON object"
  ├─ format present and ≠ "notes-kanban" → error
  ├─ notes not array  → error "notes must be an array"
  ├─ for each note i  → validate id (string, non-empty, unique), title (non-blank string ≤120),
  │                     description (string, default ""), tags (string[], default []),
  │                     priority (enum, default "none"), dueDate (YYYY-MM-DD | null),
  │                     createdAt/updatedAt (string, default now)
  ├─ columns absent   → keep current columns, emptied (FR-3.4)
  └─ for each column  → id unique, name non-blank, collapsed boolean (default false),
                        noteIds string[] referencing known notes, no note in two columns
result: { ok: true, state } | { ok: false, error: "notes[2].title must be a non-empty string" }
```

The validator returns the first error found, with a JSON-path-like location so the user can fix the file.

## 4. State management

### 4.1 Reducer actions (`model/boardReducer.ts`)

| Action | Effect | Inverse used by Undo |
|---|---|---|
| `addNote {note}` | Prepend note to `notes`. | `deleteNote` |
| `updateNote {id, changes}` | Merge changes, bump `updatedAt`. | `updateNote` with the previous values |
| `deleteNote {id}` | Remove from `notes` and from its column. | `restoreNote {note, listIndex, columnId, beforeId}` |
| `restoreNote {…}` | Re-insert a deleted note at its old list position and column position. | — |
| `duplicateNote {id, newId, now}` | Insert a copy "(copy)" after the original, in the same column. | `deleteNote` |
| `moveNote {id, columnId \| null, beforeId \| null}` | Remove from current column; insert into target column before `beforeId` (or at end). `columnId: null` removes it from the board. | `moveNote` back to the old column / old `beforeId` |
| `addColumn {column}` | Append column. | `deleteColumn` |
| `renameColumn {id, name}` | Rename. | `renameColumn` old name |
| `toggleColumn {id}` | Flip `collapsed`. | itself |
| `moveColumn {id, offset}` | Swap with neighbour (−1 / +1). | `moveColumn` −offset |
| `deleteColumn {id}` | Remove column; its notes become unassigned. | `restoreColumn {column, index}` |
| `restoreColumn {column, index}` | Re-insert column (with its `noteIds`) at index, taking those notes out of any other column. | — |
| `replace {state}` | Replace whole state (import). | `replace` with previous state |

Positions are expressed as **`beforeId`** (the id of the note the moved note is placed in front of) rather than numeric indices. This stays correct when the board is filtered (hidden cards don't shift indices) and makes Undo precise even if other notes were added meanwhile.

The reducer never throws: an action that refers to a missing note/column returns the state unchanged.

### 4.2 `useBoard` hook

```ts
const { state, dispatch, loadError } = useBoard();
```

- Lazily initialises from `storage.load()`.
- `useEffect` on `state` → `storage.save(state)`; on failure calls `onSaveError` (toast).
- Exposes helpers (`noteColumn(id)`, `columnById`) computed with `useMemo`.

### 4.3 Undo

Each user action in `App` is wrapped by a `perform(action, {message, inverse})` helper that dispatches the action, plays a sound and shows a toast whose **Undo** button dispatches `inverse`. Because inverses are targeted actions (not snapshots), undoing a deletion does not wipe out unrelated changes made after it. Import is the exception: its inverse is `replace` with the pre-import snapshot.

## 5. Component architecture

```
<App>
 ├─ <ToastProvider>                       toasts context + <ToastViewport>
 ├─ <Header>                            Import (hidden file input) / Export,
 │                                        sound toggle, dark-mode toggle
 ├─ <FilterBar>                           search, tag, priority, due, clear
 ├─ <main>
 │   ├─ <aside> NoteForm + NoteList
 │   │    <NoteForm> → <NoteFields>
 │   │    <NoteList> → <NoteCard context="list">*
 │   └─ <Board>
 │        <Column>* → <ColumnHeader (InlineEdit, Menu)> → <NoteCard context="board">*
 │        <AddColumnForm>
 ├─ <EditNoteDialog>   (Modal)  → <NoteFields>
 └─ <ConfirmDialog>    (Modal)
```

| Component | Responsibility |
|---|---|
| `App` | Owns `useBoard`, settings, filter state, dialog state; defines user-level commands (`createNote`, `deleteNote`, `moveNote`…) that dispatch + toast + sound. Passes commands down through an `Actions` context so cards don't need prop drilling. |
| `Header` | Title, Import (hidden `<input type=file>`), Export, sound and dark-mode toggles (`aria-pressed`). |
| `FilterBar` | Search box and tag / priority / due selects; Clear button. |
| `NoteForm` | Controlled form, validation, calls `createNote`. |
| `NoteFields` | Shared inputs (title, description, tags + preview, priority, due date) for create and edit. |
| `NoteList` | Renders filtered notes, count, empty state. |
| `NoteCard` | Draggable card: priority border, `InlineEdit` title, description, `TagList`, `PriorityBadge`, `DueBadge`, column badge (list), hover toolbar (Edit / Delete / More). |
| `Board` / `Column` | Columns, drop zones, insertion indicator, collapsed strip, column menu, counts. |
| `AddColumnForm` | Name input + validation. |
| `Modal` | Wrapper around `<dialog>`: opens with `showModal()`, closes on Escape/backdrop, restores focus. |
| `EditNoteDialog` / `ConfirmDialog` | Built on `Modal`. |
| `Menu` | Button + popup `role="menu"`, keyboard navigation, rendered in a portal with `position: fixed` so it is never clipped by scrolling columns. |
| `InlineEdit` | Text that turns into an input on double-click/F2; Enter/blur commit, Escape cancel. |
| `ToastProvider` | Queue (max 4), timers that pause on hover/focus, `role="status"`/`"alert"`. |
| `Icons` | Inline SVG icon set (no icon font, CSP-friendly). |

## 6. Drag and drop design (`lib/dnd.ts`, `Column`)

1. **dragstart** on a card: `dataTransfer.setData('application/x-note-id', id)` and `text/plain` fallback; `effectAllowed = 'move'`; the id is also kept in a module variable (`dataTransfer.getData` is not readable during `dragover`). The card gets `.is-dragging` (opacity 0.4, rotate 2°, scale .98) and `body.is-dragging-note` is set so drop zones show hint outlines.
2. **dragover** on a column body: if the drag carries a note id, `preventDefault()` (marks it a valid target), set `dropEffect = 'move'`, add `.is-drop-target` (glow). The insertion point is the first visible card whose vertical midpoint is below the pointer → `beforeId` (or `null` = end). An insertion line is rendered at that point.
3. **dragleave**: clear highlight when the pointer leaves the column (checks `relatedTarget` is outside).
4. **drop**: read id, dispatch `moveNote {id, columnId, beforeId}` via `moveNote` command (toast + Undo + sound). Dropping a note onto its own position is a no-op (no toast).
5. **dragend**: always clears drag classes. If the drop happened outside a column, no action was dispatched, so the note stays where it was (FR-4.5).

Collapsed columns are drop targets too (append at end).

## 7. Search and filter (`model/filter.ts`)

```ts
interface Filters { query: string; tag: string | ''; priority: Priority | ''; due: 'any'|'overdue'|'today'|'week'|'none' }
matches(note, filters, today, isDone): boolean
```

The query is split into words; every word must appear in title, description or a tag (case-insensitive). The filter is applied in render (`useMemo`) to both the list and each column. Filter state is not persisted (a fresh load shows everything).

## 8. Due dates (`model/dates.ts`)

`todayISO()` returns the local calendar date (`YYYY-MM-DD`), so comparisons are plain string comparisons and are not affected by time zones. `dueStatus(dueDate, today)` → `'overdue' | 'today' | 'soon' (≤ 7 days) | 'later' | null`. Notes in a column named "Done" (case-insensitive) are treated as complete and not flagged overdue.

## 9. Colours (`model/colors.ts`)

- Priority → CSS class `priority-{level}` mapped to theme variables.
- Tag → `tag-color-{0..7}` from a 32-bit FNV-1a hash of the lower-cased tag. The 8 palette entries have light and dark variants, each with ≥ 4.5:1 text contrast.

Classes rather than inline colours keep the strict CSP (`style-src 'self'`) simple.

## 10. Settings, theme and sound

- `lib/settings.ts`: load/save `{theme, sound}`; first theme from `matchMedia('(prefers-color-scheme: dark)')`.
- `main.tsx` applies `data-theme` before the first render to avoid a flash. During a toggle, `html.theme-transition` is added for 300 ms so colours cross-fade.
- `lib/sound.ts`: lazily creates one `AudioContext` on the first sound request (which always comes from a user gesture). Each effect is a short envelope on one or two oscillators (e.g. *create*: rising two-note chime; *delete*: falling tone; *drop*: soft click; *error*: low buzz; *undo*: quick reverse chime). Muted → no-op.

## 11. Animations

CSS only: `@keyframes card-in` (fade + 6 px slide) on new cards, `toast-in/out`, dialog `fade/scale` via `dialog[open]` + `@starting-style`, column width transition on collapse, drop-target glow, toolbar fade. A global `@media (prefers-reduced-motion: reduce)` sets durations to ~0.

## 12. Layout and responsiveness

CSS grid: `header` on top; below, `aside` (360 px) + board (flex row, horizontal scroll). Under 900 px the aside stacks above the board. Columns are 280 px wide (collapsed: 48 px).

## 13. Security

- All user and imported text is rendered via React text nodes (auto-escaped); no `dangerouslySetInnerHTML`.
- Import size limit 5 MB; strict schema validation.
- nginx sends `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- The container runs nginx's stock config with only static files; no secrets.

## 14. Deployment architecture

```
Dockerfile
 ├─ stage "build"   node:22-alpine
 │    npm ci → vitest run (fails build on test failure) → vite build → /app/dist
 └─ stage runtime   nginx:1.27-alpine
      COPY nginx.conf → /etc/nginx/conf.d/default.conf
      COPY dist      → /usr/share/nginx/html
      EXPOSE 80, HEALTHCHECK wget /healthz
```

Run anywhere with `docker run -d -p 8080:80 notes-kanban`. Remote hosts receive the image via a registry or `docker save | ssh host docker load`.

## 15. Source layout

```
experiment-1/
├─ Dockerfile, docker-compose.yml, nginx.conf, .dockerignore
├─ index.html, vite.config.ts, tsconfig.json, playwright.config.ts, package.json
├─ public/favicon.svg
├─ examples/sample-notes.json, examples/invalid-notes.json
├─ docs/00…04
├─ e2e/        Playwright specs (stories.spec.ts, features.spec.ts, helpers.ts)
└─ src/
   ├─ main.tsx, App.tsx, styles.css, types.ts
   ├─ model/   notes.ts, boardReducer.ts, transfer.ts, storage.ts, filter.ts, dates.ts, colors.ts  (+ *.test.ts)
   ├─ lib/     dnd.ts, sound.ts, settings.ts, download.ts
   ├─ hooks/   useBoard.ts
   └─ components/  Header, FilterBar, NoteForm, NoteFields, NoteList, NoteCard,
                   Board, Column, AddColumnForm, Modal, EditNoteDialog, ConfirmDialog,
                   Menu, InlineEdit, Toasts, Badges, Icons, Highlight, ActionsContext
```
