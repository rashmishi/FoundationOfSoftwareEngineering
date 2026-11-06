# Little Notes

A browser based React and TypeScript notes workspace with a Kanban board, offline persistence, JSON transfer, search, tags, due dates, priorities, light and dark themes, optional sound, and keyboard accessible note movement.

## Start locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Build static assets with `npm run build`; preview them with `npm run preview`.

Workspace data is kept in the browser's local storage. Use **Export** before clearing browser data or changing browser profiles. JSON import replaces the current workspace only when the complete file is valid.

## Docker

Build the single production image from the repository root:

```sh
docker build -t little-notes .
```

Run it locally:

```sh
docker run --rm -p 8080:8080 little-notes
```

Visit `http://localhost:8080`. To use a different host port, change the left side of the mapping (for example `-p 3000:8080`). For remote deployments, publish the same image to your registry and map or route TCP port 8080 through your host or ingress. Data stays in each user's browser; the container does not store notes.

## Accessibility and interaction

Use the card action menu to move notes and reorder them with Move up/Move down. This provides a keyboard alternative to drag and drop. Dialogs accept Escape, keep keyboard focus inside, and return focus to the opener. Hover actions also appear on keyboard focus. Reduced motion follows the operating system preference; sound starts off and can be disabled.
