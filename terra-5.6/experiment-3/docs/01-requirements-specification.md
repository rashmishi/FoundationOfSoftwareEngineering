# Notes Kanban — Requirements Specification

## 1. Purpose and scope

Notes Kanban is a single-page React application for creating, finding, organizing,
and persisting personal notes. It provides both an accessible note list and a
Kanban board. It must run in a current web browser and be deployable from one
Docker image.

## 2. Users

| Role | Goal |
| --- | --- |
| Note user | Capture and manage notes, then organize them on a board. |
| System administrator | Build and run the application as one Docker image. |

## 3. Functional requirements

### 3.1 Notes

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| N-01 | Create a note with title, description, tags, priority, and optional due date. | A title creates a note; all supplied values are retained. |
| N-02 | Validate note creation. | Empty/whitespace-only titles prevent saving and display a clear error. Successful creation displays confirmation. |
| N-03 | Display notes. | Each note shows title, description, tags, priority, and due-date state when present. |
| N-04 | Edit a note. | Users can edit full details in a dialog and edit the title inline; saved changes appear immediately. |
| N-05 | Delete a note. | A confirmation dialog is required; confirmation removes the note. |
| N-06 | Persist notes. | Creates, edits, deletions, board placement, and ordering survive refresh. |

### 3.2 Search, filtering, and file transfer

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| S-01 | Search notes. | Search matches title, description, or tag as text is entered. |
| S-02 | Filter notes. | Priority and tag filters update the visible results without reload. |
| S-03 | Export notes. | Downloaded JSON is valid and includes all persisted note fields. |
| S-04 | Import notes. | A valid exported JSON file replaces the note collection while preserving note data. Invalid files are rejected with an error. Imported data survives refresh. |

### 3.3 Kanban board

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| K-01 | Use columns. | The application starts with Inbox, In Progress, and Done columns. |
| K-02 | Add columns. | A non-empty column name adds a board column. |
| K-03 | Assign and move notes. | Dragging a list/board card to a column assigns it; dragging between columns removes it from the source and adds it to the target. |
| K-04 | Reorder cards. | Dropping a card on another card in the same column reorders the cards. |
| K-05 | Preserve placement. | Assignments, column configuration, and order survive refresh. Dropping outside a target retains the original state. |
| K-06 | Column actions. | Columns can be collapsed and have a more-actions menu for renaming or deleting custom columns. |

### 3.4 Interaction and feedback

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| U-01 | Note controls. | Hover/focus reveals icon-only edit/delete/action toolbar; every icon control has an accessible name. |
| U-02 | More actions. | Notes and columns offer a keyboard-operable “More actions” menu. |
| U-03 | Toasts and undo. | Feedback messages dismiss automatically and, for reversible operations, offer Undo for at least 10 seconds; hovering or focusing the toast pauses dismissal. |
| U-04 | Theme. | A dark-mode toggle changes theme and retains the choice. |
| U-05 | Motion and sound. | Short, non-essential animations and optional sounds enhance feedback; both respect reduced-motion preferences, and sound can be muted. |

## 4. Data model

```ts
type Priority = 'low' | 'medium' | 'high';

type Note = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: Priority;
  dueDate: string | null;
  columnId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type Column = {
  id: string;
  name: string;
  collapsed: boolean;
  isDefault: boolean;
};

type AppData = { version: 1; notes: Note[]; columns: Column[] };
```

## 5. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Browser | Current evergreen Chrome, Edge, Firefox, and Safari. |
| Storage | Use browser `localStorage`; malformed stored data must fall back safely to defaults. |
| Responsive layout | Reflow for narrow viewports; no essential feature depends on hover or a pointer. |
| Accessibility | Meet WCAG 2.2 AA intent: an informative document title; semantic landmarks/headings; labels; contrast; focus visibility; keyboard access; meaningful errors; live announcements; dialogs/menus with correct ARIA state and focus returned to their invoking control when closed; and reduced motion. Native drag-and-drop has a keyboard alternative: select a destination from a note action menu. |
| Performance | Entire app is client-side and should render common personal collections promptly. |
| Security | Imported JSON is schema-checked; imported strings are rendered as text, never injected HTML. |
| Deployment | A multi-stage Docker build produces one self-contained image serving static production assets. |

## 6. Out of scope

Multi-user synchronization, accounts, cloud storage, collaboration, notifications
outside the page, and server-side APIs are not included.

## 7. Traceability

The implementation and test plan will map features to IDs N-01 through U-05.
