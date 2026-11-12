# Notebox

An accessible React notes workspace with local persistence, JSON import/export, and a Kanban board.

## Run locally

```bash
npm install
npm run dev
```

## Deploy with one Docker image

```bash
docker build -t notebox .
docker run --rm -p 8080:80 notebox
```

Then open `http://localhost:8080`.

Notes are stored in the browser's local storage. JSON export/import makes it easy to back up or move them.
