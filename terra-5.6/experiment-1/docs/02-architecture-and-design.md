# NoteFlow — Architecture & Design

## Architecture

```text
Browser
  React single-page UI
    App state (notes, columns, theme)
    Native HTML5 drag/drop + dialogs + toasts
         | read/write
    localStorage: noteflow-data-v1
         | export/import
    JSON file

Docker: Node build stage -> Nginx static server (port 80)
```

## Design decisions

The app uses React function components and local state because the specified persistence is per-browser and does not require collaboration, authentication, or a network service. A single state document is cloned before mutation and immediately serialized to local storage, avoiding partial updates across notes and columns.

Native drag-and-drop transports only the note ID. On a valid drop, the state layer changes `columnId`; if a card target is present, it repositions the note in the array. No `dragend` mutation occurs, so a cancelled/outside drop leaves state unchanged.

## Component map

| Component | Responsibility |
|---|---|
| `App` | State lifecycle, persistence, search/filter, import/export, toast and modal routing. |
| `Card` | Render a draggable note and hover toolbar. |
| `Column` | Render/collapse droppable board lane and accept movement/reordering. |
| `Edit` / `AddColumn` | Modal form validation and field collection. |
| `Dialog` | Accessible modal shell and backdrop close behavior. |

## Persistence and import contract

The exported payload is a JSON array of Note records. Import validates that the root is an array and every record has an ID, title, and `tags` array before it updates state. Columns are intentionally application-local; imported notes referencing a missing column remain available in storage and can be reassigned after import.

## Visual design

The layout intentionally separates an “unassigned notes” source list from horizontal Kanban lanes. A restrained violet accent signals actions and tags; colored card rails encode priority. CSS transitions signal hover and valid drop targets without depending on a third-party animation package. Dark mode changes semantic CSS variables, keeping contrast and surfaces consistent.
