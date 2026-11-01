# Notes Board

A small web app for writing notes and organising them on a Kanban board. Built with
React and designed to meet WCAG 2.2 Level AA. See [ACCESSIBILITY.md](ACCESSIBILITY.md)
for the requirements, design decisions and the limits of the testing so far.

## Run with Docker

Build the image:

```bash
docker build -t notes-board .
```

Run it:

```bash
docker run -d --name notes-board -p 8080:8080 --restart unless-stopped notes-board
```

Then open <http://localhost:8080>.

To deploy to a remote system, push the image to a registry, or copy it across:

```bash
docker save notes-board | ssh user@host docker load
```

The image is self-contained, holds no state and needs no volume or environment
variables. It serves the app with nginx as a non-root user on port 8080. Use
`-p <port>:8080` to publish a different port. It has a health check, and works
over plain HTTP or behind any TLS-terminating reverse proxy.

## Where notes are stored

Notes are kept in each browser's `localStorage`, not on the server. This means:

- Each person's notes are private to their own browser, so the app needs no
  login. It also means that notes do not sync between browsers or devices.
- Clearing site data deletes the notes.
- Storage belongs to the exact address, so changing the host name or port shows
  an empty app. Export first, then import at the new address.

Use **Export notes** for backups and for moving notes between browsers.

Display settings are stored the same way, so each browser keeps its own. The note
being written in the Add a note form is also saved as a draft. Undo history is held
in memory and ends when the page is closed or refreshed.

## Import behaviour

Importing adds to what is already there and never removes anything. A note or
column with the same id as one in the file is replaced by the copy from the file,
so importing the same file twice does not create duplicates. If that would overwrite
a note that has changed, the app asks first. A file that fails validation changes
nothing, and files over 5 MB are rejected.

Export file format:

```json
{
  "version": 1,
  "exportedAt": "2026-11-01T12:00:00.000Z",
  "notes": [
    {
      "id": "…",
      "title": "Required",
      "description": "",
      "tags": ["example"],
      "columnId": "todo",
      "createdAt": "2026-11-01T12:00:00.000Z",
      "updatedAt": "2026-11-01T12:00:00.000Z"
    }
  ],
  "columns": [{ "id": "todo", "name": "To do" }]
}
```

`columnId` is `null` for a note that is not on the board.

## Development

Requires Node.js 24.

```bash
npm install
```

```bash
npm run dev
```

## Tests

Unit tests cover the data logic, file validation and colour contrast:

```bash
npm test
```

Browser tests cover every user story and the accessibility requirements. The first
run needs a browser:

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

To run the browser tests against a running container instead of a local build, set
`BASE_URL`, for example in a POSIX shell:

```bash
BASE_URL=http://localhost:8080 npm run test:e2e
```
