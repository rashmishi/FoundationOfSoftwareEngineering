# Notes Kanban — Testing & Deployment

## Prerequisites

- Node.js 22+ and npm for local development/build.
- Docker Engine for container deployment.

## Local execution

```bash
npm install
npm run dev
```

Open the local Vite address printed in the terminal (normally
`http://localhost:5173`). Build the production bundle with:

```bash
npm run build
```

The build must finish without TypeScript or Vite errors and writes deployable
assets to `dist/`.

## Manual acceptance test matrix

| ID(s) | Procedure | Expected result |
| --- | --- | --- |
| N-01, N-02 | Create a note with each field; then attempt one with only whitespace title. | First note appears with its values and success toast; second displays title error and is not added. |
| N-03–N-06 | Edit and delete a note, use Undo, then refresh after each state. | Values update; delete/undo work; retained state matches refresh. |
| S-01, S-02 | Search title/description/tag and select priority/tag filters. | Results update immediately. |
| S-03, S-04 | Export JSON; import it; attempt a malformed JSON file; refresh. | Export is valid; import restores data; invalid import shows error; imported data remains. |
| K-01–K-06 | Drag a list/card note to a column, between columns, and onto another card; drop outside; add/collapse a column. | Placement/order changes only on valid drop and survives refresh. |
| U-01–U-05 | Tab through controls, operate title/menu/dialogs/keyboard Move-to, test theme/mute and Undo toast. | Controls are named/focused/operable; focus returns after modal/menu; Undo remains for >=10 seconds and pauses during hover/focus. |

## Accessibility smoke test

1. Use only keyboard: Tab/Shift+Tab through all controls, Enter/Space to activate.
2. Confirm the title editor, menus, dialogs, import control, and every board operation are usable without drag-and-drop.
3. Open a menu and dialog; verify Escape closes them and focus returns to their trigger.
4. Create an invalid note; verify error is associated with title and announced.
5. Enable an OS/browser reduced-motion preference; verify movement is suppressed.
6. Check light and dark themes for readable text and focus outlines; priority/overdue meaning must be understandable without color.
7. Optionally run a browser accessibility scanner (for example axe DevTools) and remediate any serious/critical findings.

## Docker deployment

Build one self-contained image from the repository root:

```bash
docker build -t notes-kanban:latest .
docker run --rm -p 8080:80 --name notes-kanban notes-kanban:latest
```

Open `http://localhost:8080`. A healthy response is the Notes Kanban page.
For a remote host, push the same image to a registry and run it with the host's
chosen port mapping. The app requires no runtime environment variables or server
database because each browser stores its own notes locally.

## Docker smoke checks

```bash
docker image inspect notes-kanban:latest
curl -I http://localhost:8080
```

Expect a successful HTTP response and `Content-Type: text/html` for the root
page. Then perform the create/refresh acceptance test in the served browser.

## Known operational boundary

Browser `localStorage` is per-browser/per-origin. Clearing site data or moving
to a new browser does not transfer notes; use Export JSON and Import JSON for a
portable backup/restore workflow.
