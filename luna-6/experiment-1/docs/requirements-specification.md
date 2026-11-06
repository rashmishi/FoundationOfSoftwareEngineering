# Folio Notes & Board — Requirements Specification

## 1. Purpose
Folio is a browser-based personal notes application. It combines a searchable notes collection with a drag-and-drop Kanban board. This specification records the requested product behavior, constraints, and acceptance criteria for the implementation in this repository.

## 2. Users and goals
- **Note taker:** capture, categorize, prioritize, and revisit notes.
- **Board organizer:** group notes into workflow columns and move/reorder them.
- **Administrator/operator:** run the same packaged application locally or on a remote host as one Docker image.

## 3. Functional requirements

### FR-1 Note lifecycle
1. Create a note with a required title, optional description, comma-separated tags, priority, and optional due date.
2. Reject a blank title and show a validation notification.
3. Show a success notification and place a created note in the first board column.
4. Display title, description, tags, priority, due date, and workflow placement on the card.
5. Edit note fields through a modal; edit a title inline by double-clicking it.
6. Delete with a confirmation dialog. Offer Undo in the transient notification.
7. Persist note state through browser refresh.

### FR-2 Board and columns
1. Display all columns and the notes assigned to each column.
2. Move notes between columns by drag and drop; drop on a card to position relative to that card.
3. Reorder notes within a column by dropping them on another card.
4. Provide a dragging visual state. A drop outside a column does not change assignment.
5. Create, rename, collapse, and delete columns. Notes in a deleted column move to the first remaining column.
6. Persist columns, order, and assignments through refresh.

### FR-3 Search and filters
1. Search live across note title, description, and tags.
2. Filter the board to all notes, high priority notes, or overdue notes.
3. Combine text search and selected filter.

### FR-4 Import/export
1. Export all notes and columns to a downloadable JSON file.
2. Import either the exported envelope (`{version, columns, notes}`) or a bare note array.
3. Validate JSON shape and required note fields before replacing current notes.
4. Reject malformed input with an error notification and preserve existing data.
5. Persist imported data through refresh.

### FR-5 Presentation and interaction
1. Responsive browser UI with board columns, modal dialogs, hover note actions, and overflow menus.
2. Dark mode toggle persists across refresh.
3. Notes use colour-coded priority levels and tag chips.
4. Due dates earlier than the current local calendar date are highlighted as overdue.
5. Provide lightweight transitions and auto-dismissing toast messages with Undo for deletion.

## 4. Non-functional requirements
- Client-side React single-page application; no account or backend required for this deployment.
- Local persistence uses `localStorage`; current browser profile is the storage boundary.
- Export/import is the portability mechanism between browsers or devices.
- Build output is static and served by Nginx in the production container.
- The application should work on current evergreen browsers with HTML5 drag-and-drop and local storage.
- No user note data is sent to an application server. Google Fonts are loaded from an external stylesheet when network access is available; system fallback fonts are used otherwise.

## 5. Data model
```json
{
  "id": "stable-string-id",
  "title": "Required string",
  "description": "Optional string",
  "tags": ["Work", "Planning"],
  "priority": "low | medium | high",
  "due": "YYYY-MM-DD | empty string",
  "columnId": "column id",
  "order": 0,
  "createdAt": 0
}
```
Columns have `id`, `name`, and `color`. Board export envelope has `version`, `exportedAt`, `columns`, and `notes`.

## 6. Acceptance checks
- A title-only note can be created; a blank-title note cannot.
- Description and multiple tags survive editing and refresh.
- Editing and confirmed deletion update the board immediately; deleted note stays absent after refresh.
- Search and all three filters update the visible cards without a page reload.
- An exported file parses as JSON and includes all current notes and columns.
- Export followed by import restores card data and board placement; invalid JSON displays an error and leaves current data intact.
- Dragging to a column changes assignment, dragging to a card changes position, and an outside drop leaves the card assigned where it was.
- Column create/rename/collapse/delete behavior works and persists.
- Container serves the static application on port 80.

## 7. Out of scope / known boundaries
- Multi-user sync, authentication, server-side backups, collaboration, and conflict resolution.
- Sound effects are omitted: they were listed as an additional feature, while the core notes and board workflows take priority; the UI remains silent.
- Keyboard-only card reordering is not implemented; use the card controls and board with a pointer.
