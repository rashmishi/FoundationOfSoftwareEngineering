# Testing & Deployment

## Local verification

```bash
npm install
npm run build
npm run dev
```

Manual smoke test: create a fully populated note and refresh; try empty-title validation; edit/delete/Undo; drag between columns and outside the board; add/collapse a column; export/delete/import/refresh; import invalid JSON; search/filter; switch list view; toggle dark mode; check a narrow viewport.

## Docker deployment

```bash
docker build -t shelf-notes:latest .
docker run -d --name shelf-notes -p 8080:80 --restart unless-stopped shelf-notes:latest
```

The application is static; no database or environment variables are required. Run `npm run build` as the release gate. Browser-level drag/drop and persistence should be added to Playwright/Cypress when CI infrastructure is available.
