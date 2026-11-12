# Memo — Notes & board

A browser-based notes app with a Kanban board. Notes and columns persist in the browser using `localStorage`.

## Run locally

```sh
npm install
npm run dev
```

## Build and deploy with one Docker image

```sh
docker build -t memo-notes .
docker run --rm -p 8080:80 memo-notes
```

Then open <http://localhost:8080>. The image serves the static React build with Nginx; no application server or database is required. Data belongs to the browser profile and is not shared between devices.
