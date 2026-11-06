# Testing & Deployment

## Local development

Prerequisite: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). Create a production bundle with:

```bash
npm run build
npm run preview
```

## Manual acceptance test matrix

| Scenario | Expected result |
|---|---|
| Create title-only note | Card enters Notes list; success toast appears; reload preserves it. |
| Submit empty title | Validation message appears; no card is added. |
| Create title/description/tags | All values display on the card and persist after refresh. |
| Edit and delete | Edit updates card. Delete removes it; Undo restores it. |
| Export/import | Download parses as JSON. Re-import preserves cards. Invalid text produces error toast. |
| Board movement | Drag from list to column, between columns, and within a column; reload preserves assignment/order. |
| Cancelled drop | Drop away from columns; note remains where it began. |
| UI extras | Verify search, tag filter, priority rail, overdue date, collapsed column, dark theme, and responsive view. |

## Docker deployment

Build and run the single-image deployment from the project root:

```bash
docker build -t noteflow:latest .
docker run --rm -p 8080:80 noteflow:latest
```

Visit `http://localhost:8080`. For a remote system, push the same image to a registry and run it with the host port policy required by that environment. The image is stateless; data remains in each visitor’s browser local storage, so no database volume is needed.

## Operational notes

- Back up a browser’s notes by using Export before clearing browser data or changing origins.
- HTTPS is recommended for remote deployment.
- This static application can also be hosted on any CDN/static-site service; configure SPA fallback only if future routing is introduced.
