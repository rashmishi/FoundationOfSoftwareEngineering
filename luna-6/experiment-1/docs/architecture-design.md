# Folio Notes & Board — Architecture & Design

## 1. Overview
Folio is a static single-page React application. Vite provides the development server and production build; Nginx serves the built files in the runtime image. There is no API server: notes, columns, and the display preference are stored in the browser's `localStorage`.

```text
Browser
  ├─ React UI (src/main.jsx)
  │    ├─ note editor / confirm modal / toast
  │    ├─ search, filters, board columns and cards
  │    └─ JSON file import/export
  ├─ localStorage (folio.notes, folio.columns, folio.dark)
  └─ static assets ← Nginx ← Docker image
```

## 2. Component and state design
The small application keeps its state in the root `App` component. This avoids a state library for a single-view client-only product. `notes` and `columns` are the source of truth; visible cards are derived by combining the live query and active filter, then sorted by `order` within a column. Mutations update React state and effects serialize it to storage.

| State | Purpose |
| --- | --- |
| `notes` | Note records, their board assignment, and ordering |
| `columns` | Column labels and accent colours |
| `query`, `filter` | Derived live board view |
| `dialog`, `draft` | Create/edit/delete modal state |
| `dragging`, `dragOver` | HTML drag and drop feedback |
| `toast` | Status and optional undo operation |
| `collapsed`, `dark`, `menu` | Presentation and menu state |

Lucide React supplies interface icons. Styling is CSS with responsive breakpoints and CSS variables for light/dark palettes.

## 3. Persistence and data flow
At startup the app parses each storage key, using defaults when missing or malformed. State changes are serialized to `localStorage`. This is best-effort browser persistence: clearing site data, using a different browser profile, or exceeding storage quota can remove/prevent saved data. JSON export is the backup and transfer path.

Creation validates `title.trim()` before adding a uniquely identified record to the first column. Editing replaces the matching record. Deletion removes it and attaches the removed record to an ephemeral Undo callback in the toast. Import fully parses and validates into temporary values before applying changes, avoiding partial replacement on parse/shape errors.

## 4. Drag/drop behavior
Cards use native HTML drag events. A drag carries the note id in `text/plain`. Dropping on a column appends to that column; dropping on a card inserts at that card's position. Order values are normalized per column after movement. Drag end clears preview state. A drop outside a column triggers no mutation, preserving assignment.

## 5. Import format
Preferred export format:
```json
{ "version": 1, "exportedAt": "ISO-8601", "columns": [], "notes": [] }
```
The reader also accepts a bare array of notes. Notes must have string IDs and non-empty string titles. Missing tags, invalid priorities, unknown column IDs, and missing order receive safe defaults. Supplied columns are adopted only when each entry has string `id` and `name` fields.

## 6. Deployment design
The Docker build stage installs dependencies and runs `vite build`. The final Nginx Alpine stage copies only `dist`, exposes port 80, and includes a basic HTTP health check. Static delivery means no runtime secrets or database migrations are needed. Persistence belongs to browser storage, not the container volume.

## 7. Tradeoffs and future extensions
- A backend/API and authenticated storage could replace local storage for synchronization and shared workspaces.
- A schema migration layer could be introduced as data shape evolves beyond export version 1.
- Add accessible keyboard drag controls and automated browser tests if accessibility and regression coverage are part of a later delivery gate.
- Bundle fonts locally if offline use and zero third-party asset requests are required.
