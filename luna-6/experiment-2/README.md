# Daybook

A small, accessible notes app with a drag-and-drop Kanban board. Notes and custom columns are saved in the current browser with `localStorage`.

## Run locally

```sh
npm install
npm run dev
```

## Build and deploy as one Docker image

```sh
docker build -t daybook .
docker run --rm -p 8080:80 daybook
```

Open <http://localhost:8080>. The image serves the built React application through Nginx. Data belongs to the browser profile and is not shared between browsers or devices; use the JSON export/import controls to move it.

## Accessibility and operation

- Semantic landmarks, a skip link, labelled fields, required-title validation, visible focus, and live status/error announcements.
- Keyboard-operable note actions and a column selector for moving notes without dragging. Reduced-motion preferences are respected.
- Drag a note card to a column to move it. Use the card action menu's “Move to…” option for keyboard and touch-friendly movement.
- Import replaces the current note list; export contains notes and column definitions. Imported notes with unknown columns are assigned to Inbox.
