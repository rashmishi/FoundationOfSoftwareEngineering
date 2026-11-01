# Testing & Deployment — Notes & Kanban Web Application

| Item | Value |
|---|---|
| Document | 04 — Testing & Deployment instructions |
| Version | 1.1 (addresses accessibility review of v1.0) |
| Date | 2026-10-31 |
| Inputs | 01 Requirements v1.2, 02 Architecture & Design v1.3, implementation (step 3, accepted) |
| Status | Accepted by accessibility review (2026-10-31) |

## 1. Prerequisites

| Purpose | Software | Tested version |
|---|---|---|
| Development and tests | Node.js and npm | Node 22, npm 10 or later |
| Container build and run | Docker Engine (or Docker Desktop) | 24 or later |
| Manual accessibility tests | A desktop browser plus a screen reader (see section 4) | Current releases |

All commands below are run from the project root folder (`experiment-3/`).

## 2. Running the application for development

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in a browser.

To build and preview the production bundle without Docker:

```bash
npm run build
```

```bash
npm run preview
```

The preview server prints its address (by default `http://localhost:4173`).

## 3. Automated tests

### 3.1 How to run

| Task | Command | Expected result |
|---|---|---|
| Type check | `npx tsc -b` | No output, exit code 0. |
| All tests, once | `npx vitest run` | "Test Files 2 passed", "Tests 44 passed". |
| Tests in watch mode | `npm test` | Re-runs tests when files change. |

Run them in this order:

```bash
npx tsc -b
```

```bash
npx vitest run
```

The Docker build (section 5) also runs the test suite and stops if any test fails.

### 3.2 What the tests cover

Tests live in `src/test/`. Component tests use Testing Library and find elements by **role and accessible name** (for example `getByRole('button', { name: 'Delete note Buy milk' })`), the same way assistive technology finds them. A test therefore fails if a control loses its name or role.

| File | Area | Examples of checks | Requirements |
|---|---|---|---|
| `model.test.ts` | Tags | Trimming, empty entries removed, case-insensitive duplicates removed | FR-1.2 |
| `model.test.ts` | Reducer | Add/update/delete; a note is in only one column; unknown columns ignored; duplicate column names rejected | FR-1, FR-2, FR-6.3 |
| `model.test.ts` | Drop logic | Same column, another column, outside every column | FR-5.4, FR-5.5 |
| `model.test.ts` | Import/export | Export → import round trip keeps every field; 8 kinds of invalid file each give the specified message; missing fields filled in | FR-4 |
| `model.test.ts` | Storage | Save and load; corrupted data reported | FR-3 |
| `app.test.tsx` | Create note | Values saved; message shown; empty title rejected with an associated error, `aria-invalid` and focus; entered values kept; note survives a remount (refresh) | US-1, FR-1, FR-3 |
| `app.test.tsx` | Manage notes | Edit with focus moved in and returned; Escape cancels; delete dialog has initial focus on Cancel; Cancel and Escape return focus; focus after delete; deleted note absent after remount | US-2, FR-2.5, FR-2.7 |
| `app.test.tsx` | Import/export | Export file content; "Choose a JSON file first."; invalid JSON rejected and data unchanged; confirmed import keeps ids, timestamps and column assignment and survives remount; focus after import | US-3, FR-4 |
| `app.test.tsx` | Board | Column menu + Move (select alone does nothing); focus after a move from the list and from a board card; keyboard drag pick-up, arrow, drop with announcements and focus; Escape and Tab cancel; add column with validation; columns survive remount | US-4, US-5, FR-5, FR-6 |
| `app.test.tsx` | Messages | Dismissing a message moves focus to the "Create note" heading, never `<body>` | FR-G.1 |
| `app.test.tsx` | Storage errors | Corrupted saved data shows a persistent warning with a "Dismiss warning" button | FR-3.3 |
| `app.test.tsx` | Automated accessibility | axe-core finds no WCAG 2.0/2.1/2.2 A/AA or best-practice violations: empty page; notes + errors + edit form + board card; delete dialog open | AR-* |

### 3.3 Limits of the automated tests

Automated tools find only part of all WCAG issues. Whether names are meaningful, whether the focus order makes sense and whether the wording is understandable need human judgement, so the manual tests in section 4 are mandatory.

- **jsdom has no layout or colours.** In the test environment axe-core cannot check colour contrast, so the `color-contrast` rule is switched off there. Contrast is covered by the token table in document 02 (section 5.2) and by the browser check in 3.4.
- **Announcements are not heard.** The tests check that the correct text is placed in the live regions. They cannot prove that a screen reader speaks it. Manual screen-reader tests (section 4) are required.
- **Pointer drag-and-drop is not simulated in jsdom.** The drop decision (`resolveDrop`) is unit-tested; the real pointer and touch behaviour is checked in a browser (3.4 and section 4).
- **The modal `<dialog>` is emulated in jsdom** (`src/test/setup.ts`). Real modal behaviour (inert background, Escape) is checked in a browser.

### 3.4 Browser check with axe-core (recommended before each release)

This runs axe-core, including colour contrast, against the real rendered page.

1. Start the development server (`npm run dev`) and open `http://localhost:5173`.
2. Create two notes, move one to a column, and submit the create form once with an empty title so the error state is visible.
3. Open the browser's developer tools console and run:

   ```js
   eval(await (await fetch('/node_modules/axe-core/axe.min.js')).text());
   (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } })).violations
   ```

4. **Expected:** an empty array `[]`.
5. Repeat with the operating system (or developer tools rendering emulation) set to the light and to the dark colour scheme.

Result recorded on 2026-10-31 (Chrome, light and dark schemes, also with an error shown and a note picked up by keyboard): 0 violations.

## 4. Manual test plan

Run these tests before a release. Write the result (Pass/Fail and a note) in the **Result** column of a copy of the tables. Each test names the requirement it checks.

### 4.1 Test environments

| Combination | Why |
|---|---|
| Keyboard only, Chrome or Firefox | Keyboard access (AR-O1) |
| NVDA + Firefox (Windows) | Most common free screen reader |
| VoiceOver + Safari (macOS) | Safari focus and dialog behaviour differ |
| Orca + Firefox (Linux) | Linux alternative when no Windows/macOS is available |
| Windows High Contrast (forced colors) + Edge | AR-P9 forced-colors rules |
| Phone or tablet browser (touch) | Touch drag (FR-5.8) and target size |
| Desktop browser at 200 % and 400 % zoom, and a 320 px wide window | Resize and reflow (AR-P6, AR-P10) |
| Operating-system "reduce motion" setting on | AR-O5 |

### 4.2 Functional tests (user stories)

| ID | Steps | Expected result | Req. | Result |
|---|---|---|---|---|
| M-01 | Enter title "Buy milk", description "2 litres", tags "home, shopping"; activate **Create note**. | Note appears in the Notes list with all three values; message "Note 'Buy milk' created." is shown. | FR-1.4, FR-1.6 | |
| M-02 | Activate **Create note** with an empty title. | No note is created; "Title is required." appears below the field; the field's border becomes thicker (and red); focus is on Title. | FR-1.5 | |
| M-03 | Reload the page. | All notes, tags, columns and assignments are still shown. | FR-3.2 | |
| M-04 | **Edit** a note, change title and tags, **Save**. | List (and board card, if any) shows the new values; message "Note '…' updated.". | FR-2.5, FR-2.6 | |
| M-05 | **Delete** a note, confirm with **Delete note**; reload. | Note is gone from list and board, also after reload. | FR-2.7, FR-3.2 | |
| M-06 | **Export notes**. Open the downloaded `notes-export-YYYY-MM-DD.json`. | Valid JSON with `version`, `exportedAt`, `columns` and every note. | FR-4.1, FR-4.2 | |
| M-07 | Choose the file from M-06, activate **Import**, confirm **Replace notes**; reload. | All notes and assignments are as exported, also after reload; message "Imported N notes.". | FR-4.4, FR-4.6 | |
| M-08 | Import a text file renamed to `.json` (for example containing `hello`). | Error "Import failed: the file is not valid JSON."; existing notes are unchanged. | FR-4.5 | |
| M-09 | With the mouse, drag a note's **Drag** handle from the list onto "In progress". | While dragging: the card shows a dashed outline and "Moving…", the column under the pointer shows a dashed border and "Drop here". After dropping: the note is in "In progress". | FR-5.2 – FR-5.4 | |
| M-10 | Drag a note and release it outside every column (for example on the page header). | The note stays where it was; message "'…' was not moved.". | FR-5.5 | |
| M-11 | Drag a board card from "To do" to "Done"; reload. | The card is only in "Done", also after reload. | FR-6.3, FR-6.4 | |
| M-12 | Type "Review" in **Column name**, **Add column**. Then try "review" and an empty name. | "Review" column added; duplicate and empty names show inline errors and add nothing. | FR-6.1, FR-6.2 | |
| M-13 | On a touch device, drag a note by its handle onto a column; also scroll the page by swiping elsewhere on a card. | Drag works with a finger; swiping on the rest of the card scrolls normally and does not start a drag. | FR-5.8 | |

### 4.3 Keyboard tests

| ID | Steps | Expected result | Req. | Result |
|---|---|---|---|---|
| K-01 | Load the page and press Tab once. | "Skip to main content" link appears; Enter moves focus into the main content. | AR-O6 | |
| K-02 | Tab through the whole page. | Every control is reached in visual order; a clear 3 px outline is always visible; focus is never hidden. | AR-O1, AR-O9, AR-P4 | |
| K-03 | On a list note, Tab to the **Column** menu, choose "Done" with the arrow keys. | Nothing moves yet. | FR-5.6, AR-U3 | |
| K-04 | Tab to **Move** and press Enter. | Note appears in "Done"; focus stays on the Move button; message "Moved '…' to Done.". | FR-5.6, FR-5.6a | |
| K-05 | On a board card, use the Column menu + **Move** to move it to another column. | Focus is on the moved card's Move button in the new column. | FR-5.6a | |
| K-06 | Focus a **Drag** handle, press Space, press Right Arrow twice, press Enter. | Handle shows a pressed state; the target column shows "Drop here"; the note is dropped there; focus is on the moved card's Drag handle. | FR-5.7 | |
| K-07 | Pick up a note with Space, then press Escape; repeat, then press Tab. | Escape: nothing moves, focus stays on the handle. Tab: nothing moves, focus goes to the next control normally. | FR-5.7, AR-O2 | |
| K-08 | Open the delete dialog with the keyboard. Press Tab repeatedly, then Escape. | Focus starts on **Cancel**, stays inside the dialog, and returns to the Delete button after Escape. | FR-2.7, AR-O2 | |
| K-08a | Import a valid file while notes exist. In the confirmation dialog press Escape; import again and activate **Replace notes**. | Focus starts on **Cancel**; Escape returns focus to **Import**; after confirming, focus moves to the "Notes" heading. | FR-4.4 | |
| K-09 | Delete the last note in a column. | Focus moves to that column's heading (with a visible outline). | FR-2.7 | |
| K-10 | Activate **Dismiss message**. | Message is removed; focus moves to the "Create note" heading. | FR-G.1 | |
| K-11 | Edit a note and press Escape inside the form. | Edit is cancelled; focus returns to the Edit button. | FR-2.5 | |

### 4.4 Screen-reader tests (NVDA, VoiceOver, Orca)

| ID | Steps | Expected result | Req. | Result |
|---|---|---|---|---|
| S-01 | List the headings (NVDA: Insert+F7; VoiceOver: rotor). | One level-1 heading; level-2 Create note, Import and export, Notes, Board; level-3 note titles and column names; level-4 card titles. | AR-P3 | |
| S-02 | List the landmarks. | Banner; main; regions Create note, Import and export, Notes, Board; forms Create note and Add column (plus Edit note … while editing). Screen readers differ in how they list region and form landmarks. | AR-P3 | |
| S-03 | Create a note. | "Note '…' created." is spoken without focus moving. | FR-1.6, AR-R2 | |
| S-04 | Submit with an empty title. | Title field is read as "Title (required), invalid, Error: Title is required." (wording varies by reader). | FR-1.5 | |
| S-05 | Move to a board card's buttons. | Names include the column, e.g. "Edit note Buy milk (Done column), button". | FR-2.4 | |
| S-06 | Move a note with the **Column** menu and **Move** button (the primary path for screen-reader users). | Result "Moved '…' to …" is spoken; focus is on the moved card's Move button. | FR-5.6 | |
| S-07 | Focus a **Drag** handle. | Read as "Drag Buy milk, draggable note" (role description), its pressed state, and the instructions. Note how the role description and pressed state are spoken; report confusing output. | FR-5.7, AR-R1 | |
| S-08 | Switch to focus/forms mode if needed, then use the keyboard drag (Space, arrows, Enter). | Each step is spoken: "Picked up…", "<column>, column N of M.", "Moved '…' to …". In browse mode the reader may capture the arrow keys; the Column menu remains available. | FR-5.7 | |
| S-09 | Open the delete dialog. | Dialog title and message are read; focus is on Cancel. | FR-2.7 | |
| S-10 | Import an invalid file. | Error is spoken immediately (alert). | FR-4.5 | |
| S-11 | Activate a **Drag** handle with a plain click or speech command "click Drag …". | Nothing moves (as documented in the instructions). Use the Column menu instead. | FR-5.6 | |

### 4.5 Visual, zoom and motion tests

| ID | Steps | Expected result | Req. | Result |
|---|---|---|---|---|
| V-01 | Set the window to 320 px wide (or zoom to 400 % at 1280 px). | No horizontal scrolling; board columns are stacked; all controls usable. | AR-P6 | |
| V-02 | Zoom text to 200 %. | No text is cut off or overlapping. | AR-P10 | |
| V-03 | Apply a text-spacing bookmarklet (line height 1.5, letter spacing 0.12 em, word spacing 0.16 em, paragraph spacing 2 em). | No text is clipped. | AR-P10 | |
| V-04 | Switch between light and dark colour schemes. | All text and borders remain clearly readable (see token contrast table in document 02). | AR-P9 | |
| V-05 | Turn on Windows High Contrast and repeat M-09 and K-02. | Focus outline, dragged-card outline and drop-zone outline remain visible. | AR-P9 | |
| V-06 | Turn on "reduce motion" and pick up a note with the keyboard while columns are stacked. | Target column scrolls into view instantly; no animations. | AR-O5 | |
| V-07 | Check every visible message, error and drop-zone state for a non-colour cue. | Each has text and/or an icon or border style change as well as colour. | AR-P8 | |
| V-08 | On a phone, try the primary buttons (Create note, Add column, Import, Export, Drag handles) and the per-note buttons. | Primary actions are about 44 px tall; no control is smaller than 24 × 24 px (also checked by the axe `target-size` rule in 3.4). | AR-O11 | |

## 5. Deployment with Docker

The application is delivered as **one Docker image**. It builds the app, runs the tests, and serves the result with nginx on port 80 inside the container. No database or other service is needed; notes are stored in each user's browser.

### 5.1 Build the image

```bash
docker build -t notes-kanban:1.0.0 -t notes-kanban:latest .
```

The build fails if any test fails. To skip the tests (for example on a slow build machine, when the tests already passed in CI):

```bash
docker build --build-arg SKIP_TESTS=true -t notes-kanban:1.0.0 .
```

### 5.2 Run locally

```bash
docker run -d --name notes-kanban -p 8080:80 --restart unless-stopped notes-kanban:1.0.0
```

Open `http://localhost:8080`. To use another host port, change the first number, for example `-p 3000:80`.

Alternatively, with Docker Compose (it runs the same single image):

```bash
docker compose up -d --build
```

### 5.3 Verify the deployment

| Check | Command | Expected result |
|---|---|---|
| Health endpoint | `curl http://localhost:8080/healthz` | `ok` |
| Application page | `curl -s http://localhost:8080/ \| grep "<title>"` | `<title>Notes &amp; Kanban Board</title>` |
| SPA fallback | `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/any/path` | `200` |
| Container health | `docker inspect --format '{{.State.Health.Status}}' notes-kanban` | `healthy` (about 30 s after start) |

Then open the address in a browser and run M-01 and M-03.

### 5.4 Deploy to a remote host

**Option A — through a container registry** (Docker Hub, GitHub Container Registry, a private registry). Replace `registry.example.com/team` with your registry path.

```bash
docker tag notes-kanban:1.0.0 registry.example.com/team/notes-kanban:1.0.0
```

```bash
docker push registry.example.com/team/notes-kanban:1.0.0
```

On the remote host:

```bash
docker run -d --name notes-kanban -p 80:80 --restart unless-stopped registry.example.com/team/notes-kanban:1.0.0
```

**Option B — without a registry**, copying the image over SSH. Replace `user@remote-host` with your server.

```bash
docker save notes-kanban:1.0.0 | gzip | ssh user@remote-host 'gunzip | docker load'
```

```bash
ssh user@remote-host 'docker run -d --name notes-kanban -p 80:80 --restart unless-stopped notes-kanban:1.0.0'
```

Then run the checks in 5.3 against the remote address.

### 5.5 HTTPS and reverse proxies

The container serves plain HTTP. For a public deployment, put it behind a TLS-terminating reverse proxy or load balancer (for example Caddy, Traefik, or nginx on the host) and forward requests to the container port. The application works over plain HTTP too (it does not require browser features that are limited to secure contexts), but HTTPS is recommended.

### 5.6 Update and roll back

```bash
docker pull registry.example.com/team/notes-kanban:1.0.1
```

```bash
docker rm -f notes-kanban
```

```bash
docker run -d --name notes-kanban -p 80:80 --restart unless-stopped registry.example.com/team/notes-kanban:1.0.1
```

To roll back, run the previous tag in the same way. User data is not affected by updates or rollbacks because it is stored in each user's browser. Tell users to **export** their notes before clearing browser data or changing to another browser or device.

### 5.7 Image contents and configuration

| Item | Value |
|---|---|
| Base image | `nginx:1.27-alpine` (build stage `node:22-alpine` is not in the final image) |
| Port | 80 (container) |
| Health check | `GET /healthz` every 30 s |
| Static files | `/usr/share/nginx/html` |
| Server config | `nginx.conf` → `/etc/nginx/conf.d/default.conf` |
| Security headers | `Content-Security-Policy` (self only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| Caching | `index.html`: `no-cache`; `/assets/*` (hashed): one year, immutable |
| Runtime configuration | None required |

### 5.8 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker build` stops at the test step | A test failed | Run `npx vitest run` locally and read the failure. |
| "port is already allocated" | Host port in use | Use another host port, e.g. `-p 8081:80`. |
| Page loads but notes disappear | Browser in private mode or site data cleared | Use a normal window; export notes regularly. When the browser refuses to save, a warning that starts with ⚠ and reads "Changes could not be saved in this browser. Export your notes to keep them." appears at the top of the main content. |
| Warning "Saved notes could not be loaded" | Stored data was changed or corrupted | Import a previous export. |

## 6. Release checklist

1. `npx tsc -b` and `npx vitest run` pass.
2. Browser axe check (3.4) shows no violations in light and dark schemes.
3. Manual tests in section 4 pass, at minimum: K-01 – K-11 (including K-08a), S-03, S-04, S-06, S-08, S-09, S-10, V-01, V-05, M-09, M-13.
4. Image builds and passes the checks in 5.3.
5. Image is tagged with a version number and pushed.
