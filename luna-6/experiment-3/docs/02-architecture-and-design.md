# Architecture & Design

## System shape

A client-side React + TypeScript single-page application built with Vite. The production bundle is copied into a small Nginx container and served as static assets. All domain state and persistence live in the browser; no network service is needed.

```text
Browser
  ├─ React view: header, filters, list, board, dialogs, toasts
  ├─ Reducer: notes, columns, assignments, ordering
  ├─ Contexts/hooks: preferences, announcements, dialogs, actions
  └─ localStorage adapter  ←→  versioned validated workspace JSON
Docker image: Nginx static server + SPA fallback
```

## Modules

- **Domain model**: `Note`, `Column`, `WorkspaceState`, `Preferences`; pure validation, selectors, reducer transitions, import/export codec, date and tag helpers.
- **Persistence**: hydrate from a versioned localStorage record; validate on read; safely fall back to starter state if absent or corrupt. Persist reducer state after accepted changes. Import validates a complete candidate before one atomic replacement.
- **Application state**: one reducer owns notes, columns, order, and assignments. UI preferences have a small separate persistence adapter. Toast undo stores the inverse action or previous state snapshot with a bounded expiry.
- **Views**: header and transfer controls; searchable/filterable unassigned list; board with independently collapsible columns; shared note card; add/edit forms; accessible modal host; toast live region.
- **Interaction**: native HTML drag events for pointer movement, with explicit move-to-column actions and keyboard shortcuts/actions as equivalents. Drop targets only commit on valid column targets. Reducer maintains ordering and prevents duplicate assignments.
- **Accessibility**: semantic landmarks and headings; labeled fields; `aria-live` status and error regions; dialog focus trap/restoration; menu keyboard behavior; focus-visible styles; reduced-motion CSS; accessible icon buttons; textual priority labels and overdue status.

## State and data model

```ts
type Priority = 'low' | 'medium' | 'high';
type Note = {
  id: string; title: string; description: string; tags: string[];
  priority: Priority; dueDate: string | null; updatedAt: string;
};
type Column = { id: string; name: string; collapsed: boolean; noteIds: string[] };
type WorkspaceState = { schemaVersion: 1; notes: Note[]; columns: Column[]; unassignedIds: string[] };
```

Each note occurs exactly once in either `unassignedIds` or one column’s `noteIds`. Reducer operations preserve that invariant and stable ordering. Unknown schema versions are rejected. Export uses the same shape as the persisted workspace state and includes a format marker.

## Key flows

### Save note

Form validates title → dispatch create/update → reducer normalizes fields and adds the note to unassigned order → persist → announce success and show undo toast. Invalid title retains focus and connects a concise error to the input.

### Move note

Drag start stores note ID and gives the card a visible dragging style. Valid drop dispatches move with target column and insertion position. Invalid/outside drop dispatches nothing. Keyboard move controls invoke the same reducer action and announce the destination.

### Import/export

Export serializes the current validated state to a Blob and downloads a `.json` file. Import parses and validates file size, format version, required fields, unique IDs, and assignment invariants before dispatching a full replacement. On any error, state remains untouched and the error is announced.

## Layout and visual direction

A calm warm-paper workspace with a compact top header, a primary search/filter row, an unassigned notes section, and a horizontally scrollable board. Columns use restrained surfaces and colored priority/tag chips. Contrast is checked for both themes. Cards use hover and focus-visible action bars; small transitions communicate drag, collapse, and toast changes. Mobile layout stacks the list and board while retaining accessible column navigation.

## Security and resilience

All content is treated as text and rendered through normal React escaping. Imported JSON is treated as untrusted and validated; no HTML is interpreted. Storage errors are caught and surfaced. Nginx uses SPA fallback and serves immutable static assets; no secrets or user data are embedded in the image.

## Deployment topology

A multi-stage Docker build installs dependencies, builds static assets, and copies only the bundle and Nginx config into the runtime image. Port 8080 is exposed by default; deployments may map it to any host port. `docker run -p 8080:8080 notes-app` serves the UI.
