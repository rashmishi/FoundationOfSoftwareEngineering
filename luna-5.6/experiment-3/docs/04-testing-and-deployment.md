# Luna Notes — Testing & Deployment

## 1. Prerequisites

- Node.js 22+ and npm 10+ for local development.
- Docker 24+ for image builds and container deployment.
- A current Chrome, Edge, Firefox, or Safari browser for manual checks.

## 2. Local development

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The app stores content in that browser's local storage; use Export before clearing site data.

## 3. Automated verification

```bash
npm run test
npm run build
```

The test suite currently covers:

- Versioned export contract and required-title invariant.
- Rendering the empty workspace with `axe-core` and asserting zero violations. For release hardening, repeat axe against populated notes/board, open create/edit/delete/move dialogs, an open column menu, invalid-form state, and dark theme; these states are currently a manual verification step because the test fixture is intentionally small.
- Real column menu keyboard behavior: focus enters the menu, Arrow/Home/End handling is wired, and Escape closes it.

The build command runs strict TypeScript compilation and the Vite production bundle. A successful output is written to `dist/`.

## 4. Manual acceptance matrix

| Area | Steps | Expected result |
| --- | --- | --- |
| Create | New note → title/description/tags/priority/due date → Save | Note appears in list and Inbox with confirmation toast. |
| Validation | Save a blank title | No note is created; title receives focus and an associated alert. |
| Edit/delete | Edit card or inline action; delete and confirm | Changes appear immediately; delete toast offers persistent Undo. |
| Persistence | Create/edit/move/collapse; refresh | Notes, board assignments, order, collapsed state, theme, and sound preference remain. |
| Search/filter | Type a term; switch priority/date filters | Results update live and the result count changes. |
| Import/export | Export JSON; import it; import malformed JSON | Export is valid; import preserves fields; malformed input leaves current state untouched and announces an error. |
| Board | Drag a list note into each column; drag between columns; drop outside | Destination assignment changes only on accepted drop; outside drop leaves state unchanged. |
| Keyboard move | Focus a note's Move action; choose destination/position | Note moves without pointer and focus remains on moved note. |
| Columns | Add a named column; collapse/expand; use More actions | Column is added, collapse state changes, menu works with keyboard. |
| Theme/motion | Toggle dark mode; enable reduced motion in OS/browser | Theme persists; non-essential transitions are disabled. |

## 5. Accessibility review checklist

Run the `axe-core` test, then manually verify with pointer disconnected:

1. Skip link, landmarks, one `h1`, labelled notes and board regions, and every control has an accessible name. Focus indicators are at least 2 CSS pixels and have at least 3:1 contrast in both themes.
2. Tab order reaches every toolbar, note, board, menu, dialog, Undo, and Dismiss control.
3. Enter/Space activates controls; menu supports ArrowUp/ArrowDown/Home/End/Escape.
4. Dialog focus enters on open, traps within the dialog, closes with Escape, and returns to a valid control or main heading.
5. Errors use `aria-invalid`, `aria-describedby`, and focus the invalid input.
6. Status/error announcements cover mutations, result counts, empty states, collapse state, import failure, and storage failure. The keyboard/touch Move action announces source column, destination, and final position; drag/drop is not the only path.
7. Use a contrast checker: normal text is at least 4.5:1, large text at least 3:1, and controls/focus/borders at least 3:1 in both themes.
8. Test at 200% zoom and 320px width; touch targets are at least 24×24 CSS pixels, or smaller targets have at least 24 CSS pixels of spacing, and verify `prefers-reduced-motion: reduce`.
9. Spot-check with NVDA on Windows and VoiceOver on macOS/iOS.

## 6. Docker deployment

Build and run the single production image:

```bash
docker build -t luna-notes:1.0.0 .
docker run --rm -d --name luna-notes -p 8080:80 luna-notes:1.0.0
```

Open `http://localhost:8080`. Check the image health status with:

```bash
docker inspect --format='{{.State.Health.Status}}' luna-notes
```

The image uses a Node build stage and a small Nginx runtime stage. Nginx provides SPA fallback to `index.html`, serves static assets, exposes port 80, and includes an HTTP health check. The container is stateless by design; user notes live in browser storage, so persistence follows the browser profile rather than the container filesystem.

## 7. Remote deployment

Copy the repository to the host or pull it from source control, install Docker, then run the same `docker build` and `docker run` commands. Put a TLS-terminating reverse proxy in front of port 80 for public use. Because no user content leaves the browser, no application secrets or database credentials are required.

## 8. Troubleshooting

- **Blank page:** inspect browser console; rerun `npm run build` and verify Nginx serves `dist/index.html`.
- **Notes disappeared:** check that the same browser profile/origin is being used; restore the last exported JSON.
- **Import rejected:** ensure the file has `format: "luna-notes"`, `version: 1`, `columns`, and `notes` arrays.
- **Container not healthy:** run `docker logs luna-notes`, then verify port 80 inside the container and that the Nginx config is present.
