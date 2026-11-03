# Testing & Deployment Instructions — Notes & Kanban Board

| Field | Value |
|--|--|
| Document | 04 — Testing & Deployment |
| Version | 2.0 |
| Date | 2026-11-02 |
| Inputs | Documents [01](01-requirements-specification.md), [02](02-architecture-and-design.md), [03](03-implementation.md) (all accepted) |
| Status | Accepted by accessibility review, round 2 (see section 9) |

This document explains how to test the application (automated and by hand, including with assistive technology) and how to deploy it with a single Docker image on a local or remote machine. All commands run from the `experiment-3` folder unless a step says otherwise.

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Automated tests](#2-automated-tests)
3. [Mapping of tests to acceptance criteria](#3-mapping-of-tests-to-acceptance-criteria)
4. [Manual accessibility test plan](#4-manual-accessibility-test-plan)
5. [Deployment with Docker](#5-deployment-with-docker)
6. [Operating the deployment](#6-operating-the-deployment)
7. [Troubleshooting](#7-troubleshooting)
8. [Release checklist](#8-release-checklist)
9. [Review record](#9-review-record)

## 1. Prerequisites

| Purpose | Needed | Check with |
|--|--|--|
| Run tests and develop | Node.js 22 or later, npm 10 or later | `node -v`, `npm -v` |
| Browser end-to-end tests | Playwright's Chromium (installed once, see 2.3) | `npx playwright --version` |
| Build and run the image | Docker 20.10 or later (any engine that supports multi-stage builds) | `docker -v` |
| Manual screen reader tests | NVDA 2024+ with Firefox or Chrome on Windows; VoiceOver with Safari on macOS and iOS; optionally Orca with Firefox on Linux | — |

Install the project's dependencies once:

```bash
npm ci
```

## 2. Automated tests

### 2.1 Summary

| Suite | Command | What it covers | Expected result |
|--|--|--|--|
| Unit, contrast, component, regression | `npm test` | Reducer, validation, import/export, dates, tags, filters, toast queue; colour contrast of every token pair in both themes; each user story through the UI in jsdom, keyboard paths, focus placement, live-region messages, axe-core scans | 146 tests pass |
| Type check | `npm run typecheck` | Strict TypeScript over all source and tests | No errors |
| End-to-end (Chromium) | `npm run test:e2e` | Real pointer drag and drop, reordering, drop outside, reload persistence, export download, import valid and invalid files, keyboard-only flow, axe with contrast in light and dark themes, rendered toolbar and focus-ring contrast, menu not clipped, 320 px reflow, forced colours, reduced motion, text-spacing override, menu/tooltip/dialog keyboard behaviour, toast pause and header Undo | 19 tests pass, 1 skipped (the deployment test below) |
| End-to-end against a running container | `BASE_URL=http://localhost:8080 npm run test:e2e` | The same 19 tests against the production image, plus `deployment.spec.ts`: `/healthz` returns `ok`, and the page and assets send the Content-Security-Policy (including `style-src 'self' 'unsafe-inline'`, needed for WCAG 1.4.12), `X-Content-Type-Options`, `Referrer-Policy` and cache headers | 20 tests pass |

Each test prints its name and a tick (✓) or cross (✘), and the run ends with a line such as "146 passed" or "1 failed". The result never depends on colour in the terminal.

### 2.2 Unit and component tests

```bash
npm test
```

Use `npm run test:watch` while developing. Test files are in `src/test/`:

| File | Content |
|--|--|
| `model.test.ts` | Pure logic: reducer moves and deletes, tag parsing, date validation and formatting, field limits and messages, import/export round trip and every rejection message, filter matching, toast eviction and queue rules. |
| `contrast.test.ts` | Parses `src/styles/tokens.css` and checks 46 colour pairs per theme: text at least 4.5:1, interface parts at least 3:1. |
| `app.test.tsx` | The five user stories end to end in jsdom, plus menus, search, Undo shortcut, F8, dialog live regions and axe-core scans of the main states. |
| `regressions.test.tsx` | Focus after controls that remove themselves, search-announcement timing, keyboard-move target visibility. |

### 2.3 End-to-end tests

Install the browser once, then run the suite. Playwright builds the app and starts a preview server on port 4173 by itself. On Linux, `--with-deps` also installs the system libraries Chromium needs (it may ask for an administrator password):

```bash
npx playwright install --with-deps chromium
```

```bash
npm run test:e2e
```

When a test fails, Playwright saves a trace. Open it with the command printed in the failure message, for example:

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

### 2.4 Testing the production image

Build and start the image as in section 5.1, then run the end-to-end suite against it. This also runs `e2e/deployment.spec.ts`, which checks the health check and the security headers:

```bash
BASE_URL=http://localhost:8080 npm run test:e2e
```

The Docker build also runs `npm test` inside the build stage, so an image is only produced when the unit and component tests pass. Pass `--build-arg SKIP_TESTS=true` only when you have already run them.

## 3. Mapping of tests to acceptance criteria

| User story / requirement | Acceptance criterion | Automated test(s) |
|--|--|--|
| Create notes (FR-1) | Note with title is created; title, description, tags saved | `app.test.tsx` › creates a note with title, description and tags… |
| | Not saved without a title; error shown | `app.test.tsx` › does not save without a title…; `model.test.ts` › validation |
| | Appears in list with confirmation | `app.test.tsx` › creates a note… (toast text + live region) |
| | Survives reload | `app.test.tsx` › keeps notes after a reload |
| Manage list (FR-2) | All notes shown with title, description, tags | `app.test.tsx` › creates a note…; `stories.spec.ts` (all) |
| | Edit saves and displays | `app.test.tsx` › edits a note in a dialog…; › renames a note inline… |
| | Delete removes; gone after reload | `app.test.tsx` › deletes after confirmation… |
| Export / import (FR-4) | Export is valid JSON with all notes | `app.test.tsx` › exports valid JSON…; `stories.spec.ts` › export downloads valid JSON… |
| | Exported file imports with data preserved; survives reload | `app.test.tsx` › imports an exported file…; `model.test.ts` › round-trips… |
| | Invalid file rejected with error | `app.test.tsx` › rejects an invalid file…; `model.test.ts` › rejects invalid file #0–6 |
| Drag to board (FR-5) | Dropped note appears in column; visual feedback | `stories.spec.ts` › drag a note from the list onto a column… |
| | Assignment persists after reload | `stories.spec.ts` › drag a note… (reload); `app.test.tsx` › moves a note… with the Move dialog… |
| | Drop outside keeps original column | `stories.spec.ts` › drag between columns… dropping outside… |
| Columns (FR-6) | New column added | `app.test.tsx` › adds a column and rejects a duplicate name |
| | Drag between columns moves the note | `stories.spec.ts` › drag between columns…; `app.test.tsx` › keyboard drag… |
| Browser access (FR-7.1) | — | `stories.spec.ts`, `accessibility.spec.ts`, `widgets.spec.ts` in Chromium |
| Docker deployment (FR-7.2, 7.3) | — | Section 5.1 smoke test; section 2.4 |
| Additional features (FR-8 – FR-21) | Priorities/tags, toasts/Undo, dialogs, reordering, toolbar, inline edit, menus, search, due dates, collapse, motion, dark mode | `app.test.tsx`, `regressions.test.tsx`, `widgets.spec.ts`, `accessibility.spec.ts`, `stories.spec.ts` › reorder… |
| Accessibility (section 5 of doc 01) | Contrast, structure, keyboard, focus, announcements | `contrast.test.ts`, axe scans in `app.test.tsx` and `accessibility.spec.ts`, plus the manual plan in section 4 |

## 4. Manual accessibility test plan

Automated tools find only part of the accessibility problems (requirement NFR-9). Run this plan before each release and record the results in the table in section 4.9. Use a clean browser profile, or clear the site's data, so each run starts with an empty board. To start with example data instead, import `examples/notes-export-example.json`.

### 4.1 Keyboard only (no mouse or touchpad)

Put the mouse away. For each step, check that the focus ring is clearly visible and never hidden behind the header or a notification.

1. Load the page and press Tab. "Skip to board" appears; press Enter and check that focus is on the "Board" heading. Press Shift+Tab back to the top and repeat with "Skip to notes".
2. Create a note: Tab to "Title", type a title, fill in Description and Tags, choose a Priority and a Due date, then Tab to **Add note** and press Enter. The note appears in the list, a notification says it was created, and focus is back in "Title".
3. Press Enter on an empty Title. The error "Enter a title for the note." appears next to the field and focus stays in it.
4. Edit the note: Tab to its title and press Enter. The "Edit note" dialog opens with focus in Title. Press Tab repeatedly and check that focus stays inside the dialog. Change the title and press "Save changes". Focus returns to the note's title.
5. Rename the note inline: with focus on its title, press F2, type a new title and press Enter. Press F2 again and Escape to cancel.
6. Move the note without dragging: Tab to the "Move to…" button, choose a column and a position, and press "Move". Changing the selects must not move the note until "Move" is pressed.
7. Move the note with keyboard drag: Tab to the note's "Drag" button. The tooltip shows the instructions. Press Space to pick it up, use the Right and Left arrows to change column and Up and Down to change position. The tooltip says where the note will go, and the target column is outlined. Press Space to drop. Repeat and press Escape to cancel; the note returns to where it was.
8. Open the "More actions" menu with Enter. Use Up, Down, Home and End to move through it, type a letter to jump, and press Escape. Focus returns to the menu button.
9. Delete the note: press the "Delete" button. In the dialog, focus starts on "Cancel". Press "Delete note". Focus moves to the next note (or the list heading). Press Ctrl+Z (Cmd+Z on Mac) while not in a text field; the note comes back and gets focus.
10. Press F8 to go to the newest notification. Press Escape to dismiss it; focus returns to where it was.
11. Add a column, collapse and expand it with its arrow button, rename it, move it left and right, and delete it, all from the keyboard.
12. Search and filter: type in "Search notes", use the Tag, Priority and Due date selects, press Escape in the search box, and use "Clear filters".
13. Export notes, then import the file with "Import notes" (Enter opens the file picker). Import a file that is not JSON and check the error message.
14. Open "Keyboard help" and "Settings" and close them with Escape.

**Pass:** every step can be completed, no keyboard trap occurs, and focus is always visible and never lost (it never moves back to the top of the page unexpectedly).

### 4.2 Screen reader

Run the plan in 4.1 with each screen reader below. Switch to focus (forms) mode where the step says so.

| Screen reader | Browser | Notes |
|--|--|--|
| NVDA | Firefox and Chrome (Windows) | Use NVDA+Space to switch between browse and focus mode. Keyboard drag (4.1 step 7) needs focus mode; "Move to…" works in either mode. |
| VoiceOver | Safari (macOS) | Use the rotor (VO+U) to check headings and landmarks. |
| VoiceOver | Safari (iOS) | Use swipe navigation, the rotor and double-tap. Moving notes uses "Move to…". |
| Orca (optional) | Firefox (Linux) | As NVDA. |

Check that the screen reader:

- reads the page title "Notes & Kanban Board" and lists the landmarks: banner, main, search, and the regions "New note", "Notes", "Board", "Board columns", one region per column named by the column (for example "To do (2 notes)"), and "Notifications" — plus "Saved notes could not be read" when that banner is shown;
- lists headings in this order: level 1 app name; level 2 New note, Notes, Board; level 3 note titles in the list and column names; level 4 note titles inside columns;
- reads fields with their label, "required" for Title, the hint, and the error after a failed save;
- reads icon buttons with their full name, for example "Edit, note “Buy milk”, button", and the menu button as "More actions, note “Buy milk”, menu button, collapsed";
- reads the collapse button state ("expanded" or "collapsed") and the drag handle as "toggle button, not pressed" with its instructions;
- announces, without moving focus: "Note “…” created.", "Note “…” deleted.", "“…” moved to In progress, position 1 of 2.", "Import failed. …", "Showing 2 of 5 notes." (once, after a pause in typing);
- announces messages raised while a dialog is open (for example "Note not saved. 2 fields need attention.");
- announces each keyboard-drag step ("In progress, position 2 of 3.") and the cancel message.

**Pass:** all five tasks (create, edit, move to another column, delete, export) can be completed by a screen reader user without sight, and every message above is heard once.

### 4.3 Zoom, reflow and text spacing

1. Set browser zoom to 200 %. Nothing is cut off or overlapping; all functions still work.
2. Set browser zoom to 400 % on a 1280 × 1024 screen (the page is then about 320 × 256 CSS px). Columns stack vertically, the page has no horizontal scroll bar and the header is not sticky. Because the window is less than 500 px tall, only one notification is shown at a time.
3. Small-viewport notifications: still at 400 %, import an invalid file (an error notification that stays), then create a note. The bar "1 more message" with a "Show next" button appears and is reachable with Tab and F8. Press "Show next": the success notification appears and receives focus.
4. Set the window to 320 px wide but full height (or use the browser's responsive mode). Reflow is the same as step 2; up to three notifications can show, which is expected.
5. Apply a text-spacing override (line height 1.5, paragraph spacing 2× font size, letter spacing 0.12 em, word spacing 0.16 em), for example with a text-spacing bookmarklet or browser extension. No text in chips, badges, titles, buttons or columns is cut off.
6. Increase the browser's default font size (not zoom) to 24 px. Text grows and the layout adapts.
7. Rotate a phone or tablet between portrait and landscape. Both work.

### 4.4 Colour, contrast and themes

1. In Settings, choose Light, then Dark, then "Same as my device", and change the operating-system setting. Each takes effect at once, and a reload shows no flash of the other theme.
2. In each theme, check with a contrast checker that the faded toolbar icons, tag chips, priority badges, error text, placeholder-like hints and the focus ring are readable (automated checks cover the tokens; this checks the rendered page).
3. Turn on a grayscale filter (operating-system colour filters, or Chrome DevTools › Rendering › Emulate vision deficiencies › Achromatopsia). Priority (word and bar icon), overdue ("Overdue:" and warning icon), errors (icon and text), drop targets (dashed outline and "Drop here") and the keyboard-move state ("Moving" label) can all still be told apart.
4. Repeat step 3 with protanopia, deuteranopia and tritanopia emulation.
5. Turn on Windows High Contrast (Contrast themes) or emulate `forced-colors: active` (DevTools › Rendering). Text, buttons, input borders, card and column edges, focus rings and drop-target outlines remain visible.

### 4.5 Motion and sound

1. Turn on the operating system's reduce-motion setting (or emulate `prefers-reduced-motion: reduce`). Cards, dialogs, menus and notifications only fade; dragging has no tilt or drop animation; the notification countdown bar is hidden.
2. Turn the setting off and turn on Settings › "Reduce motion". The same applies.
3. Check that nothing flashes and no animation lasts longer than about 0.3 seconds.
4. Sound is off by default. Turn on Settings › "Sound effects" and check that the sounds are short and quiet, and that each one comes with a visible message.

### 4.6 Time limits

1. In Settings, set "Keep notifications for" to 5 seconds. Delete a note. Hover over the notification; it stays while hovered and closes after the pointer leaves.
2. Delete another note, press F8 to move into the notification and wait; it stays while it has focus.
3. Let a notification close by itself, then press the header "Undo" button. The delete is undone.
4. Set "Keep until I close them" and check that notifications stay until dismissed. Error notifications always stay.

### 4.7 Pointer and touch

1. Drag a note from the list onto a column with a mouse: the card lifts and shows "Moving", the column shows a dashed outline and "Drop here". Drop it; it appears in the column.
2. Drag a card between columns and within a column; drop one outside any column and check that it stays where it was.
3. On a touch screen, press and hold a card for about a quarter of a second, then drag. A quick tap or scroll does not start a drag.
4. Check that all buttons are easy to hit: at least 44 by 44 px on touch screens, and at least 32 px for the note toolbar with a mouse.
5. With voice control (Voice Control on macOS/iOS, or Dragon), say "Click Edit", "Click Move to", "Click Add note". The command works because the visible label is the start of each button's name.
6. Tooltips: hover over a toolbar icon until its tooltip appears, then move the pointer onto the tooltip; it stays. It stays until you move away or press Escape, and it never covers the button it describes.
7. Pointer cancellation: press the mouse button on a toolbar button (for example Delete), move the pointer off the button while holding it, then release. The Delete dialog does not open. (Moving more than a few pixels starts a card drag, because the whole card can be dragged; if that happens, release outside any column and the note stays where it was.)

### 4.7a Consistency

1. Check that the header controls are always in the same order and place: Undo, Export notes, Import notes, Keyboard help, Settings — with and without notes, with a dialog closed, and after reloading.
2. Check that every note card shows the same toolbar order (Edit, Move to…, Delete, More actions) and every menu lists items in the same order.

### 4.8 Content and language

1. Check that the language is detected as English (screen readers use an English voice).
2. Read every error message and check that it says what is wrong and how to fix it.
3. Check that no instruction depends on colour, shape or position alone.

### 4.9 Recording results

Copy this table into the release notes and fill it in for each run.

| Area (section) | Browser / AT | Result (Pass / Partial / Fail) | Notes and issue links |
|--|--|--|--|
| Keyboard only (4.1) | | | |
| NVDA + Firefox (4.2) | | | |
| NVDA + Chrome (4.2) | | | |
| VoiceOver + Safari macOS (4.2) | | | |
| VoiceOver + Safari iOS (4.2) | | | |
| Zoom, reflow, text spacing (4.3) | | | |
| Colour, contrast, themes, forced colours (4.4) | | | |
| Motion and sound (4.5) | | | |
| Time limits (4.6) | | | |
| Pointer and touch (4.7) | | | |
| Consistency (4.7a) | | | |
| Content and language (4.8) | | | |

## 5. Deployment with Docker

The application is one static web app served by nginx in a single image. The image needs no database or other service. It runs as a non-root user (uid 101), listens on port 80 inside the container, and answers health checks at `/healthz`.

### 5.1 Local machine

Build the image (this also runs the unit and component tests):

```bash
docker build -t notes-kanban:2.0.0 .
```

Start it, mapping port 8080 on your machine to port 80 in the container:

```bash
docker run -d --name notes-kanban --restart unless-stopped -p 8080:80 notes-kanban:2.0.0
```

Open http://localhost:8080 in a browser.

Smoke test from a terminal. The first command prints `ok`. The second prints `starting` at first and then `healthy`: after about 10 seconds on Docker 25 or later (it checks every 5 seconds during the start period), or after about 30 seconds on older versions (first check one interval after start):

```bash
curl -s http://localhost:8080/healthz
```

```bash
docker inspect --format '{{.State.Health.Status}}' notes-kanban
```

To use another port, change the first number, for example `-p 3000:80`.

With Docker Compose (same image, same settings; the container is also named `notes-kanban`, so the commands in this document work unchanged). Stop any container started with `docker run` first, because the name and port are the same:

```bash
docker compose up -d --build
```

### 5.2 Remote machine

Choose one way to get the image onto the remote machine.

**Option A — through a container registry.** Replace `registry.example.com/team` with your registry:

```bash
docker tag notes-kanban:2.0.0 registry.example.com/team/notes-kanban:2.0.0
```

```bash
docker push registry.example.com/team/notes-kanban:2.0.0
```

Then, on the remote machine:

```bash
docker run -d --name notes-kanban --restart unless-stopped -p 80:80 registry.example.com/team/notes-kanban:2.0.0
```

**Option B — without a registry, copying a file.** On your machine, save the image and copy it (replace `user@server`):

```bash
docker save notes-kanban:2.0.0 | gzip > notes-kanban-2.0.0.tar.gz
```

```bash
scp notes-kanban-2.0.0.tar.gz user@server:
```

On the remote machine, load and run it:

```bash
gunzip -c notes-kanban-2.0.0.tar.gz | docker load
```

```bash
docker run -d --name notes-kanban --restart unless-stopped -p 80:80 notes-kanban:2.0.0
```

**Option C — build on the remote machine.** Copy the `experiment-3` folder (or clone the repository) to the server and run the commands from 5.1 there.

Then open `http://<server-name-or-address>/` in a browser. If a firewall is active, allow the chosen port.

### 5.3 HTTPS

For use over the internet, put the container behind a reverse proxy that terminates HTTPS (for example Caddy, Traefik or nginx with a certificate) and forward requests to the container's port. The application itself needs no configuration for this.

### 5.4 Image details

| Item | Value |
|--|--|
| Base image | `nginxinc/nginx-unprivileged:1.27-alpine` |
| User | 101 (non-root) |
| Port | 80 (Docker allows non-root processes to use low ports inside containers by default) |
| Health check | `GET /healthz` returns `200 ok`; checked every 30 s; `healthy` about 10 s after start on Docker 25+, about 30 s on older versions |
| Security headers | On every response (page, assets, health check): `Content-Security-Policy` (scripts from the same origin only; inline styles allowed so readability tools work), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| Caching | `index.html` revalidated on every visit; hashed assets cached for one year |
| Data | None on the server. Notes are stored in each user's browser. |

## 6. Operating the deployment

### 6.1 Where the data is

Notes live in the browser's local storage for the site's address (scheme, host and port). They are not on the server. As a result:

- Different browsers, browser profiles and devices each have their own notes.
- Changing the address (for example from port 8080 to 80, or from an IP address to a host name) starts with an empty board. **Ask users to export their notes before you change the address**, and to import the file afterwards.
- Clearing the browser's site data deletes the notes. Regular exports are the backup.

### 6.2 Updating to a new version

Build or pull the new image, then replace the container. Users' notes are not affected, because they are in their browsers:

```bash
docker rm -f notes-kanban
```

```bash
docker run -d --name notes-kanban --restart unless-stopped -p 8080:80 notes-kanban:2.0.1
```

To roll back, run the previous tag the same way.

### 6.3 Logs and status

```bash
docker logs --tail 100 notes-kanban
```

```bash
docker ps --filter name=notes-kanban
```

## 7. Troubleshooting

| Problem | Likely cause | What to do |
|--|--|--|
| `docker build` stops at `npx vitest run` | A unit or component test failed. | Run `npm test` locally to see which test fails and why. |
| "port is already allocated" | Another program uses the host port. | Use another host port, for example `-p 8081:80`. |
| Health status is `starting` | Normal for up to about 10 seconds after start (Docker 25+) or 30 seconds (older Docker). | Wait and check again. |
| Container stays "unhealthy" | nginx did not start or the port mapping is wrong. | Check `docker logs notes-kanban`; check that the right side of `-p` is `80`. |
| Container exits with "bind() to 0.0.0.0:80 failed (13: Permission denied)" | The container engine does not allow non-root processes to use low ports (some older or hardened setups). | Run with `--sysctl net.ipv4.ip_unprivileged_port_start=0`, or upgrade Docker. |
| The page is blank | JavaScript is disabled, or a proxy strips files. | The page shows a message when JavaScript is off; otherwise open the browser's developer console and check that `/assets/…` files load. |
| Notes are missing after moving the app | The address changed (section 6.1). | Import the exported file. |
| "Saved notes could not be read" banner | Stored data was damaged. | A copy is kept under the browser storage key `notes-kanban:backup`; import a recent export. |
| Playwright says the browser is missing | Chromium is not installed for this Playwright version. | Run `npx playwright install --with-deps chromium`. |
| Drag tests fail locally | A different viewport hides the cards. | Run with the provided `playwright.config.ts` (1366 × 1400 viewport). |

## 8. Release checklist

1. `npm ci`
2. `npm run typecheck` — no errors.
3. `npm test` — all tests pass.
4. `npm run test:e2e` — all tests pass.
5. Build the image (5.1) and run the end-to-end suite against it (2.4) — 20 tests pass.
6. Run the manual accessibility plan (section 4) and record the results (4.9).
7. Tag and publish the image (5.2).
8. Tell users to export their notes first if the address changes (6.1).

## 9. Review record

| Date | Reviewer | Result |
|--|--|--|
| 2026-11-02 | accessibility-reviewer, round 1 | Not accepted. B1 health-check timing → corrected in 5.1, 5.4 and a new troubleshooting row; measured on Docker 29: `healthy` after 9 s (start-period probing), so the text gives both the Docker 25+ (~10 s) and older (~30 s) timings. B2 test plan vs. code: (a) header claim → new `e2e/deployment.spec.ts`; (b) landmark list → per-column regions and reset banner added; (c) one-notification check → split into 400 % / short window and 320 px wide steps. Suggestions taken: manual steps for hoverable tooltips, pointer cancellation, small-viewport queue and consistency (4.3, 4.7, 4.7a); `container_name` in docker-compose.yml; `--with-deps`; `Referrer-Policy` on assets; "Field / Value" headers on the metadata tables of docs 01–04; "Tab to Add note" in 4.1. |
| 2026-11-02 | accessibility-reviewer, round 2 | **Accepted.** B1 and B2 confirmed resolved; no new problems. Optional clarification applied to 4.7 step 7 (pointer cancellation vs. card drag). |
