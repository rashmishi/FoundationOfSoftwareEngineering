# Testing and Deployment Instructions

## 1. Local development
Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```
Open the URL printed by Vite (normally `http://localhost:5173`). Vite binds to `0.0.0.0`, so it can also be reached from another device on the same network.

## 2. Production build
```sh
npm run build
npm run preview
```
The production assets are written to `dist/`; preview serves the built output locally.

## 3. Docker deployment
Build and run the single-image deployment:
```sh
docker build -t folio-notes:1.0 .
docker run --rm -p 8080:80 folio-notes:1.0
```
Visit `http://localhost:8080`. For a remote host, build or publish the image to its registry, then run the image with the desired host port mapping (for example `-p 80:80`). The image is stateless; note data remains in each user's browser `localStorage`. Use Export JSON for backups.

## 4. Acceptance walkthrough
1. Create a title-only note; verify it appears in Inbox and a success toast appears.
2. Try to create a blank-title note; verify it is rejected with a message.
3. Add description, several comma-separated tags, a priority, and due date; verify chips and overdue styling.
4. Edit the note in the modal and inline-edit its title with a double-click. Refresh and verify values persist.
5. Search title/description/tag terms; exercise All notes, High priority, and Overdue filters.
6. Drag a card to another column and then above another card in that column. Verify move/reorder and refresh persistence. Drop outside the board and verify the assignment is unchanged.
7. Add, rename, collapse, and delete a column; verify notes from a deleted column transfer to the first remaining column.
8. Delete a note, use Undo before the toast closes, then delete it again and refresh to verify it stays removed.
9. Export JSON. Import that file and verify notes and columns restore. Try malformed JSON or a JSON object with no notes array; verify the error toast and unchanged board.
10. Toggle dark mode and refresh. Check the responsive layout at desktop and narrow/mobile widths.

## 5. Operational notes
- This static image has no server-side user data and no secrets to configure.
- Nginx health check requests `/` every 30 seconds.
- Browser storage is origin-specific. Changing host, protocol, or browser creates a separate local data set.
- If deployed behind a reverse proxy, forward requests to container port 80.
