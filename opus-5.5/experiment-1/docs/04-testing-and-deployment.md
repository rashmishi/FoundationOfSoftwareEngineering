# Testing & Deployment — Notes Kanban

| Item | Value |
|---|---|
| Document | 04 — Testing & Deployment |
| Version | 1.0 |
| Date | 2026-11-02 |
| Covers | [01-requirements-specification.md](01-requirements-specification.md) |

All commands run from the `experiment-1/` folder.

## 1. Prerequisites

| For | Needs |
|---|---|
| Development and tests | Node.js 22+, npm 10+ |
| End-to-end tests | Playwright's Chromium: `npx playwright install chromium` (once) |
| Deployment | Docker 24+ (no Node.js needed on the host) |

```bash
npm ci
```

## 2. Test strategy

| Level | Tool | Scope | Count |
|---|---|---|---|
| Unit | Vitest (Node) | Pure model modules: reducer, validation, import/export, storage, filters, dates, colours | 52 tests in 7 files |
| End-to-end | Playwright (Chromium) | The real production build in a browser: every acceptance criterion of the brief (`e2e/stories.spec.ts`) and every additional feature (`e2e/features.spec.ts`) | 34 tests |
| Container smoke test | curl + Playwright with `BASE_URL` | The Docker image: health endpoint, headers, SPA fallback, then the full e2e suite | §5 |
| Manual | Browser | Sound, animations, reduced motion, touch, screen reader | §4 |

The unit tests run inside the Docker build, so an image cannot be built from code that fails them.

### 2.1 Running the tests

```bash
npm test
```

```bash
npm run test:e2e
```

`test:e2e` builds the app, serves it with `vite preview` on port 4173 and runs Playwright headless. Useful variants:

```bash
npx playwright test --ui
```

```bash
npx playwright test --repeat-each=4
```

```bash
BASE_URL=http://localhost:8080 npx playwright test
```

The last one tests any running deployment instead of the local preview — for example the Docker container.

### 2.2 Results at release

| Suite | Result |
|---|---|
| `npm test` | 52 / 52 passed |
| `npm run test:e2e` | 34 / 34 passed; also 136 / 136 with `--repeat-each=4` (no flaky tests) |
| e2e against the Docker container (`BASE_URL=http://localhost:8088`) | 34 / 34 passed |
| `docker inspect` health | `healthy` |

## 3. Acceptance-criteria coverage

| AC | Test |
|---|---|
| AC-1.1 create with title | `stories › AC-1.1` |
| AC-1.2 all values saved | `stories › AC-1.2`; unit `notes.test › createNote` |
| AC-1.3 no title → not saved | `stories › AC-1.3`; unit `validateDraft` |
| AC-1.4 listed + message | `stories › AC-1.4` |
| AC-1.5 survives refresh | `stories › AC-1.5`; unit `storage.test › round-trips` |
| AC-2.1/2.2 all notes with details | `stories › AC-2.1/2.2` |
| AC-2.3 edit saved and shown | `stories › AC-2.3` |
| AC-2.4/2.5 delete, gone after refresh | `stories › AC-2.4/2.5`, `cancelling the delete dialog` |
| AC-3.1 export valid JSON | `stories › AC-3.1`; unit `transfer.test › export` |
| AC-3.2/3.4 import preserves data, survives refresh | `stories › AC-3.2/3.4` (export from one browser profile, import into a fresh one); unit `round trip` |
| AC-3.3 invalid file rejected with message | `stories › AC-3.3`; unit `import validation` (12 cases) |
| AC-4.1/4.3 drag list → column | `stories › AC-4.1/4.3` |
| AC-4.2 visual feedback while dragging | `stories › AC-4.2` (checks `.is-dragging` on the card and `.is-drop-target` on the column mid-drag) |
| AC-4.4 assignments survive refresh | `stories › AC-4.4` |
| AC-4.5 drop outside → unchanged | `stories › AC-4.5` (drops on the header and on the form) |
| AC-5.1 add column | `stories › AC-5.1` |
| AC-5.2 drag between columns | `stories › AC-5.2`; unit `moveNote` |
| AC-5.3 column name validation | `stories › AC-5.3` |
| US-6 browser access / deep links | `stories › US-6` |
| AF-1 … AF-13 | `features.spec.ts`, one test (or more) per feature, named `AF-n …` |

## 4. Manual test checklist

Run `npm run dev` and open http://localhost:5173.

| # | Check | Expected |
|---|---|---|
| M1 | Create, drag, delete notes with sound on | Short chime on create, click on drop, falling tone on delete, buzz on validation error. |
| M2 | Click the speaker button, repeat M1 | Silence; after reload the button still shows muted. |
| M3 | Toggle dark mode | Colours cross-fade; the choice survives reload. With no saved choice, the OS theme is used. |
| M4 | Enable “reduce motion” in the OS, reload | No slide/fade animations; the toast progress bar is hidden; toasts still auto-dismiss. |
| M5 | Hover a toast | Its progress bar pauses; it does not disappear until the pointer leaves. |
| M6 | Keyboard only: Tab to a card, press Enter / F2 / Delete; open “More actions” with Enter, use arrow keys | Edit dialog / inline rename / delete confirmation; menu navigable, Escape returns focus to the ⋯ button. |
| M7 | Move a note with the menu (“Move to”, “Move up/down”) | Same result as dragging. |
| M8 | Narrow the window to 375 px | Sidebar stacks above the board; board scrolls sideways; toolbars stay usable. |
| M9 | On a touch device | Toolbars are always visible; menus provide all drag actions. |
| M10 | Import `examples/sample-notes.json`, then `examples/invalid-notes.json` | First: 5 notes and 3 columns load with one overdue note highlighted. Second: error toast “Import failed: notes[1].title must be a non-empty string.”, data unchanged. |
| M11 | Screen reader (NVDA/VoiceOver) | Toasts announced; dialogs announced by title; buttons have names (“Edit note”, “Delete note”, “More actions”). |

## 5. Deployment

The application is one Docker image: a multi-stage build compiles the static bundle with Node, runs the unit tests, and copies the result into `nginx:1.27-alpine` (~50 MB). There is no database or backend; each user's notes live in their own browser.

### 5.1 Build

```bash
docker build -t notes-kanban:latest .
```

Skip the in-build unit tests only when you must (e.g. a very slow CI runner):

```bash
docker build --build-arg SKIP_TESTS=true -t notes-kanban:latest .
```

### 5.2 Run locally

```bash
docker run -d --name notes-kanban -p 8080:80 --restart unless-stopped notes-kanban:latest
```

Open http://localhost:8080. Or with Compose (same image, port from `PORT`, default 8080):

```bash
docker compose up -d --build
```

### 5.3 Smoke test a running container

```bash
curl -s http://localhost:8080/healthz
```

```bash
curl -sI http://localhost:8080/any/deep/link
```

```bash
docker inspect --format '{{.State.Health.Status}}' notes-kanban
```

Expected: `ok`; `HTTP/1.1 200 OK` with `Content-Security-Policy` and `X-Content-Type-Options: nosniff` headers; `healthy` (after the first 30-second health interval). Then run the full browser suite against it:

```bash
BASE_URL=http://localhost:8080 npx playwright test
```

### 5.4 Deploy to a remote host

**Option A — through a registry** (Docker Hub, GHCR, a private registry):

```bash
docker tag notes-kanban:latest registry.example.com/team/notes-kanban:1.0.0
```

```bash
docker push registry.example.com/team/notes-kanban:1.0.0
```

On the server:

```bash
docker run -d --name notes-kanban -p 80:80 --restart unless-stopped registry.example.com/team/notes-kanban:1.0.0
```

**Option B — no registry** (copy the image over SSH):

```bash
docker save notes-kanban:latest | gzip | ssh user@server 'gunzip | docker load'
```

```bash
ssh user@server docker run -d --name notes-kanban -p 80:80 --restart unless-stopped notes-kanban:latest
```

**Different architecture** (e.g. building on an x86 laptop for an ARM server):

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t registry.example.com/team/notes-kanban:1.0.0 --push .
```

### 5.5 HTTPS

The container serves plain HTTP on port 80. For public deployments put it behind a TLS-terminating reverse proxy (Caddy, Traefik, nginx, a cloud load balancer) and forward to the container's port. Because the app is fully static and stores data client-side, no sticky sessions or shared storage are needed; any number of replicas can run behind the proxy.

### 5.6 Updating and rolling back

```bash
docker pull registry.example.com/team/notes-kanban:1.0.1
```

```bash
docker rm -f notes-kanban
```

```bash
docker run -d --name notes-kanban -p 80:80 --restart unless-stopped registry.example.com/team/notes-kanban:1.0.1
```

`index.html` is served with `Cache-Control: no-cache` and the hashed assets as immutable, so browsers pick up the new version on the next load. Users' notes are unaffected because they are stored in the browser (same origin). To roll back, run the previous tag.

### 5.7 Backups

Data never reaches the server. Users back up with **Export** and restore with **Import**. Note that notes are per browser profile and per origin: moving the app to a different host name or port starts with an empty board — export first, then import on the new address.

### 5.8 Configuration reference

| Setting | Where | Default |
|---|---|---|
| Host port | `docker run -p <host>:80` or `PORT` for Compose | 8080 in examples |
| Security headers, caching | `nginx.conf` | CSP self-only, `nosniff`, `no-referrer` |
| Health endpoint | `nginx.conf › /healthz` | `200 ok` |
| Skip unit tests in build | `--build-arg SKIP_TESTS=true` | `false` |

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Executable doesn't exist … chromium_headless_shell` | Run `npx playwright install chromium`. |
| Port 4173 in use when running e2e | Stop the other `vite preview`, or set `BASE_URL` to an existing server. |
| Notes disappeared after moving the app to a new URL | Storage is per origin; export from the old address, import on the new one. |
| “Your changes could not be saved” toast | Browser storage is full or disabled (e.g. some private modes). Export your notes. |
| “Saved notes were damaged” toast | Stored data failed validation; it was copied to `localStorage['notes-kanban:v1:corrupt']` for recovery. |
