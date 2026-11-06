# NoteFlow — Requirements Specification

## Purpose and scope

NoteFlow is a browser-based personal note manager that combines a searchable note list with a Kanban board. It is a client-side application: users own their data in the browser and can transfer it with a JSON export/import file.

## Actors

| Actor | Goal |
|---|---|
| User | Capture, organize, find, and manage notes. |
| System administrator | Run the application from one Docker image. |

## Functional requirements

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FR-01 | Create a note with title, description, tags, priority, and optional due date. | Saving a title creates a visible list item and success toast. |
| FR-02 | Reject title-less notes. | The dialog remains open and displays a validation error. |
| FR-03 | Persist note changes. | Creation, edits, deletion, import, assignments, and column state survive refresh. |
| FR-04 | Read, edit, and delete notes. | Each card displays its content and exposes edit/delete controls on hover. Delete can be undone from its toast. |
| FR-05 | Export notes. | The browser downloads a syntactically valid JSON array containing all note records. |
| FR-06 | Import notes. | A compatible JSON array replaces the current notes; malformed/incompatible files show an error toast. |
| FR-07 | Assign/reorder notes on a board. | A list card can be dropped on a column; a board card can move between columns or before another card. A drop outside a target preserves placement. |
| FR-08 | Manage columns. | Users can add named columns and collapse/expand any column. |
| FR-09 | Search/filter. | Title, description, and tags are searched live; tag filtering composes with text search. |
| FR-10 | Appearance feedback. | Priorities/tags are color-coded, overdue dates are highlighted, drag targets animate, and dark mode is available. |

## Data rules

A `Note` has `id` (non-empty), `title` (required), `description` (string), `tags` (string array), `priority` (`Low`, `Medium`, or `High`), `dueDate` (ISO date or empty), and `columnId` (column ID or null). A `Column` has `id`, `name`, and `collapsed`.

## Non-functional requirements

- Modern desktop and mobile browsers; no account or backend required.
- Data is stored in same-origin `localStorage` under `noteflow-data-v1`.
- The Docker image serves the static production build on port 80.
- UI uses semantic controls and accessible labels for primary actions.

## Assumptions and exclusions

Import intentionally replaces the current note collection rather than merging it, preventing ambiguous duplicate IDs. Sound effects and a populated column “more actions” menu are not implemented because browser audio needs an asset/user preference and the current column actions are limited to collapse; the visible affordance is retained for future extension.
