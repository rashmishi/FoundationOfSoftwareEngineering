# 2. Architecture & Design — Notes Kanban

Companion to `01-requirements-specification.md`. Requirement IDs (FR-x / NFR-x) are referenced throughout.

## 2.1 Architectural overview

Notes Kanban is a **static single-page application**. There is no backend: all state lives in the browser and is persisted to `localStorage` (NFR-1). The build output (HTML, JS, CSS) is served by nginx inside a single Docker image (FR-7).

```
┌──────────────────────────── Docker image (nginx-unprivileged, :8080) ───┐
│  /            → index.html  (SPA)                                        │
│  /assets/*    → hashed JS/CSS, cached 1 year                             │
│  /healthz     → 200 "ok"                                                 │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP
┌───────────────────────────────────▼──── Browser ────────────────────────┐
│  React UI components                                                    │
│      │ dispatch(action)            ▲ state                              │
│      ▼                             │                                    │
│  useNotesStore (useReducer) ── notesReducer (pure)                      │
│      │ on every state change                                            │
│      ▼                                                                  │
│  storage.ts ──► localStorage["notes-kanban:v1"]                         │
│                                                                         │
│  importExport.ts ◄──► File (download / <input type=file>)               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| UI | React 19 + TypeScript (strict) | Requested; types guard the data model (NFR-6). |
| Build | Vite | Fast dev server, small optimised static bundle (NFR-4). |
| State | `useReducer` + Context | State is small and local; a pure reducer is trivially unit-testable. No external state library needed. |
| Persistence | `localStorage` | Synchronous, survives refresh, no server needed. |
| Drag and drop | Native HTML5 Drag and Drop API | Zero dependencies, works on desktop browsers. Paired with a non-drag alternative for accessibility (NFR-2). |
| Styling | Plain CSS with custom properties | No runtime cost, supports light/dark via `prefers-color-scheme`. |
| Tests | Vitest + React Testing Library + jsdom | Same toolchain as Vite; tests drive the UI the way users do (by role and label). |
| Serving | `nginxinc/nginx-unprivileged` (Alpine) | Tiny, production-grade static server; runs as non-root (NFR-5). |

## 2.2 Module structure

```
src/
├── main.tsx                 Entry point; mounts <App/> inside <NotesProvider/>
├── App.tsx                  Page layout: header, note panel, board, status region
├── types.ts                 Note, Column, AppState, ExportFile types
├── state/
│   ├── notesReducer.ts      Pure reducer + action types + helpers (parseTags, validation)
│   ├── storage.ts           loadState()/saveState() with schema validation & fallback
│   ├── importExport.ts      buildExport(), parseImport() (validation), mergeImport()
│   └── NotesContext.tsx     Provider: useReducer, persistence effect, status messages
├── components/
│   ├── NoteForm.tsx         Create / edit form (shared), inline validation
│   ├── NoteList.tsx         List of all notes
│   ├── NoteItem.tsx         One note: view mode, edit mode, delete, move-to select, draggable
│   ├── ImportExport.tsx     Export button, import file picker
│   ├── KanbanBoard.tsx      Columns + add-column form
│   ├── KanbanColumn.tsx     Drop target
│   ├── KanbanCard.tsx       Draggable card
│   ├── MoveToColumn.tsx     Accessible <select> alternative to dragging
│   └── StatusMessage.tsx    aria-live polite/assertive regions
├── dnd.ts                   Drag payload MIME type + helpers
└── styles.css
```

Dependency rule: `components → state → types`. `state/*` never imports React components; reducer, storage and import/export are pure TypeScript and are unit-tested in isolation.

## 2.3 Data model

```ts
interface Note {
  id: string;            // crypto.randomUUID()
  title: string;
  description: string;
  tags: string[];
  columnId: string | null;   // null = unassigned
  createdAt: string;         // ISO-8601
  updatedAt: string;
}
interface Column { id: string; name: string }
interface AppState { notes: Note[]; columns: Column[] }
```

Assignment is stored **on the note** (`columnId`) rather than as a list of note ids on each column. This makes “a note is in at most one column” structurally guaranteed and makes moves a single-field update (FR-4.3, FR-5.2).

Persisted envelope: `localStorage["notes-kanban:v1"] = { version: 1, notes, columns }`. The `version` field allows future migrations.

## 2.4 State management

### Actions

| Action | Payload | Effect | Requirement |
|---|---|---|---|
| `addNote` | `{ title, description, tags }` | Appends a new note (validated). | FR-1 |
| `updateNote` | `{ id, title, description, tags }` | Replaces fields, bumps `updatedAt`. | FR-2.3 |
| `deleteNote` | `{ id }` | Removes note. | FR-2.4 |
| `moveNote` | `{ id, columnId \| null }` | Sets `columnId`. No-op if unchanged or target column missing. | FR-4.3, FR-5.2 |
| `addColumn` | `{ name }` | Appends column with generated id. | FR-5.1 |
| `importData` | `{ notes, columns }` | Merges by id (see 2.6). | FR-3.2 |

Validation (title required, column name required) is performed in the UI *before* dispatch so the user gets inline errors, and again defensively in the reducer (invalid actions return the unchanged state).

### Persistence flow

1. On start, `loadState()` reads and validates the stored envelope. Missing → default state (three columns, no notes). Corrupt/invalid → default state + `console.warn` (NFR-1).
2. A `useEffect` in `NotesProvider` calls `saveState(state)` whenever `state` changes. Writes are wrapped in `try/catch` (quota exceeded, private mode) and surface an error message instead of crashing.

### Status messages

`NotesProvider` also holds a transient `status: { kind: 'success' | 'error', text }`. Components call `announce()` after actions (“Note “X” created”, “Import failed: …”). `StatusMessage` renders success in a `role="status"` (polite) region and errors in `role="alert"` (assertive) (FR-1.4, FR-3.3, NFR-2).

## 2.5 Drag and drop design

```
NoteItem / KanbanCard (draggable=true)
   dragstart → dataTransfer.setData("application/x-note-id", id)
             → add .is-dragging (dimmed + dashed outline)       FR-4.2
   dragend   → remove .is-dragging

KanbanColumn (drop target)
   dragenter/dragover (if payload type present) → preventDefault, add .is-drop-target   FR-4.2
   dragleave → remove highlight (only when leaving the column itself)
   drop      → read id → dispatch moveNote(id, column.id)           FR-4.1, FR-4.3, FR-5.2
```

- **Drop outside a column (FR-4.5):** only columns call `preventDefault()` on `dragover`, so the browser rejects the drop everywhere else; no action is dispatched and `columnId` is unchanged.
- A custom MIME type ensures that random text or files dragged into the page are ignored.
- **Accessible alternative (NFR-2, WCAG 2.5.7):** each note in the list and each card on the board has a labelled `<select>` “Move to column” listing “Unassigned” plus every column. Choosing a value dispatches the same `moveNote` action, so keyboard, switch and screen-reader users have full parity with drag users. The result is announced via the status region.

## 2.6 Import / export design

**Export (FR-3.1):** `buildExport(state)` → `{ app: "notes-kanban", version: 1, exportedAt, columns, notes }`, serialised with `JSON.stringify(…, null, 2)`, wrapped in a `Blob` (`application/json`), downloaded via a temporary object URL and `<a download="notes-YYYY-MM-DD.json">`.

**Import (FR-3.2, FR-3.3):** `<input type="file" accept="application/json,.json">` → `file.text()` → `parseImport(text)`:

1. `JSON.parse` — failure → `ImportError("File is not valid JSON")`.
2. Root must be an object with `app === "notes-kanban"`, `version === 1`, `notes` array, `columns` array.
3. Each note is validated field by field (types, non-empty title, unique ids); the first failure is reported with its index, e.g. `notes[3].title must be a non-empty string`.
4. Each column validated the same way.

On success `mergeImport(state, data)`:

- columns: existing columns kept in order; imported columns with an existing id replace the name; new ones appended.
- notes: imported notes replace same-id notes, new ones appended.
- any imported note whose `columnId` is not a known column after merging is set to `null` (defensive).

Validation is all-or-nothing: if any record is invalid, nothing is imported.

## 2.7 UI design

Layout (desktop ≥ 900 px: two columns; narrow: stacked):

```
┌ header: "Notes Kanban" ─────────────── [Export JSON] [Import JSON] ┐
├ status region (success / error) ───────────────────────────────────┤
│ ┌ Notes (aside) ───────────┐ ┌ Board (main) ──────────────────────┐ │
│ │ New note form            │ │ [To Do] [In Progress] [Done] [...] │ │
│ │  Title*  Description     │ │  cards     cards        cards      │ │
│ │  Tags (comma-separated)  │ │                                     │ │
│ │ [Add note]               │ │ Add column: [name____] [Add]        │ │
│ │ ─ All notes (n) ─        │ └─────────────────────────────────────┘ │
│ │  title / desc / #tags    │                                         │
│ │  [Edit][Delete][Move ▾]  │                                         │
│ └──────────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘
```

Accessibility details (NFR-2):

- Landmarks: `header`, `aside` (“Notes”), `main` (“Kanban board”); one `h1`, sections use `h2`, columns `h3`.
- Forms use visible `<label>`s; required fields marked with `aria-required`; errors linked via `aria-describedby` and `aria-invalid`; on failed submit, focus moves to the first invalid field.
- Edit mode moves focus to the title input; save/cancel returns focus to the note's Edit button.
- After delete, focus moves to the list heading so keyboard users are not lost.
- Focus ring: 3 px outline using a high-contrast token; all colours checked ≥ 4.5:1 in light and dark schemes.
- Columns are `section`s labelled by their heading and list their cards in a `<ul>` with a count.
- Motion: highlight transitions respect `prefers-reduced-motion`.

## 2.8 Deployment architecture

Multi-stage `Dockerfile`:

1. **build** stage — `node:22-alpine`: `npm ci`, `npm test`, `npm run build` → `/app/dist`. Tests run during the build so a broken build cannot produce an image.
2. **runtime** stage — `nginxinc/nginx-unprivileged:1.27-alpine`: copies `dist/` and `nginx.conf`. Listens on **8080** as UID 101. `HEALTHCHECK` hits `/healthz`.

`nginx.conf`: SPA fallback (`try_files $uri /index.html`), long-term caching for hashed `/assets/`, `no-cache` for `index.html`, gzip, security headers (`X-Content-Type-Options`, `Referrer-Policy`, a strict `Content-Security-Policy` — the app makes no external requests).

The same image runs locally (`docker run -p 8080:8080`) or on any remote Docker host / registry / Kubernetes cluster (FR-7.2). Because data lives in the browser, the container is stateless and needs no volumes.

## 2.9 Risks and decisions log

| Decision / risk | Notes |
|---|---|
| HTML5 DnD has no touch support on some mobile browsers | Mitigated by the “Move to column” selector, which works everywhere. |
| `localStorage` is per-browser and ~5 MB | Export/import provides backup and transfer. Save failures are reported to the user. |
| Merge-on-import vs replace | Merge chosen to prevent accidental loss; documented in UI help text. |
| No card ordering within a column | Out of scope for v1; cards sorted by `updatedAt` descending is *not* used — cards keep creation order for stability. |
