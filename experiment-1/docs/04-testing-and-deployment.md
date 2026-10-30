# 4. Testing & Deployment — Notes Kanban

## 4.1 Prerequisites

| Purpose | Tool | Version used |
|---|---|---|
| Local development and tests | Node.js + npm | Node 22 LTS, npm ≥ 10 |
| Container build and run | Docker (or Podman) | Docker 24+ |

## 4.2 Local development

```bash
npm install          # install dependencies
npm run dev          # dev server with hot reload → http://localhost:5173
npm run typecheck    # TypeScript strict check
npm run build        # production bundle → dist/
npm run preview      # serve dist/ locally → http://localhost:4173
```

## 4.3 Automated tests

```bash
npm test             # run all tests once (CI mode)
npm run test:watch   # re-run tests on file change
```

Stack: **Vitest** (runner), **jsdom** (browser environment), **React Testing Library** + **user-event** (tests drive the UI by accessible role and label, the same way a user or screen reader would). `localStorage` is cleared after every test. A “refresh” is simulated by unmounting the app and mounting a fresh instance, which reloads state from `localStorage`.

| File | Level | Covers |
|---|---|---|
| `src/state/notesReducer.test.ts` | Unit | Tag parsing, title/column validation, every reducer action, import merge rules |
| `src/state/importExport.test.ts` | Unit | Export envelope, filename, lossless round trip, 8 classes of invalid import |
| `src/state/storage.test.ts` | Unit | Defaults, save/load round trip, corrupt-data fallback, failed-write handling |
| `src/App.test.tsx` | Integration | Every acceptance criterion of user stories 1–5, run against the full UI |

Current result: **4 files, 47 tests, all passing.** Tests also run inside `docker build`; a failing test stops the image from being built.

### 4.3.1 Traceability matrix

| Requirement | Automated test(s) (`describe` › `it`) |
|---|---|
| FR-1.1 | Story 1 › creates a note with only a title · reducer › adds a note |
| FR-1.2 | Story 1 › saves title, description and tags · reducer › adds a note with all fields |
| FR-1.3 | Story 1 › does not save a note without a title · reducer › ignores a note without a title · validation › requires a non-blank title |
| FR-1.4 | Story 1 › saves title, description and tags … and confirms creation |
| FR-1.5 | Story 1 › keeps notes after a refresh |
| FR-2.1, FR-2.2 | Story 2 › lists all notes with their details |
| FR-2.3 | Story 2 › edits a note and shows the changes after refresh · rejects an edit that clears the title |
| FR-2.4, FR-2.5 | Story 2 › deletes a note, including after refresh |
| FR-3.1 | Story 3 › downloads a valid JSON file · export › builds a versioned envelope |
| FR-3.2 | Story 3 › imports an exported file · parseImport › round-trips · mergeImport |
| FR-3.3 | Story 3 › rejects an invalid file · parseImport › rejects … (8 cases) |
| FR-3.4 | Story 3 › imports an exported file, preserving data across refresh |
| FR-4.1, FR-4.3, FR-4.4 | Story 4 › drops a list note onto a column and keeps it there after refresh |
| FR-4.2 | Story 4 › gives visual feedback while dragging |
| FR-4.5 | Story 4 › leaves the note in its column when dropped outside any column · ignores drags that are not notes |
| FR-5.1 | Story 5 › adds a named column that persists · rejects an empty column name |
| FR-5.2 | Story 5 › moves a card from one column to another · reducer › moves a note |
| FR-5.3 | reducer › starts with the three default columns |
| FR-7 | Manual checks M-9 and M-10 below |
| NFR-1 | storage tests |
| NFR-2 | Story 4 › offers a non-drag alternative; focus and `aria-*` assertions throughout |

### 4.3.2 Manual acceptance checklist

jsdom does not implement real pointer drag gestures or file downloads, so the following are also checked by hand in a real browser (Chrome, Firefox) against the Docker image:

| # | Step | Expected |
|---|---|---|
| M-1 | Create a note with title, description, tags `work, q4` | Green message “Note … created”; note listed with `#work #q4` |
| M-2 | Click **Add note** with an empty title | Red inline error, focus in Title, nothing added |
| M-3 | Drag the note from the list onto **In Progress** | While dragging: card dimmed with dashed outline, column highlighted. After drop: card in column, list badge reads “In Progress” |
| M-4 | Drag a card from **In Progress** and release over the header | Card stays in In Progress |
| M-5 | Add a column “Review”, drag the card into it | Card leaves In Progress, appears in Review |
| M-6 | Reload the page (F5) | All notes, columns and assignments unchanged |
| M-7 | **Export JSON** | `notes-YYYY-MM-DD.json` downloaded; opens as valid JSON |
| M-8 | Clear site data, reload, **Import JSON** with the file from M-7 | All notes/columns/assignments restored; survive a reload. Importing a `.txt` renamed to `.json` shows a red “Import failed …” alert |
| M-9 | `curl http://localhost:8080/healthz` | `ok` |
| M-10 | `docker inspect --format '{{.State.Health.Status}}' notes-kanban` | `healthy` |
| M-11 | Keyboard only: Tab through the app, move a note using its **Column** menu | Every control reachable with visible focus; move announced in status |
| M-12 | Screen reader (NVDA/VoiceOver): create, move, delete a note | Each action is announced; errors announced immediately |

Steps M-1, M-3 and M-6 were verified in a browser against the built Docker image during development (real mouse drag-and-drop works; no console errors under the Content-Security-Policy).

## 4.4 Deployment with Docker

The application ships as **one Docker image** (`Dockerfile`, multi-stage):

1. `node:22-alpine` installs dependencies with `npm ci`, runs the test suite, and builds `dist/`.
2. `nginxinc/nginx-unprivileged:1.27-alpine` serves `dist/` on port **8080** as a non-root user (UID 101). Final image ≈ 50 MB.

### 4.4.1 Local system

```bash
docker build -t notes-kanban:1.0.0 .
```

```bash
docker run -d --name notes-kanban -p 8080:8080 --restart unless-stopped notes-kanban:1.0.0
```

Open <http://localhost:8080>. To use another host port, change the left side: `-p 3000:8080`.

Or with Compose (builds and runs; `PORT` defaults to 8080):

```bash
PORT=8080 docker compose up -d --build
```

### 4.4.2 Remote system

**Option A — via a registry** (Docker Hub, GHCR, ECR, a private registry):

```bash
docker tag notes-kanban:1.0.0 registry.example.com/team/notes-kanban:1.0.0
```

```bash
docker push registry.example.com/team/notes-kanban:1.0.0
```

Then on the remote host:

```bash
docker run -d --name notes-kanban -p 80:8080 --restart unless-stopped registry.example.com/team/notes-kanban:1.0.0
```

**Option B — without a registry** (copy the image over SSH):

```bash
docker save notes-kanban:1.0.0 | gzip | ssh user@server 'gunzip | docker load'
```

```bash
ssh user@server 'docker run -d --name notes-kanban -p 80:8080 --restart unless-stopped notes-kanban:1.0.0'
```

**Option C — build directly on a remote Docker engine:**

```bash
DOCKER_HOST=ssh://user@server docker build -t notes-kanban:1.0.0 .
```

For a different CPU architecture (e.g. building on x86 for an ARM server) use `docker buildx build --platform linux/arm64 -t … --push .`.

### 4.4.3 Kubernetes (optional)

The image is stateless, so it scales horizontally with no shared storage. Minimal probes:

```yaml
containers:
  - name: notes-kanban
    image: registry.example.com/team/notes-kanban:1.0.0
    ports: [{ containerPort: 8080 }]
    readinessProbe: { httpGet: { path: /healthz, port: 8080 } }
    livenessProbe:  { httpGet: { path: /healthz, port: 8080 } }
    securityContext: { runAsNonRoot: true, readOnlyRootFilesystem: false }
```

### 4.4.4 HTTPS

The container speaks plain HTTP. In production put it behind a TLS-terminating reverse proxy or load balancer (Caddy, Traefik, nginx, a cloud LB). No application configuration changes are needed.

### 4.4.5 Verifying a deployment

```bash
curl -fsS http://<host>:<port>/healthz
```

```bash
docker inspect --format '{{.State.Health.Status}}' notes-kanban
```

### 4.4.6 Upgrade and rollback

Build/pull the new tag, then `docker rm -f notes-kanban` and `docker run …` with the new tag. Roll back by running the previous tag. User data is unaffected: it lives in each user's browser, not in the container. Recommend that users **Export JSON** before major upgrades.

## 4.5 Operational notes

- **Data location:** each user's notes are in their own browser's `localStorage` for the site's origin. Changing the host name or port gives an empty board (different origin) — use Export/Import to move data.
- **Backups:** there is no server-side data to back up; users back up via Export JSON.
- **Logs:** `docker logs notes-kanban` shows nginx access/error logs.
- **Security headers:** strict Content-Security-Policy (`'self'` only), `X-Frame-Options: DENY`, `nosniff`, `no-referrer`.
