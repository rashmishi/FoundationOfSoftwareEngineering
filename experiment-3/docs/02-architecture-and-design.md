# Architecture & Design — Notes & Kanban Web Application

| Item | Value |
|---|---|
| Document | 02 — Architecture & Design |
| Version | 1.3 (v1.2 accepted; v1.3 records implementation-time adjustments to the dialog close handling and message dismissal focus) |
| Date | 2026-10-31 |
| Input | 01 — Requirements Specification v1.2 (accepted) |
| Status | Accepted by accessibility review (2026-10-31) |

## 1. Overview

The application is a client-only single-page application (SPA). All data lives in the browser (`localStorage`). A single Docker image builds the static bundle and serves it with nginx.

A text description follows the diagram.

```text
┌──────────────────────── Docker image (nginx:alpine) ────────────────────────┐
│  /usr/share/nginx/html  ← static build (index.html, JS, CSS)                 │
│  nginx: port 80, SPA fallback to index.html, GET /healthz → 200 "ok"         │
└──────────────────────────────────────────────────────────────────────────────┘
                 │ HTTP
                 ▼
┌──────────────────────────────── Browser ────────────────────────────────────┐
│  React 18 SPA                                                                │
│   UI components ──dispatch──► store (useReducer) ──► persistence (localStorage)│
│        ▲                         │                                           │
│        └──────── state ──────────┘                                           │
│   Announcer (live regions)   Focus manager   Drag & drop (dnd-kit + keyboard)│
└──────────────────────────────────────────────────────────────────────────────┘
```

Text description of the diagram: the Docker image contains nginx and the static build. The browser loads the SPA over HTTP. Inside the SPA, UI components dispatch actions to a reducer-based store; every state change is written to `localStorage`. Cross-cutting services are the Announcer (live regions), the Focus manager and the drag-and-drop layer.

## 2. Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5 (strict) | Type safety for the data model and import validation (NFR-5). |
| UI | React 18 | Required by the brief. |
| Build | Vite 5 | Fast builds, small static output, no server runtime needed. |
| Pointer/touch drag-and-drop | `@dnd-kit/core` (PointerSensor only) | Uses pointer events (mouse, pen, touch), supports an activation distance (FR-5.8), does not use HTML5 native DnD (unreliable on touch and not exposed to AT). |
| Keyboard drag-and-drop | Custom handler on the drag-handle button | dnd-kit's keyboard sensor moves by pixel coordinates; the requirement (FR-5.7) is column-to-column movement with defined focus, which a small custom state machine expresses directly. |
| Non-drag alternative | Native `<select>` + `<button>` | Native controls are fully accessible on all platforms (FR-5.6, 2.5.7). |
| Dialogs | Native `<dialog>` with `showModal()` | Provides modal semantics, inert background (focus containment) and Escape handling natively (FR-2.7, FR-4.4). |
| State | `useReducer` + React Context | Small app; a pure reducer is easy to unit-test. |
| Persistence | `localStorage` (key `notes-kanban:v1`) | Required: data survives refresh (FR-3). |
| Unit/component tests | Vitest + React Testing Library + `vitest-axe` (axe-core) | Tests behaviour through roles/labels the way AT users interact; automated a11y checks (NFR-5). |
| Web server | nginx (alpine) | Single small image serving static files (FR-7). |

No CSS framework is used; styles are hand-written CSS with custom properties (design tokens) so that contrast, focus and forced-colors behaviour are fully controlled.

## 3. Data model

```ts
type Id = string;                         // crypto.randomUUID()

interface Column {
  id: Id;
  name: string;                           // unique, case-insensitive, trimmed, non-empty
}

interface Note {
  id: Id;
  title: string;                          // trimmed, non-empty
  description: string;                    // may be empty
  tags: string[];                         // trimmed, non-empty, unique (case-insensitive)
  columnId: Id | null;                    // null = "Not on board"
  createdAt: string;                      // ISO-8601
  updatedAt: string;                      // ISO-8601
  movedAt: string | null;                 // ISO-8601; time of last column assignment (orders cards in a column)
}

interface AppState {
  notes: Note[];                          // list order = creation order
  columns: Column[];                      // board order
}
```

Invariants (enforced by the reducer):

- A note references at most one column (`columnId` is a single value), so a note can never be in two columns (FR-6.3).
- `columnId` always references an existing column or is `null`.
- Default state on first start: no notes, columns "To do", "In progress", "Done" (FR-5.1).

### 3.1 Export file format (FR-4.1, FR-4.2)

```json
{
  "version": 1,
  "exportedAt": "2026-10-31T10:00:00.000Z",
  "columns": [{ "id": "…", "name": "To do" }],
  "notes": [{
    "id": "…", "title": "Buy milk", "description": "2 litres",
    "tags": ["home", "shopping"], "columnId": "…",
    "createdAt": "…", "updatedAt": "…", "movedAt": "…"
  }]
}
```

### 3.2 Import validation (FR-4.4, FR-4.5)

`parseImport(text: string): { ok: true; state: AppState } | { ok: false; error: string }` is a pure function:

| Check | Error message shown to the user |
|---|---|
| `JSON.parse` throws | "Import failed: the file is not valid JSON." |
| Root is not an object, or `notes` is not an array | "Import failed: the file does not contain a notes list." |
| `version` present and not `1` | "Import failed: unsupported file version." |
| A note has no non-empty string `title` | "Import failed: note N has no title." (N is 1-based) |
| A note field has the wrong type (`description` not string, `tags` not string array, …) | "Import failed: note N has an invalid <field>." |
| Duplicate note ids | "Import failed: the file contains duplicate notes." |
| `columns` present but not an array of `{id, name}` | "Import failed: the board columns are invalid." |
| File larger than 5 MB | "Import failed: the file is too large (maximum 5 MB)." |

Normalisation: missing `description` → `""`, missing `tags` → `[]`, missing ids → generated, missing timestamps → now. If `columns` is missing, the current columns are kept. A `columnId` that references no column is set to `null`. The function never mutates the current state; the reducer applies the result in a single `IMPORT` action (atomic import, NFR-3).

## 4. Module structure

```text
src/
  main.tsx                    entry; renders <App/>
  App.tsx                     page layout, landmarks, DnD context
  styles.css                  design tokens, layout, focus, forced-colors, reduced-motion
  model/
    types.ts                  Note, Column, AppState
    reducer.ts                pure reducer + action types
    tags.ts                   parseTags(): comma list → normalised array
    importExport.ts           serialize(), parseImport()
    storage.ts                loadState(), saveState() with error reporting
  state/
    StoreContext.tsx          useReducer + persistence effect; useStore()
    AnnouncerContext.tsx      live regions; announce(), announceError()
    FocusContext.tsx          requestFocus(id) → focuses after next commit
    KeyboardDragContext.tsx   keyboard pick-up / move / drop state machine
  components/
    SkipLink.tsx
    NoteForm.tsx              create form (FR-1)
    NoteFields.tsx            shared Title/Description/Tags fields with validation
    ImportExport.tsx          export button, file input, Import button (FR-4)
    NotesList.tsx             <section> "Notes" with <ul> of NoteCard (FR-2)
    NoteCard.tsx              view + inline edit of one note; variant "list" | "board"
    ColumnMover.tsx           Column <select> + Move button (FR-5.6)
    DragHandle.tsx            pointer (dnd-kit) + keyboard drag (FR-5.2, FR-5.7)
    Board.tsx                 <section> "Board" with columns + AddColumnForm (FR-5, FR-6)
    BoardColumn.tsx           droppable column (useDroppable)
    AddColumnForm.tsx
    ConfirmDialog.tsx         native <dialog> wrapper
  test/                       Vitest specs (*.test.ts[x]) and setup
```

### 4.1 Reducer actions

| Action | Effect |
|---|---|
| `ADD_NOTE {title, description, tags}` | Appends a new note (`columnId: null`). |
| `UPDATE_NOTE {id, title, description, tags}` | Replaces editable fields, sets `updatedAt`. |
| `DELETE_NOTE {id}` | Removes the note. |
| `MOVE_NOTE {id, columnId \| null}` | Sets `columnId` and `movedAt`; no-op if unchanged or column does not exist. |
| `ADD_COLUMN {name}` | Appends a column (caller validates uniqueness; reducer guards too). |
| `IMPORT {state}` | Replaces the whole state. |

Validation that produces user-facing messages (empty title, duplicate column name) is done in the form components before dispatch so that errors can be shown next to the field; the reducer additionally ignores invalid actions defensively.

### 4.2 Persistence (FR-3)

- `StoreProvider` initialises with `loadState()`. On parse/shape failure it returns the default state plus an error flag; the provider then calls `announceError("Saved notes could not be loaded. Starting with an empty board.")`.
- A `useEffect` on `state` calls `saveState(state)`. If `localStorage.setItem` throws (quota, private mode), an error is announced once: "Changes could not be saved in this browser. Export your notes to keep them."
- Stored data uses the same shape as the export format, so `loadState` re-uses `parseImport` for validation.

## 5. User interface design

### 5.1 Page layout and landmarks

```text
[Skip to main content]                       (first focusable, visible on focus)
<header>  h1 "Notes & Kanban Board"
<main id="main">
  status region (role=status)  +  alert region (role=alert)   — always rendered
  <section aria-labelledby> h2 "Create note"        NoteForm
  <section aria-labelledby> h2 "Import and export"  ImportExport
  <div class="workspace">          (two columns ≥ 64rem; stacked below)
    <section aria-labelledby> h2 "Notes"   "3 notes"  <ul> NoteCard×n (h3 titles)
    <section aria-labelledby> h2 "Board"   AddColumnForm
        <ul class="columns"> <li> BoardColumn (h3 name, "2 notes", <ul> NoteCard×n (h4 titles))
  </div>
</main>
```

- Document: `<html lang="en">`, `<title>Notes & Kanban Board</title>`, `<meta name="viewport" content="width=device-width, initial-scale=1">` (zoom not disabled).
- DOM order equals visual order (AR-P4). CSS grid/flex is used without `order` or reversed directions.
- The header is not sticky, so focused elements are never hidden by it (2.4.11).

### 5.2 Visual design tokens (AR-P9)

All colours are defined as CSS custom properties on `:root` and overridden in `@media (prefers-color-scheme: dark)`. Measured contrast ratios (WCAG relative-luminance formula):

| Token | Light | Dark | Used for | Contrast (light / dark) |
|---|---|---|---|---|
| `--bg` | `#ffffff` | `#121418` | page background | — |
| `--surface` | `#f4f5f7` | `#1d2026` | cards, columns | — |
| `--text` | `#1a1d23` | `#e8eaed` | body text on bg / surface | 16.9 / 15.3 on bg; 15.5 / 13.5 on surface |
| `--text-muted` | `#4a5260` | `#b0b6c0` | secondary text (counts, column label) | 7.2 / 8.0 on surface |
| `--primary` | `#0b57d0` | `#8ab4f8` | primary buttons, links, focus ring | 6.4 / 8.8 on bg; 5.9 / 7.7 on surface |
| `--on-primary` | `#ffffff` | `#0b1a33` | text on primary buttons | 6.4 / 8.2 |
| `--danger` | `#b3261e` | `#f2b8b5` | error text, delete button outline | 6.5 / 10.8 on bg; 6.0 / 9.6 on surface |
| `--border` | `#6b7280` | `#8b93a1` | input and card borders | 4.8 / 6.0 on bg; 4.4 / 5.3 on surface (≥ 3:1) |
| `--drop-bg` | `#e8f0fe` | `#1f2b40` | drop-zone background | text 14.7 / 11.8; primary border 5.6 / 6.7 |
| `--tag-bg` / `--tag-text` | `#dbe7fd` / `#0b3d91` | `#1f2b40` / `#c3d7fb` | tag chips | 8.1 / 9.8 |
| `--success` | `#146c2e` | `#6dd58c` | success status icon + text | 6.5 / 10.1 |

- Font: system UI stack, base `1rem` (16 px), line height 1.5, all sizes in `rem`; no fixed heights on text containers so text spacing overrides do not clip (AR-P10).
- Focus indicator: `outline: 3px solid var(--primary); outline-offset: 2px` on `:focus-visible` for every focusable element (≥ 3:1 against bg and surface, AR-O9). Outlines (not box-shadow) are used so they remain in forced-colors mode.
- Targets: buttons and selects have `min-height: 2.75rem` (44 px) for primary actions and at least `1.5rem` (24 px) for compact per-note actions, with ≥ 0.5rem spacing (AR-O11).
- Secondary buttons (Edit, Delete, Move, Cancel, Dismiss) have a visible 1 px `--border` outline and `--surface` background (≥ 3:1 boundary, 1.4.11) so they are recognisable as buttons; Delete uses `--danger` text and border. Primary buttons (Create note, Add column, Import, Export, Save, dialog confirm) are filled `--primary` with `--on-primary` text.
- Errors: red text **plus** an inline "⚠" icon marked `aria-hidden="true"` **plus** the word "Error:" visually hidden, and a 2 px solid danger border on the field (AR-P8).
- Required: label text "Title (required)".
- Reflow (AR-P6): at < 64rem the Notes and Board sections stack; at < 40rem the board columns stack vertically (`grid-template-columns: 1fr`), so there is no horizontal scrolling at 320 CSS px. Above that, columns use `repeat(auto-fit, minmax(14rem, 1fr))` and wrap rather than scroll.
- Forced colors (`@media (forced-colors: active)`): drop zone uses `outline: 3px dashed Highlight`; dragged card uses `outline: 3px dashed CanvasText`; buttons keep `ButtonText` borders; focus uses `outline-color: Highlight`.
- Reduced motion (`@media (prefers-reduced-motion: reduce)`): all transitions/animations set to `none`; the drag overlay does not animate its drop. No flashing content exists (AR-O5).

### 5.3 Components and their accessibility contract

#### NoteForm (FR-1)

- `<form aria-labelledby="create-heading" novalidate>`; `novalidate` disables the browser's own tooltip bubbles so that our persistent, associated message is used instead (custom messages are consistent across browsers and remain on screen).
- Fields (rendered by `NoteFields`):
  - `<label for="create-title">Title (required)</label>` `<input id="create-title" required aria-required="true" autocomplete="off">`
  - `<label for="create-description">Description</label>` `<textarea id="create-description" rows="3">`
  - `<label for="create-tags">Tags</label>` `<input id="create-tags" aria-describedby="create-tags-help" autocomplete="off">` + `<p id="create-tags-help">Separate tags with commas, for example: work, urgent</p>`
- Submit `<button type="submit">Create note</button>`. Enter in the title field submits (native form behaviour).
- On invalid submit: set error state → render `<p id="create-title-error" class="field-error">` with "Title is required."; title gets `aria-invalid="true"` and `aria-describedby="create-title-error"`; focus moves to title. No live-region message (FR-G.2). Description and tags keep their values (AR-U7). The error clears on the first input that makes the title non-empty.
- On valid submit: dispatch `ADD_NOTE`, reset fields, `announce("Note 'X' created.")`, focus stays on the title field so the user can create another note.

#### ImportExport (FR-4)

- **Export notes** `<button>`: builds the JSON string, creates a `Blob` (`application/json`), downloads via a temporary `<a download="notes-export-YYYY-MM-DD.json">`, then `announce("Exported N notes.")`.
- `<label for="import-file">JSON file to import</label>` `<input type="file" id="import-file" accept="application/json,.json">` — a native, keyboard-operable file picker. Choosing a file only stores the selection (no change of context, 3.2.2).
- **Import** `<button>`: disabled is avoided (disabled buttons are not focusable and give no reason); instead, activating it with no file chosen shows the inline error "Choose a JSON file first." associated with the file input and moves focus to it.
- Flow: read file text → `parseImport()` →
  - error: `announceError(message)` in the alert region, current data unchanged, focus stays on the Import button;
  - ok and current state empty: dispatch `IMPORT`, `announce("Imported N notes.")`, focus to the "Notes" `<h2>` (which has `tabindex="-1"`);
  - ok and current state not empty: open ConfirmDialog "Replace current notes?" with message "Importing will replace your N notes and the board columns with the M notes in the file." and buttons **Cancel** (initial focus) / **Replace notes**. Confirm → as above; Cancel → dialog closes, focus returns to Import button.
- The file input is reset after a successful import.

#### NotesList (FR-2)

- `<section aria-labelledby="notes-heading">`, `<h2 id="notes-heading" tabindex="-1">Notes</h2>`, count `<p>3 notes</p>` (singular "1 note").
- `<ul aria-labelledby="notes-heading">` of `<li>` containing `NoteCard variant="list"`; empty state `<p>No notes yet. Create one with the form above.</p>`.

#### NoteCard (FR-2, FR-5)

Shared by list and board; `variant` selects heading level (`h3` list, `h4` board) and the accessible-name suffix (board: ` (<column> column)`). Element ids are prefixed `${variant}-${note.id}` so ids are unique on the page.

View mode, in DOM order:

1. DragHandle button (see below).
2. Title heading (`h3`/`h4`).
3. Description `<p>` (omitted if empty; user text rendered as text, never HTML — NFR-6). `white-space: pre-wrap` preserves line breaks.
4. Tags: `<ul aria-label="Tags">` of `<li class="tag">` chips; "No tags" text if none (visually muted).
5. List variant only: "Board column: In progress" / "Board column: Not on board".
6. ColumnMover.
7. **Edit** and **Delete** buttons with visible text "Edit" / "Delete" and `aria-label` "Edit note <title>" / "Delete note <title>" (+ board suffix). The visible label is the start of the accessible name (2.5.3).

Edit mode: the card content is replaced by a `<form aria-label="Edit note <title>">` using `NoteFields` with ids prefixed by the card id, and **Save** / **Cancel** buttons. Focus → title field on open. Escape (keydown on the form) or Cancel → discard, focus → Edit button. Save valid → dispatch `UPDATE_NOTE`, `announce("Note 'X' updated.")`, focus → Edit button. Save invalid → same error pattern as NoteForm. Only one note can be in edit mode at a time per variant.

Delete: opens ConfirmDialog "Delete note?" with message "'<title>' will be permanently deleted." and buttons **Cancel** (initial focus) / **Delete note**. Confirm → compute focus target (FR-2.7) **before** dispatching `DELETE_NOTE`, then `requestFocus(target)`, `announce("Note 'X' deleted.")`.

#### ColumnMover (FR-5.6, FR-5.6a)

```html
<div class="mover">
  <label for="list-<id>-column">Column</label>          <!-- visible label -->
  <select id="list-<id>-column" aria-label="Column for <title>">  … </select>
  <button id="list-<id>-move" aria-label="Move <title>">Move</button>
</div>
```

- The select's accessible name ("Column for <title>") contains its visible label "Column" (2.5.3). Options: "Not on board", then all columns in order; the current column is selected initially.
- Changing the select only updates local state. **Move** dispatches `MOVE_NOTE` if the value differs; otherwise announces "'X' is already in <column>.".
- Focus after move (FR-5.6a): `requestFocus(<variant-of-destination>-<id>-move)` where destination variant is `list` when the move originated in the list (the list card is not re-mounted; focus effectively stays), `board` when the target is a column and the move originated on the board, and `list` when a board card is moved to "Not on board".
- Announcement: "Moved 'X' to <column>." or "Removed 'X' from the board.".

#### DragHandle (FR-5.2, FR-5.3, FR-5.7, FR-5.8)

```html
<button type="button" class="drag-handle"
        id="board-<id>-handle"
        aria-roledescription="draggable note"
        aria-label="Drag <title>"            <!-- + board suffix -->
        aria-describedby="dnd-instructions"
        aria-pressed="false|true">           <!-- true while picked up via keyboard -->
  <svg aria-hidden="true" focusable="false">⋮⋮ grip icon</svg>
</button>
```

- A single hidden-but-present `<p id="dnd-instructions" hidden>`-equivalent (visually hidden, not `hidden` attribute, so it can be referenced) reads: "Press Space or Enter to pick up the note. Use the left and right arrow keys to choose a column, Space or Enter to drop, Escape to cancel. Clicking the handle alone does not move the note. Alternatively, choose a column in the Column menu and press the Move button."
- Visible size 2.75rem × 2.75rem (44 px). A visible tooltip is **not** used; the grip icon is accompanied by the visible text "Drag" in a small label for sighted keyboard users (AR-P11 avoids hover-only content).
- **Pointer/touch**: the handle receives dnd-kit `listeners` (onPointerDown) via `useDraggable({ id: "<variant>:<noteId>", data: { noteId } })`. PointerSensor `activationConstraint: { distance: 8 }` (FR-5.8). Only the handle starts a drag, so scrolling the page on touch and tapping buttons are unaffected; `touch-action: none` is set on the handle only.
- **Keyboard** (custom, via `KeyboardDragContext`):

| State | Key | Effect | Announcement (status region) |
|---|---|---|---|
| idle | Space / Enter | pick up note; `aria-pressed=true`; target = current column index, or none if from list | "Picked up 'X'. Current column: <name or none>. Use left and right arrows to choose a column." |
| picked | → / ↓ | target = next column (from list: first column); target column shows drop-zone highlight | "<column name>, column N of M." |
| picked | ← / ↑ | target = previous column (stops at first) | same |
| picked | Space / Enter | drop: `MOVE_NOTE` if a target is chosen and differs; focus → `board-<id>-handle` in the target column | "Moved 'X' to <column>." (single message for the move, FR-G.2); no target chosen → "'X' was not moved."; target = current column → "'X' is already in <column>." |
| picked | Escape | cancel; no change; focus stays on the handle | "Move cancelled. 'X' stays in <column / not on board>." |
| picked | Tab / Shift+Tab | cancel; **no** `preventDefault()`; focus moves normally to the next/previous element | same cancel message |
| picked | blur (click elsewhere, AT focus move) | cancel; focus is **not** moved | same cancel message |

Keydown handlers call `preventDefault()` only for Space, Enter, the arrow keys and Escape while picked (never for Tab), so normal page scrolling and Tab navigation work otherwise (no keyboard trap, AR-O2). Screen-reader browse mode may intercept arrows; the instructions direct users to the Column menu as the primary path (FR-5.6).

While a note is picked up with the keyboard, the source card also gets the `is-dragging` class (same visual cue as a pointer drag, FR-5.3), and the target column gets `is-drop-target`; the target column is scrolled into view with `scrollIntoView({ block: "nearest" })` (instant when reduced motion is requested) so it is visible when columns are stacked or the page is zoomed.

A plain click on the handle (including a speech-input "click Drag <title>") does not move the note; the instructions text says so and points to the Column menu and Move button, which is the single-pointer alternative.

- **Pointer drag lifecycle** (`DndContext` in App):
  - `onDragStart`: store active note; `DragOverlay` renders a copy of the card (reduced shadow, `aria-hidden="true"`), the source card gets class `is-dragging` (lighter `--drop-bg` background **and** `outline: 3px dashed var(--primary)` plus a visible "Moving…" label; no opacity reduction, so text contrast is unchanged), FR-5.3.
  - `onDragOver`: the column under the pointer (`useDroppable`'s `isOver`) gets class `is-drop-target`: background `--drop-bg`, border changes from 2 px solid `--border` to 3 px dashed `--primary`, and a visible text "Drop here" appears at the top of the column (non-colour cues, AR-P8).
  - `onDragEnd({ over })` (checks in this order): if `over` is the note's current column → nothing changes, announce "'X' is already in <column>."; else if `over` is a column → `MOVE_NOTE`, announce "Moved 'X' to <column>.", `requestFocus(board-<id>-handle)` only if the drag began from a focused handle; if `over` is null → nothing changes (FR-5.5), announce "'X' was not moved.".
  - `onDragCancel` (Escape during pointer drag) → nothing changes.
  - dnd-kit's built-in `accessibility.announcements` are set to return `undefined` so that only our Announcer speaks (FR-G.2), and its `screenReaderInstructions` are replaced by our shared `dnd-instructions`.

#### Board, BoardColumn, AddColumnForm (FR-5.1, FR-6)

- `<section aria-labelledby="board-heading">` `<h2 id="board-heading">Board</h2>`.
- AddColumnForm: `<form aria-label="Add column">`, `<label for="column-name">Column name</label>` `<input id="column-name" autocomplete="off">` `<button>Add column</button>`. Errors "Column name is required." / "A column with this name already exists." use the same pattern as the title error (aria-invalid + aria-describedby + focus stays). Success: dispatch, clear, `announce("Column 'X' added.")`, focus stays in the field.
- Columns: `<ul class="columns" aria-label="Board columns">`; each `<li>` is a BoardColumn: `<h3 id="col-<id>-heading" tabindex="-1">` name, `<p>` count, `<ul aria-labelledby="col-<id>-heading">` of NoteCard variant `board`, or "No notes in this column." The `<li>` is the droppable node.

#### ConfirmDialog

- Native `<dialog aria-labelledby="dlg-title" aria-describedby="dlg-desc">` opened with `showModal()` (background becomes inert; Escape fires `cancel`).
- Content: `<h2 id="dlg-title">`, `<p id="dlg-desc">`, buttons **Cancel** and the confirm action named by its effect ("Delete note" / "Replace notes").
- Closing (implementation note, v1.3): Cancel, the confirm button and the `cancel` event (Escape) finish **synchronously** — they call `dialog.close()` and then the caller's handler. The `close` event is only a guarded fallback (a browser-initiated close is treated as Cancel), because browsers may defer the `close` event, which was observed in Chrome during testing.
- Initial focus: React's `autoFocus` is **not** used (React calls `.focus()` on mount, which has no effect inside a closed `<dialog>`). Instead, the open effect calls `dialog.showModal()` and then `cancelButtonRef.current.focus()` explicitly. A component test asserts `document.activeElement` is the Cancel button after opening.
- On close (any path) focus goes to the `returnFocusId` supplied by the opener, unless the confirm handler requested a different target via the Focus manager.
- `::backdrop` is semi-transparent; no open/close animation when reduced motion is requested.

### 5.4 Cross-cutting services

#### Announcer (AR-R2, FR-G.2)

```html
<div class="visually-hidden-when-empty status-bar">
  <p role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  <p role="alert"  aria-live="assertive" aria-atomic="true">{errorMessage}</p>
</div>
```

- Both containers are rendered from the first paint, empty (AR-R2).
- `announce(msg)` sets `statusMessage` and clears `errorMessage`; `announceError(msg)` sets `errorMessage` and clears `statusMessage`. To re-announce an identical message, the text is cleared and set again on the next animation frame.
- Persistent problems (storage unavailable, saved data could not be loaded) are shown in a separate **persistent banner** (its `role="alert"` container is rendered empty from first paint and the message is inserted afterwards, then kept visible above the status bar until the condition is resolved or the user dismisses it with the **Dismiss warning** button — named differently from the status bar's **Dismiss message** button). They are not overwritten by later status messages, so the user is never misled into thinking data is saved.
- Dismissing a message removes its Dismiss button, so focus moves to the "Create note" `<h2>` (`tabindex="-1"`, visible focus ring) — never `<body>`.
- Messages are **visible** (status bar under the header) and persist until the next message or until the user activates the **Dismiss message** button (accessible name "Dismiss message"), satisfying FR-1.6 ("a validation message is displayed") and AR-O4 (no time limit). The status bar is not sticky.
- Visible styling: success messages show a "✓" icon (`aria-hidden`) and `--success` left border; errors show "⚠" and `--danger` left border and the visually-hidden prefix is not needed because the text itself starts with "Import failed:" / "Error:".

#### Focus manager (FR-G.1)

- `requestFocus(id)` stores the id; a `useLayoutEffect` in `FocusProvider` runs after every commit, and if a pending id exists and `document.getElementById(id)` is found, calls `.focus()` and clears it. If not found (e.g. the element has not mounted yet), it retries on the next commit (max 3 commits), then falls back to `#main` heading targets (`notes-heading`), never `<body>`.
- Focus targets that are not natively focusable (section and column headings, and `<main id="main">` as the skip-link target) have `tabindex="-1"` and are excluded from tab order. `<main>` shows no outline when focused programmatically.

## 6. Key interaction sequences

### 6.1 Create note (happy path)

1. User types title, description "a, b" tags, presses Enter.
2. NoteForm validates title → dispatch `ADD_NOTE`.
3. Reducer appends note; StoreProvider effect writes `localStorage`.
4. NotesList re-renders with the new `<li>`; count updates.
5. Announcer status: "Note 'Buy milk' created." (visible + announced).
6. Form resets; focus remains on Title.

### 6.2 Drag from list to column (pointer)

1. Pointer down on DragHandle of list card, move ≥ 8 px → `onDragStart` → source card `is-dragging`, overlay follows pointer.
2. Pointer over "In progress" → column `is-drop-target` + "Drop here".
3. Release → `onDragEnd(over=In progress)` → `MOVE_NOTE` → persisted; card rendered in that column; list card shows "Board column: In progress".
4. Announcer: "Moved 'Buy milk' to In progress.".
5. Release outside any column → `over=null` → no state change, "'Buy milk' was not moved.".

### 6.3 Move between columns (keyboard alternative)

1. On board card in "To do", Tab to Column select, choose "Done" (no effect yet).
2. Tab to "Move Buy milk (To do column)", press Enter → `MOVE_NOTE`.
3. Card unmounts from "To do", mounts in "Done"; Focus manager focuses `board-<id>-move` (now named "Move Buy milk (Done column)").
4. Announcer: "Moved 'Buy milk' to Done.".

### 6.4 Import

See 5.3 ImportExport. Invalid → alert "Import failed: the file is not valid JSON."; state untouched.

## 7. Deployment architecture

- **Dockerfile** (multi-stage):
  1. `node:22-alpine` — `npm ci`, `npm run test -- --run` (optional build arg to skip), `npm run build` → `dist/`.
  2. `nginx:1.27-alpine` — copy `dist/` to `/usr/share/nginx/html`, copy `nginx.conf`; `EXPOSE 80`; `HEALTHCHECK` using `wget -qO- http://127.0.0.1/healthz`.
- **nginx.conf**: `try_files $uri $uri/ /index.html` (SPA fallback, FR-7.4); `location = /healthz { return 200 "ok"; }`; long cache headers for hashed `/assets/*`, `no-cache` for `index.html`; gzip; security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a `Content-Security-Policy` of `default-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`).
- **Local**: `docker build -t notes-kanban .` then `docker run -d -p 8080:80 notes-kanban` → `http://localhost:8080`.
- **Remote**: `docker tag`/`docker push` to a registry and `docker run` on the host, or `docker save | ssh host docker load`.
- An optional `docker-compose.yml` is provided for convenience but only runs the same single image.

## 8. Testing strategy (summary; detailed in document 04)

| Level | Tooling | Focus |
|---|---|---|
| Unit | Vitest | reducer invariants, `parseTags`, `parseImport` (valid, invalid JSON, schema errors), storage load/save failure. |
| Component | Vitest + Testing Library (queries by role/label) | create/validation/focus, edit/delete with dialog and focus return, import/export, Column select + Move with focus placement, keyboard drag-and-drop, persistence across remount. |
| Automated a11y | `vitest-axe` on the rendered App in empty, populated, error and dialog-open states | no axe violations (WCAG 2.x A/AA rules). |
| Manual a11y | Keyboard-only (incl. Tab during keyboard drag), screen-reader announcement of the drag handle ("draggable note", pressed state), NVDA+Firefox / Orca+Firefox, VoiceOver+Safari, 200 %/400 % zoom, 320 px width, Windows High Contrast, reduced motion, touch device | checklist in document 04. |
| Deployment smoke | `docker build`, `docker run`, `curl /healthz`, `curl /` | image works standalone. |

## 9. Requirement coverage

| Requirement | Design element |
|---|---|
| FR-1 | NoteForm, NoteFields, `ADD_NOTE`, Announcer |
| FR-2 | NotesList, NoteCard (edit/delete), ConfirmDialog, Focus manager |
| FR-3 | storage.ts, StoreProvider persistence effect |
| FR-4 | ImportExport, importExport.ts (`serialize`, `parseImport`), `IMPORT` |
| FR-5 | DndContext, DragHandle, BoardColumn, ColumnMover, KeyboardDragContext |
| FR-6 | AddColumnForm, `ADD_COLUMN`, `MOVE_NOTE` invariant |
| FR-7 | Dockerfile, nginx.conf |
| FR-G | Focus manager, Announcer single-message rule |
| AR-P* | semantic layout (5.1), tokens (5.2), reflow, forced colors |
| AR-O* | keyboard DnD, skip link, focus styles, target sizes, no time limits, reduced motion |
| AR-U* | labels/help text, error pattern, confirmations, no change on input |
| AR-R* | native elements, ARIA contracts in 5.3, live regions in 5.4 |
