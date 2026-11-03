# Requirements Specification — Notes Kanban

| Item | Value |
|---|---|
| Document | 01 — Requirements Specification |
| Version | 1.0 |
| Date | 2026-11-02 |
| Source | [00-initial-prompt.md](00-initial-prompt.md) |

## 1. Purpose and scope

This document specifies a browser-based single-page application (SPA), built with React, in which one user can:

1. create, view, edit and delete notes that have a title, description, tags, a priority and an optional due date;
2. keep their notes in the browser so that they survive a page refresh;
3. export all notes to a JSON file and import them again;
4. organise notes on a Kanban board with user-defined columns, by dragging notes from the list onto the board, between columns, and within a column;
5. find notes quickly with live search and filters;
6. reach the application with a web browser, served from one Docker image that runs on a local or remote host.

The application also offers the polish features listed in the brief: colour-coded priorities and tags, auto-dismissing toasts with Undo, modal dialogs, an icon toolbar on hover, inline title editing, "More actions" menus, collapsible columns, animations, sound effects and a dark mode toggle.

**Out of scope:** user accounts, server-side storage, sync between devices or tabs, multi-user collaboration, attachments, recurring tasks, notifications outside the page.

## 2. Definitions

| Term | Meaning |
|---|---|
| Note | A record with a unique id, a required title, an optional description, zero or more tags, a priority, an optional due date and timestamps. |
| Tag | A short free-text label on a note. Tags are trimmed, de-duplicated case-insensitively, and have no `,`. |
| Priority | One of `none`, `low`, `medium`, `high`. |
| Note list | The side panel that shows **every** note, whether or not it is on the board. |
| Board | The Kanban area: an ordered list of columns. |
| Column | A named, ordered container on the board. A note is in at most one column. |
| Unassigned note | A note that is in no column. It appears in the note list only. |
| Toast | A short notification that appears at the bottom of the screen and dismisses itself after a timeout. |
| Overdue | A note whose due date is before today's local date. |
| Persistent storage | The browser's `localStorage` for the application's origin. |

## 3. Stakeholders

| Role | Goals |
|---|---|
| User | Capture notes and organise them visually; find them again quickly. Uses mouse, keyboard or touch. |
| System administrator | Build and run the application from one Docker image, locally or on a remote server, with no extra services. |
| Assessor (course) | Trace every acceptance criterion in the brief to a requirement, a design element and a test. |

## 4. Source user stories

| ID | User story |
|---|---|
| US-1 | As a user, I want to be able to create notes and give them a title, description, and tags. |
| US-2 | As a user, I want to be able to view and manage my notes in a list. |
| US-3 | As a user, I should be able to download and upload the note list as a JSON file. |
| US-4 | As a user, I want to be able to drag notes from the list into a Kanban-style board. |
| US-5 | As a user, I should be able to create new Kanban board columns and move the notes between them. |
| US-6 | As a user, I want to be able to access the application through my web browser. |
| US-7 | As a system administrator, I want to be able to deploy the application to a local or remote system using a single Docker image. |
| AF-1 … AF-13 | The thirteen additional features in the brief (section 5.8). |

## 5. Functional requirements

Acceptance criteria use Given / When / Then. "AC" rows marked **(brief)** are taken from the brief word for word in meaning; others refine them.

### 5.1 Creating notes (US-1)

| ID | Requirement |
|---|---|
| FR-1.1 | The application shows a "New note" form with the fields **Title** (required, max 120 characters), **Description** (optional, max 2000 characters), **Tags** (comma-separated), **Priority** (select, default `none`) and **Due date** (optional date). |
| FR-1.2 | When the user submits the form with a non-blank title, a note is created with all entered values, a new unique id, and `createdAt`/`updatedAt` timestamps. |
| FR-1.3 | When the user submits with a blank title (empty or whitespace only), no note is created, the title field is marked invalid, an inline message "Title is required." is shown next to it, and focus moves to the title field. |
| FR-1.4 | After a note is created it appears at the top of the note list, the form is cleared, and a success toast "Note “&lt;title&gt;” created" is shown. |
| FR-1.5 | Tags are parsed from the comma-separated input: each tag is trimmed, empty tags are dropped, duplicates (case-insensitive) are removed, and the first spelling is kept. A live preview of the parsed tags is shown under the field. |
| FR-1.6 | All notes are saved to persistent storage after every change, so that a refresh restores them. |

**Acceptance criteria**

| AC | Given / When / Then |
|---|---|
| AC-1.1 (brief) | Given the application is open, when I enter a title and submit, then a note with that title is created. |
| AC-1.2 (brief) | Given the form, when I enter a title, description and one or more tags and submit, then the note shows the same title, description and tags. |
| AC-1.3 (brief) | Given the form, when I submit without a title, then no note is created and "Title is required." is shown. |
| AC-1.4 (brief) | When a note is created, then it appears in the note list and a confirmation message is displayed. |
| AC-1.5 (brief) | Given an existing note, when I reload the page, then its title, description, tags, priority and due date are unchanged. |

### 5.2 Viewing and managing notes (US-2)

| ID | Requirement |
|---|---|
| FR-2.1 | The note list shows every note (newest first) with its title, description, tags, priority badge, due date badge and the name of its column (or "Not on board"). |
| FR-2.2 | The list header shows the number of notes; when a search or filter is active it shows "*shown* of *total*". |
| FR-2.3 | The user can edit any field of a note in a modal dialog (see FR-8.3). On save, the note and every place it is shown update at once, `updatedAt` is refreshed, and the change is persisted. |
| FR-2.4 | The user can delete a note after confirming in a modal dialog (see FR-8.3). The note is removed from the list and from its column, and the deletion is persisted. |
| FR-2.5 | When the list is empty, an empty-state message explains how to add a note. |

| AC | Given / When / Then |
|---|---|
| AC-2.1 (brief) | Given several notes, when I view the list, then every note is displayed. |
| AC-2.2 (brief) | Given an existing note, then its title, description and tags are shown in the list. |
| AC-2.3 (brief) | When I edit a note's details and save, then the list shows the new values (and they survive a reload). |
| AC-2.4 (brief) | When I delete a note and confirm, then it is removed from the list. |
| AC-2.5 (brief) | Given a deleted note, when I reload, then it is not displayed. |

### 5.3 Export and import (US-3)

| ID | Requirement |
|---|---|
| FR-3.1 | An **Export** button downloads a file `notes-YYYY-MM-DD.json` that holds a JSON document with: `format: "notes-kanban"`, `version: 1`, `exportedAt` (ISO timestamp), `notes` (all notes with all fields) and `columns` (all columns with their names, collapsed state and ordered note ids). |
| FR-3.2 | An **Import** button opens a file picker for `.json` files. A valid file **replaces** the current notes and columns with those in the file. A success toast reports how many notes and columns were imported and offers **Undo**, which restores the previous data. |
| FR-3.3 | A file is rejected — and the current data is left untouched — when it is not valid JSON, is not an object with a `notes` array, has a note without a non-blank string `title` or string `id`, has duplicate note or column ids, has an invalid priority or due date, has a column that refers to an unknown note, or puts one note in two columns. An error toast states the reason, e.g. "Import failed: notes[2].title must be a non-empty string." |
| FR-3.4 | For convenience, an import file may omit optional fields (`description`, `tags`, `priority`, `dueDate`, timestamps, `columns`); defaults are filled in. A bare JSON array of notes is also accepted. When `columns` is omitted, the current columns are kept (emptied of notes). |
| FR-3.5 | Files over 5 MB are rejected without being parsed. |
| FR-3.6 | Imported data is persisted immediately. |

| AC | Given / When / Then |
|---|---|
| AC-3.1 (brief) | When I export, then a valid JSON file containing all existing notes is downloaded. |
| AC-3.2 (brief) | Given a file exported by the application, when I import it, then all its notes are loaded with their data (title, description, tags, priority, due date, column) unchanged. |
| AC-3.3 (brief) | Given an invalid JSON file, when I import it, then it is rejected, the existing notes are unchanged and an error message is displayed. |
| AC-3.4 (brief) | Given a successful import, when I reload, then the imported notes are still there. |

### 5.4 Dragging notes onto the board (US-4)

| ID | Requirement |
|---|---|
| FR-4.1 | The board starts with three columns: **To do**, **In progress**, **Done**. |
| FR-4.2 | Every note card in the list and on the board can be dragged with a mouse (HTML5 drag and drop). |
| FR-4.3 | While a note is dragged: the source card is dimmed and tilted; a column under the pointer is highlighted; an insertion line shows where the note will land. |
| FR-4.4 | Dropping a note on a column assigns the note to that column at the indicated position, removing it from any other column. The note list shows the new column name on the note. |
| FR-4.5 | Dropping a note anywhere that is not a column (or pressing Escape during the drag) changes nothing. |
| FR-4.6 | Column assignment and order are persisted. |
| FR-4.7 | Keyboard and touch users can do the same through the note's "More actions" menu: **Move to → &lt;column&gt;**, **Move up**, **Move down** and **Remove from board**. |

| AC | Given / When / Then |
|---|---|
| AC-4.1 (brief) | When I drag a note from the list onto a column, then the note appears in that column. |
| AC-4.2 (brief) | Given a note in a column, when I start dragging it, then the card shows visual feedback (dimmed/tilted) and the target column is highlighted. |
| AC-4.3 (brief) | When a note is dropped onto a column, then it is assigned to that column (the list shows the column name). |
| AC-4.4 (brief) | When I reload, then every note is still in its column, in the same order. |
| AC-4.5 (brief) | When a note is dropped outside any column, then it stays in its original column. |

### 5.5 Columns (US-5)

| ID | Requirement |
|---|---|
| FR-5.1 | An "Add column" form at the end of the board takes a name (required, max 40 characters, unique ignoring case). On submit, a new empty column is appended to the board and a toast confirms it. A blank or duplicate name shows an inline error and adds nothing. |
| FR-5.2 | Dragging a note from one column to another removes it from the source column and adds it to the target column at the drop position. |
| FR-5.3 | A column's "More actions" menu offers **Rename**, **Collapse/Expand**, **Move left**, **Move right** and **Delete column**. |
| FR-5.4 | Deleting a column asks for confirmation; its notes are **not** deleted but become unassigned. A toast offers Undo, which puts the column and its notes back. |

| AC | Given / When / Then |
|---|---|
| AC-5.1 (brief) | When I create a column with a name, then it is added to the board. |
| AC-5.2 (brief) | When I drag a note from column A to column B, then it is no longer in A and is in B. |
| AC-5.3 | When I submit the add-column form with no name, then no column is added and an error is shown. |

### 5.6 Browser access (US-6)

| ID | Requirement |
|---|---|
| FR-6.1 | The application is served over HTTP as static files and runs in current versions of Chrome, Edge, Firefox and Safari without plug-ins. |
| FR-6.2 | The layout adapts from 360 px wide phones (list above board, board scrolls horizontally) to wide desktop screens (list beside board). |
| FR-6.3 | Deep links to any path return the application (SPA fallback). |

### 5.7 Deployment (US-7)

| ID | Requirement |
|---|---|
| FR-7.1 | A single `Dockerfile` builds one image that contains the compiled application and a web server; no other container, database or volume is needed. |
| FR-7.2 | The image listens on port 80 inside the container; the host port is chosen at `docker run` time. |
| FR-7.3 | The image exposes a `/healthz` endpoint and a Docker `HEALTHCHECK`. |
| FR-7.4 | The image build runs the unit tests and fails if any fail. |
| FR-7.5 | The image can be moved to a remote host with `docker save`/`docker load` or a registry push/pull, with no rebuild. |

### 5.8 Additional features (AF)

| ID | Feature | Requirement |
|---|---|---|
| AF-1 | Colour-coded priority levels and tags | Priority is shown as a coloured badge and a coloured left border on the card (high = red, medium = amber, low = blue, none = no colour). Each tag gets one of eight colours chosen by a stable hash of its lower-cased text, so a tag always has the same colour. Colour is never the only cue: badges also carry text. |
| AF-2 | Auto-dismissing toasts with Undo | Toasts appear bottom-right, are announced to screen readers (`role="status"`, errors `role="alert"`), and dismiss after 5 s (errors 8 s). Hovering or focusing a toast pauses its timer. A progress bar shows the remaining time. Deleting a note, editing a note, moving a note, deleting a column and importing show an **Undo** button that reverses that one action. At most 4 toasts are visible. |
| AF-3 | Modal dialogs | Editing a note and confirming deletion of a note or column use modal dialogs that trap focus, close on Escape and on the Cancel button, and return focus to the control that opened them. |
| AF-4 | Reordering within a column | Dragging a card above or below another card in the same column reorders it; order is persisted. Keyboard: **Move up / Move down** menu items. |
| AF-5 | Icon toolbar on hover | Each card has a toolbar of icon-only buttons (Edit, Delete, More actions) that fades in when the card is hovered or has keyboard focus, and is always visible on touch devices. Each button has an accessible name and a tooltip. |
| AF-6 | Inline title editing | Double-clicking a card's title (or choosing **Rename** from its menu, or pressing F2 on the focused card) turns the title into a text field. Enter or blur saves; Escape cancels; a blank title is not saved. Column names support the same interaction. |
| AF-7 | "More actions" menus | Notes and columns have a ⋯ button that opens a menu (`role="menu"`) navigable with arrow keys, Home/End, Enter and Escape, closing on outside click. |
| AF-8 | Search and filter with live results | A search box filters notes by title, description and tags as the user types (case-insensitive). Filters for **tag**, **priority** and **due** (any / overdue / due today / due this week / no due date) combine with the search (logical AND). Results update both the list and the board instantly; a **Clear** button resets them. Matching text in titles is highlighted. |
| AF-9 | Due dates with overdue highlighting | A note may have a due date. Cards show it as a badge; overdue notes get a red badge "Overdue · &lt;date&gt;" and a red outline; notes due today get an amber "Due today" badge. Notes in a column named "Done" are never flagged overdue. |
| AF-10 | Collapsible columns | Each column has a collapse toggle. A collapsed column becomes a narrow strip showing its name vertically and its note count; it still accepts dropped notes. The collapsed state is persisted. |
| AF-11 | Animations and transitions | Cards fade/slide in when added, toasts slide in and out, dialogs fade/scale in, drop targets glow, and the theme change cross-fades. All motion is disabled when the user's system requests reduced motion. |
| AF-12 | Sound effects | Short synthesized sounds (Web Audio, no sound files) play on create, delete, drop, undo and error. A header toggle mutes/unmutes sound; the choice is persisted. Sounds never play before the first user interaction. |
| AF-13 | Dark mode toggle | A header button toggles light/dark themes. The first visit follows the operating system preference; the user's choice is persisted. Both themes meet WCAG AA text contrast. |

## 6. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | First load of the production bundle under 150 kB gzipped JS+CSS; interactions with 500 notes respond within 100 ms on a mid-range laptop. |
| NFR-2 | Reliability | Corrupt or unreadable storage never crashes the app: it starts with default data and shows an error toast. Storage write failures (e.g. quota) show an error toast. |
| NFR-3 | Usability | Every action reachable by mouse is reachable by keyboard. Focus is always visible. |
| NFR-4 | Accessibility | Target WCAG 2.2 AA: labelled controls, semantic landmarks and headings, live regions for toasts, colour contrast ≥ 4.5:1 for text, `prefers-reduced-motion` respected. |
| NFR-5 | Security | No data leaves the browser. Imported text is rendered as text, never as HTML. The web server sends a Content-Security-Policy that blocks inline and third-party scripts, plus `X-Content-Type-Options: nosniff`. |
| NFR-6 | Privacy | No cookies, analytics or external requests (no CDN fonts). |
| NFR-7 | Maintainability | TypeScript in strict mode; state changes go through one pure reducer with unit tests; components are small and single-purpose. |
| NFR-8 | Portability | The Docker image is based on official Alpine images and runs on any Linux/amd64 or arm64 Docker host. |
| NFR-9 | Testability | Every brief acceptance criterion is covered by an automated test (unit or end-to-end). |

## 7. Constraints and assumptions

- React 19 + TypeScript, built with Vite. No UI framework and no drag-and-drop library are needed; the native HTML5 drag-and-drop API is used.
- One user per browser profile; data is per origin. Two tabs open at once may overwrite each other's changes (last write wins).
- "A validation message is displayed" (AC-1.4) is interpreted as a confirmation message that the note was created; validation *errors* are covered by AC-1.3.
- Import **replaces** existing data (with Undo) rather than merging, so that an exported file round-trips exactly.

## 8. Traceability matrix

| Requirement | Design element (doc 02) | Tests (doc 04) |
|---|---|---|
| FR-1.1 – FR-1.5 | `NoteForm`, `NoteFields`, `parseTags` | `notes.test.ts`, `e2e/stories.spec.ts` › US-1 |
| FR-1.6, FR-2.x persistence | `storage.ts`, `useBoard` | `storage.test.ts`, US-1/US-2 reload tests |
| FR-2.1 – FR-2.5 | `NoteList`, `NoteCard`, `EditNoteDialog`, `ConfirmDialog` | `boardReducer.test.ts`, US-2 |
| FR-3.x | `transfer.ts`, `Header` (Import/Export) | `transfer.test.ts`, US-3 |
| FR-4.x | `dnd.ts`, `Column`, reducer `moveNote` | `boardReducer.test.ts`, US-4 |
| FR-5.x | `AddColumnForm`, `Column`, reducer column actions | `boardReducer.test.ts`, US-5 |
| FR-6.x | Vite build, responsive CSS, nginx SPA fallback | US-6 e2e, manual browser check |
| FR-7.x | `Dockerfile`, `nginx.conf`, `docker-compose.yml` | Docker smoke test (doc 04 §5) |
| AF-1 | `colors.ts`, `PriorityBadge`, `TagList` | `colors.test.ts`, features e2e |
| AF-2 | `ToastProvider`, inverse actions | features e2e "undo" |
| AF-3 | `Modal` (native `<dialog>`) | features e2e |
| AF-4 | `dnd.ts` drop index, `moveNote` | reducer tests, features e2e |
| AF-5 | `NoteCard` toolbar CSS | features e2e |
| AF-6 | `InlineEdit` | features e2e |
| AF-7 | `Menu` | features e2e |
| AF-8 | `filter.ts`, `FilterBar` | `filter.test.ts`, features e2e |
| AF-9 | `dates.ts`, `DueBadge` | `dates.test.ts`, features e2e |
| AF-10 | `Column` collapsed view | features e2e |
| AF-11 | `styles.css` keyframes, reduced-motion query | manual check |
| AF-12 | `sound.ts`, settings | manual check, settings e2e |
| AF-13 | `settings.ts`, `Header` toggles | features e2e |
