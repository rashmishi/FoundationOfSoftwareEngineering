# NoteBoard

An accessible, browser-local React note manager with a Kanban board. Notes, board assignments, and custom columns are persisted in `localStorage`.

## Run locally

```sh
npm install
npm run dev
```

## Build and deploy one Docker image

```sh
docker build -t noteboard .
docker run --rm -p 8080:80 noteboard
```

Open `http://localhost:8080`.

## Interaction notes

- Drag a card onto a board column, or use its **Move to** control for a keyboard-equivalent action.
- Export downloads a JSON backup. Import accepts backups created by this application and validates their shape before replacing local data.
