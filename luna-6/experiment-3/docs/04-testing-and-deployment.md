# Testing & Deployment Instructions

## 1. Prerequisites

- Node.js 20+ and npm for local development and production builds.
- Docker Engine or Docker Desktop for image builds and container runs.
- A modern browser with JavaScript and local storage enabled.

## 2. Local build and run

From the repository root:

```sh
npm install
npm run build
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The development server is bound to `0.0.0.0`, so it can also be opened from another device on the same network when the host firewall permits it.

To preview the production bundle locally:

```sh
npm run preview
```

The project does not include an automated test runner. Use the acceptance checks below for manual verification; run `npm run build` after changes to confirm TypeScript compilation and bundling.

## 3. Acceptance and regression checks

### Notes and persistence

1. Create a note with a title only. Confirm it appears in **On your mind**.
2. Open a new note and submit with the title blank. Confirm saving is blocked, the inline error appears, and focus returns to the title field.
3. Create a note with description, multiple comma separated tags, each priority value, and a due date. Confirm all values appear on its card. Set a past date and confirm the overdue label is visible.
4. Edit the details and title inline. Confirm updated values appear immediately.
5. Delete a note, then use Undo while the notification is visible. Confirm it returns. Delete it again and refresh; confirm it stays deleted.
6. Refresh after creating and editing a note; confirm its data remains.

### Search and board

1. Search for text present in a title, description, and tag. Confirm results update as text changes. Clear search and use tag, priority, and overdue filters.
2. Drag an unassigned note to a board column and between columns. Confirm it appears in the destination and is absent from its original location.
3. Drag a note to a specific card to reorder it. Drop a card outside a column and confirm it remains where it was.
4. Use each note’s More actions menu and Move up/Move down controls to move and reorder using only a keyboard. Confirm screen readers announce the move.
5. Add a column, rename it, collapse and expand it, then delete it. Confirm its notes return to the notes list and refresh to confirm board structure and assignments persist.

### JSON transfer

1. Export the workspace. Parse the downloaded file as JSON and confirm it contains the format marker, schema version, notes, columns, and assignments.
2. Import the exported file. Confirm notes and columns are restored. Refresh and confirm persistence.
3. Try a malformed JSON file and a valid JSON file with missing or duplicate note/placement data. Confirm an error is announced and the existing workspace is unchanged.

### Preferences and accessibility

1. Toggle light and dark themes, refresh, and confirm the choice persists. Confirm text, tags, controls, and keyboard focus remain visible in both themes.
2. Confirm sound starts off, can be enabled and disabled, and does not play when disabled.
3. Navigate every action using Tab, Shift+Tab, Enter, and Space. Confirm focus is visible; dialogs trap focus, close on Escape, and return focus to the opener.
4. Use a screen reader to check the search and form labels, validation error, note priorities, due status, dialog names, action menu expanded state, and live updates.
5. Enable reduced motion in the operating system and confirm transitions become minimal. Check the interface at a narrow viewport and browser zoom.

## 4. Docker deployment

Build one production image:

```sh
docker build -t little-notes:1.0 .
```

Run it on the local machine:

```sh
docker run --rm --name little-notes -p 8080:8080 little-notes:1.0
```

Open `http://localhost:8080`. Check container health with:

```sh
docker inspect --format='{{.State.Health.Status}}' little-notes
```

Map a different host port by changing the first port number, for example `-p 3000:8080`. For a remote host, build and tag the same image for the target registry, push it, then run it behind the host’s firewall or an HTTPS reverse proxy that forwards to container port 8080. The image serves static files only; browser local storage keeps each user’s notes, so users should export JSON before clearing browser data or switching browsers.

## 5. Operational notes

- Nginx serves the SPA with an index fallback, so direct navigation and refresh resolve to the application.
- The container health check requests `/` on port 8080.
- No server-side database, secrets, user authentication, or server backup is configured.
- The Nginx runtime uses the `nginx:1.27-alpine` image; update the base image through normal dependency maintenance and rebuild the image to receive fixes.
