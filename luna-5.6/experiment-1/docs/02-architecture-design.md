# Architecture & Design — Shelf Notes

## System shape

```text
Browser → React App (Vite bundle)
           ├── App state: notes, columns, filters, modal, toasts
           ├── localStorage persistence
           ├── JSON transport (FileReader + Blob)
           └── CSS UI system (responsive board/list, light/dark themes)
```

`Note` contains identity, title, description, tags, priority, optional due date, `columnId`, and timestamps. `Column` contains identity, display name, color, and collapsed state. The export envelope is `{ notes, columns }`.

Native HTML5 drag-and-drop carries a note id. State changes only on `drop`, so a cancelled/outside drag has no effect. Modal forms centralize create/edit validation; delete uses a confirmation and an Undo closure. Search/filter derive a filtered view without mutating source data.

The multi-stage Dockerfile builds with Node 20 and serves the static bundle from Nginx Alpine.
