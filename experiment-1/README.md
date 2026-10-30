# Notes Kanban

Create notes with titles, descriptions and tags, manage them in a list, export/import them as JSON, and organise them on a drag-and-drop Kanban board with your own columns. Data is stored in your browser. Every drag action also has a keyboard-friendly “Column” menu.

## Quick start

```bash
docker build -t notes-kanban .
```

```bash
docker run -d -p 8080:8080 --name notes-kanban notes-kanban
```

Open http://localhost:8080.

Development: `npm install`, then `npm run dev` (http://localhost:5173) and `npm test`.

## Documentation

1. [Requirements Specification](docs/01-requirements-specification.md)
2. [Architecture & Design](docs/02-architecture-and-design.md)
3. [Implementation](docs/03-implementation.md)
4. [Testing & Deployment](docs/04-testing-and-deployment.md)
