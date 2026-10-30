# 1. Requirements Specification — Notes Kanban

| Item | Value |
|---|---|
| Product | Notes Kanban — a browser-based note manager with a Kanban board |
| Document version | 1.0 (2026-10-30) |
| Source | User stories supplied by the product owner |

## 1.1 Purpose and scope

Notes Kanban lets a single user create, edit, delete, tag, export and import notes, and organise them on a Kanban board whose columns the user can extend. The application runs entirely in the browser and is shipped as a single Docker image.

**In scope:** note CRUD, tags, local persistence, JSON export/import, drag-and-drop Kanban board with user-defined columns, containerised deployment.

**Out of scope (v1):** user accounts, server-side storage, multi-device sync, real-time collaboration, column rename/delete/reorder, card ordering within a column.

## 1.2 Stakeholders and actors

| Actor | Description |
|---|---|
| User | Uses the application in a web browser to manage notes. |
| System administrator | Builds and runs the Docker image on a local machine or remote host. |

## 1.3 Glossary

| Term | Meaning |
|---|---|
| Note | A record with a required title, optional description and zero or more tags. |
| Tag | A short free-text label. Entered as a comma-separated list; trimmed, empty values dropped, duplicates removed (case-insensitive). |
| Note list | The panel listing every note, regardless of board assignment. |
| Column | A named Kanban lane. A note is assigned to at most one column. |
| Unassigned note | A note that is in the note list but on no column. |
| Export file | A JSON document produced by the application's export function (schema in §1.7). |

## 1.4 Functional requirements

Each requirement lists its acceptance criteria (AC) in Given/When/Then form. IDs are referenced from the test suite (see `docs/04-testing-and-deployment.md`, traceability matrix).

### FR-1 Create notes with title, description and tags

| AC | Criterion |
|---|---|
| FR-1.1 | While viewing the application, when the user enters a title and submits the new-note form, then a note is created. |
| FR-1.2 | When the user enters a title, a description and one or more tags and submits, then all values are stored with the note. |
| FR-1.3 | When the user submits without a title (empty or whitespace only), then no note is created and an inline error is shown next to the title field; focus moves to the title field. |
| FR-1.4 | When a note is created, then it appears in the note list and a confirmation message (“Note … created”) is displayed and announced to assistive technology. |
| FR-1.5 | Given an existing note, when the page is refreshed, then the note and all its details are still available. |

### FR-2 View and manage notes in a list

| AC | Criterion |
|---|---|
| FR-2.1 | When the user views the note list, then every existing note is displayed. |
| FR-2.2 | For each note, its title, description and tags are shown (plus the column it is on, if any). |
| FR-2.3 | When the user edits a note's title/description/tags and saves, then the changes are persisted and displayed in the list (and on its Kanban card). The same title-required validation as FR-1.3 applies. Cancelling an edit discards changes. |
| FR-2.4 | When the user deletes a note, then it is removed from the list and from the board. |
| FR-2.5 | Given a deleted note, when the page is refreshed, then the note is not displayed. |
| FR-2.6 | When there are no notes, the list shows an empty-state message. |

### FR-3 Export and import notes as JSON

| AC | Criterion |
|---|---|
| FR-3.1 | When the user exports, then a file `notes-YYYY-MM-DD.json` is downloaded containing valid JSON with all notes (and the column definitions they refer to). |
| FR-3.2 | Given a file exported by the application, when the user imports it, then all notes in the file are loaded and every field (id, title, description, tags, column, timestamps) is preserved. Imported notes are **merged** with existing notes: a note whose `id` already exists is replaced by the imported version; others are added. Imported columns are merged by `id` in the same way. |
| FR-3.3 | Given a file that is not valid JSON, or valid JSON that does not match the export schema, when the user imports it, then the import is rejected, application data is unchanged, and an error message describing the problem is displayed. |
| FR-3.4 | Given a successful import, when the page is refreshed, then the imported notes are still present. |

### FR-4 Drag notes from the list onto the Kanban board

| AC | Criterion |
|---|---|
| FR-4.1 | When the user drags a note from the note list onto a column, then the note appears in that column. |
| FR-4.2 | Given a note in a column, when the user begins dragging it, then visual feedback is given: the dragged card is dimmed/outlined and the column under the pointer is highlighted. |
| FR-4.3 | When a note is dropped onto a column, then the note's column assignment is set to that column. |
| FR-4.4 | When the page is refreshed, then every note remains on its assigned column. |
| FR-4.5 | When a note is dropped anywhere that is not a column, then its assignment does not change. |

### FR-5 Create columns and move notes between them

| AC | Criterion |
|---|---|
| FR-5.1 | When the user enters a column name and submits, then a new column with that name is appended to the board and persisted. An empty name, or one matching an existing column (case-insensitive), is rejected with an inline error. |
| FR-5.2 | When a note is dragged from one column to another, then it is removed from the original column and added to the new one. |
| FR-5.3 | On first launch the board contains three default columns: “To Do”, “In Progress”, “Done”. |

### FR-6 Browser access

| AC | Criterion |
|---|---|
| FR-6.1 | The application is served over HTTP and works in current versions of Chrome, Firefox, Edge and Safari without plugins. |

### FR-7 Single-image deployment

| AC | Criterion |
|---|---|
| FR-7.1 | A single `docker build` produces one image that serves the complete application. |
| FR-7.2 | `docker run -p <port>:8080 <image>` makes the application reachable at `http://<host>:<port>/` on a local or remote machine. |
| FR-7.3 | The image exposes a health endpoint (`/healthz`) usable by orchestrators. |

## 1.5 Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Persistence | All state is saved to browser `localStorage` after every change; no data is lost on refresh. Corrupt stored data must not crash the app (it falls back to defaults and logs a warning). |
| NFR-2 | Accessibility | WCAG 2.2 AA intent: semantic landmarks and headings, every control labelled, visible focus, colour contrast ≥ 4.5:1, status/error messages exposed via live regions. **Every drag-and-drop action has a keyboard/pointer-free equivalent** (WCAG 2.5.7 Dragging Movements): each note has a “Move to column” selector. |
| NFR-3 | Responsiveness | Usable from 360 px to desktop widths; panels stack on narrow screens. |
| NFR-4 | Performance | Interactions respond in < 100 ms for up to 1 000 notes. Production bundle < 100 kB gzipped JS. |
| NFR-5 | Security | No external network calls at runtime; imported content is rendered as text only (no HTML injection). Container runs as a non-root user. |
| NFR-6 | Maintainability | TypeScript strict mode; business logic in pure, unit-tested functions separate from UI components. |
| NFR-7 | Portability | Image is built from public base images and runs on any OCI-compatible runtime (Docker, Podman, Kubernetes). |

## 1.6 Assumptions and constraints

- Single user per browser profile; data is local to that browser (by design — no backend in scope).
- “Validation message is displayed” on create (story 1) is interpreted as a confirmation message.
- The note list is not a drop target; dropping a card there counts as “outside a column” (FR-4.5). A note can be returned to “unassigned” via the keyboard “Move to column” selector.
- Import merges rather than replaces, to avoid accidental data loss.

## 1.7 Data requirements

Note:

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique, generated (UUID). |
| `title` | string | Required, trimmed, 1–200 chars. |
| `description` | string | Optional, ≤ 5 000 chars. |
| `tags` | string[] | Trimmed, non-empty, de-duplicated, each ≤ 50 chars. |
| `columnId` | string \| null | `null` = unassigned. |
| `createdAt`, `updatedAt` | string | ISO-8601 timestamps. |

Column: `{ id: string, name: string }` (name required, ≤ 60 chars).

Export file:

```json
{
  "app": "notes-kanban",
  "version": 1,
  "exportedAt": "2026-10-30T10:00:00.000Z",
  "columns": [{ "id": "todo", "name": "To Do" }],
  "notes": [{
    "id": "…", "title": "…", "description": "…", "tags": ["a"],
    "columnId": "todo", "createdAt": "…", "updatedAt": "…"
  }]
}
```
