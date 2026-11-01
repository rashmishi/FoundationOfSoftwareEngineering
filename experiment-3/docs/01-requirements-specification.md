# Requirements Specification — Notes & Kanban Web Application

| Item | Value |
|---|---|
| Document | 01 — Requirements Specification |
| Version | 1.2 (addresses accessibility reviews of v1.0 and v1.1) |
| Date | 2026-10-31 |
| Status | Accepted by accessibility review (2026-10-31) |

## 1. Purpose and scope

This document specifies the requirements for a browser-based single-page application (SPA), built with React, that lets a user:

1. create, view, edit and delete notes (title, description, tags);
2. persist notes in the browser so that they survive a page refresh;
3. export the note collection to a JSON file and import it back;
4. organise notes on a Kanban-style board with user-defined columns, moving notes between the list and the columns and between columns;
5. reach the application from a web browser, served from a single Docker image that can be deployed locally or remotely.

Accessibility is a first-class requirement: the application must be usable by keyboard-only users, screen-reader users, users with low vision or colour-vision deficiencies, users of touch devices, and users who are sensitive to motion. The conformance target is **WCAG 2.2 Level AA**.

Out of scope: multi-user accounts, server-side storage, synchronisation between devices, authentication.

## 2. Definitions

| Term | Meaning |
|---|---|
| Note | A record with a unique identifier, a title (required), a description (optional), zero or more tags, and an optional column assignment. |
| Tag | A short free-text label attached to a note. |
| Note list | The view that shows all notes, regardless of column assignment. |
| Board | The Kanban-style area made of ordered columns. |
| Column | A named container on the board. A note is assigned to at most one column. |
| Unassigned note | A note that is not assigned to any column; it is shown in the note list only. |
| Status message | A short message that confirms the result of an action (e.g. "Note created") or reports an error. |
| Persistent storage | The browser's `localStorage` for the application's origin. |
| Assistive technology (AT) | Screen readers, screen magnifiers, speech input, switch access, etc. |

## 3. Stakeholders and user roles

| Role | Goals |
|---|---|
| User | Manage personal notes and organise them visually on a board, using any input modality (mouse, touch, keyboard, speech, switch) and any assistive technology. |
| System administrator | Deploy and run the application from a single Docker image on a local machine or a remote host. |

## 4. Functional requirements

Each requirement has an identifier (FR-x.y) and is traceable to the user stories listed in section 4.0 via the traceability matrix in section 7. Acceptance criteria are written in Given/When/Then form.

### 4.0 Source user stories

| ID | User story |
|---|---|
| US-1 | As a user, I want to be able to create notes and give them a title, description, and tags. |
| US-2 | As a user, I want to be able to view and manage my notes in a list. |
| US-3 | As a user, I should be able to download and upload the note list as a JSON file. |
| US-4 | As a user, I want to be able to drag notes from the list into a Kanban-style board. |
| US-5 | As a user, I should be able to create new Kanban board columns and move the notes between them. |
| US-6 | As a user, I want to be able to access the application through my web browser. |
| US-7 | As a system administrator, I want to be able to deploy the application to a local or remote system using a single Docker image. |

### General focus-management rule

FR-G.1: After any action that removes, moves or re-renders the element that had keyboard focus, focus shall be placed on a defined, visible element (stated in each requirement below) and shall never fall back to `<body>`.

FR-G.2: Each user-triggered event produces exactly one announcement. When focus is moved to an element whose accessible description already conveys a message (e.g. an invalid field with its error), the message is not additionally sent to a live region.

### FR-1 Note creation

| ID | Requirement |
|---|---|
| FR-1.1 | The application shall provide a "Create note" form with three labelled fields: **Title** (required, single-line text), **Description** (optional, multi-line text), **Tags** (optional). |
| FR-1.2 | The Tags field shall accept one or more tags entered as a comma-separated list. Leading/trailing whitespace shall be trimmed, empty entries discarded, and duplicates (case-insensitive) removed. The field's visible help text shall explain the comma-separated format. |
| FR-1.3 | The Title field shall be marked as required both visually (text "(required)", not colour or an asterisk alone) and programmatically (`required` / `aria-required`). |
| FR-1.4 | When the user submits the form with a non-empty title (after trimming whitespace), the note shall be created with a unique identifier and all entered values, and the form shall be cleared. |
| FR-1.5 | When the user submits the form with an empty or whitespace-only title, the note shall **not** be created. An error message "Title is required." shall be displayed in text next to the Title field, programmatically associated with it (`aria-describedby`), the field shall be marked `aria-invalid="true"`, and keyboard focus shall move to the Title field. Entered description and tags shall be retained. The error message and `aria-invalid` are cleared as soon as the title becomes non-empty or on the next successful submit. Because focus moves to the described field, the error is not additionally sent to the alert region (FR-G.2). |
| FR-1.6 | When a note is created, it shall appear in the note list immediately and a status message `Note '<title>' created.` shall be displayed and announced to assistive technologies without moving focus (polite live region). |
| FR-1.7 | Submitting the form shall be possible with the keyboard (Enter in the title field, or activating the "Create note" button). |

### FR-2 Note list and management

| ID | Requirement |
|---|---|
| FR-2.1 | The note list shall display all existing notes, including notes that are assigned to a board column. |
| FR-2.2 | For each note the list shall show its title (as a level-3 heading), its description, its tags, and the name of the column it is assigned to (or "Not on board"). |
| FR-2.3 | The list shall be exposed as a list (`<ul>`/`<li>`) with an accessible name, and shall show the number of notes (e.g. "3 notes"). When there are no notes an empty-state text shall be shown. |
| FR-2.4 | Each note shall offer **Edit** and **Delete** buttons whose accessible names include the note title (e.g. "Edit note Shopping"). On board cards the accessible name additionally includes the column (e.g. "Edit note Shopping (In progress column)") so that names are distinguishable on the page. All element ids used for ARIA relationships are unique per rendering (list vs. board). |
| FR-2.5 | Activating Edit shall switch the note to an inline edit form pre-filled with the current values, with the same labelling and validation rules as FR-1 (title required). Focus shall move to the Title field of the edit form. The user shall be able to **Save** or **Cancel**. Escape shall cancel. After saving or cancelling, focus shall return to the note's Edit button. |
| FR-2.6 | When edited details are saved, the list and the board shall show the updated values, and a status message `Note '<title>' updated.` shall be announced. |
| FR-2.7 | Activating Delete shall ask for confirmation via an accessible modal dialog (`role="dialog"`/native `<dialog>`, `aria-modal`, labelled by its heading and described by its message; initial focus on the safe **Cancel** button; focus trapped; Escape cancels; focus returned to the triggering control on cancel). On confirmation the note shall be removed from the list and from the board, a status message `Note '<title>' deleted.` shall be announced, and focus shall move to a logical place: when deleted from the note list, the next note's Edit button (or the previous note's if it was last, or the list heading if none remain); when deleted from a board card, the next card's Edit button in the same column (or the previous card's, or the column heading if the column is now empty). |

### FR-3 Persistence

| ID | Requirement |
|---|---|
| FR-3.1 | All notes, the columns and the column assignments shall be saved to persistent storage after every change. |
| FR-3.2 | On application start the saved state shall be loaded; created, edited, imported and moved notes shall be present after a refresh, and deleted notes shall not be present. |
| FR-3.3 | If persistent storage is unavailable or contains corrupted data, the application shall start with an empty state and display an error status message explaining that saved data could not be loaded or will not be saved. |

### FR-4 JSON export and import

| ID | Requirement |
|---|---|
| FR-4.1 | An **Export notes** button shall download a file named `notes-export-YYYY-MM-DD.json` containing a valid JSON document with all existing notes (all fields) and all board columns. |
| FR-4.2 | The export format shall be versioned: `{ "version": 1, "exportedAt": "<ISO-8601>", "columns": [...], "notes": [...] }`. |
| FR-4.3 | An **Import notes** control shall let the user choose a `.json` file through a native, keyboard-operable file picker with a visible label. Choosing a file does not import it; the import starts only when the user activates a separate **Import** button (predictable, 3.2.2). |
| FR-4.4 | Given a file exported by the application, importing it shall load every note in the file with all data preserved (id, title, description, tags, column assignment, timestamps) and the columns it references. Import **replaces** the current notes and columns; before replacing, the user shall confirm in an accessible dialog when the current state is not empty. The dialog follows the same rules as FR-2.7 (initial focus on Cancel, focus trapped, Escape cancels, focus returned to the Import button on cancel). After a successful import focus moves to the note list heading. After a failed import focus stays on (or returns to) the Import button. |
| FR-4.5 | Given a file that is not valid JSON, or valid JSON that does not match the schema (missing/invalid `notes` array, note without a string title, etc.), the import shall be rejected, the current data shall remain unchanged, and an error message describing the problem in plain language (e.g. "Import failed: the file is not valid JSON.") shall be displayed and announced (assertive live region / `role="alert"`). |
| FR-4.6 | After a successful import a status message "Imported N notes." shall be announced and the imported data persisted (FR-3), so it is preserved after a refresh. |

### FR-5 Kanban board — placing notes

| ID | Requirement |
|---|---|
| FR-5.1 | The board shall display columns side by side (wrapping/stacking on narrow viewports), each with a visible name heading and the notes assigned to it. On first start the board shall contain three default columns: "To do", "In progress", "Done". |
| FR-5.2 | The user shall be able to drag a note card from the note list and drop it onto a column; the note shall then be assigned to and displayed in that column. |
| FR-5.3 | While a note is being dragged, the application shall provide visual feedback: the dragged card shall be visibly distinguished (e.g. reduced opacity + dashed outline), and the column under the pointer shall show a highlighted drop zone. Feedback shall not rely on colour alone (a border style/width change and a text cue "Drop here" shall be used). |
| FR-5.4 | When a note is dropped onto a column, it shall be assigned to that column, persisted (FR-3) and a status message `Moved '<title>' to <column>.` shall be announced. |
| FR-5.5 | When a note is dropped outside any column (or the drag is cancelled, e.g. with Escape), its column assignment shall not change. |
| FR-5.6 | **Single-pointer and keyboard alternative (WCAG 2.5.7, 2.1.1):** every drag operation shall have an equivalent that requires neither dragging nor a pointer: each note (in the list and on the board) shall have a labelled **Column** select control ("Column for <title>") listing "Not on board" and every column, paired with a **Move** button ("Move <title>"). On board cards the select, Move button and drag handle names carry the same column suffix as in FR-2.4 (e.g. "Move Shopping (In progress column)"). Changing the select alone does nothing (no change of context on input, 3.2.2); the note is moved only when Move is activated, and the result is announced. This is the primary, documented path for screen-reader users, whose browse mode may intercept arrow keys used by keyboard drag-and-drop. |
| FR-5.6a | After a move made with the Move button, keyboard focus shall be on the moved note's Move button: in the note list it stays on the same button (the list item is not re-mounted); on the board it is placed on the Move button of the moved card in the target column — never on `<body>`. If the note is moved off the board from a board card, focus goes to the note's Move button in the note list. |
| FR-5.7 | Drag-and-drop shall also be operable from the keyboard: focusing a card's drag handle and pressing Space/Enter picks the note up, arrow keys move between columns, Space/Enter drops, Escape cancels. Each step shall be announced to screen readers via a live region (pick-up, current target column, drop or cancel); the drop announcement is the single message for that move (FR-G.2). When pick-up starts in the note list, the first arrow press targets the first column. After a drop, focus is on the drag handle of the card in its new column; after Escape, focus returns to the original drag handle. |
| FR-5.8 | Drag-and-drop shall work with mouse and touch input (pointer events), with a small activation distance so that taps and scrolling are not mistaken for drags. |

### FR-6 Kanban board — columns and moving between columns

| ID | Requirement |
|---|---|
| FR-6.1 | The board shall provide an **Add column** form with a labelled "Column name" field. Submitting a non-empty, unique (case-insensitive) name adds a new column at the end of the board and announces `Column '<name>' added.`. |
| FR-6.2 | Submitting an empty or duplicate name shall not add a column; an inline error ("Column name is required." / "A column with this name already exists.") shall be associated with the field (`aria-describedby`), the field marked `aria-invalid="true"`, and focus kept on the field. The error is cleared when the value changes or on the next successful submit. |
| FR-6.3 | When a note is dragged (or moved with the alternative controls of FR-5.6/5.7) from one column to another, it shall be removed from the original column and added to the target column. A note is never in two columns. |
| FR-6.4 | Column assignments shall be persisted (FR-3) and restored after refresh. |

### FR-7 Access and deployment

| ID | Requirement |
|---|---|
| FR-7.1 | The application shall be accessible in current evergreen browsers (Chrome, Firefox, Safari, Edge) via HTTP at a URL served by the container. |
| FR-7.2 | The application shall be packaged as a **single Docker image** that serves the built static files over HTTP (default port 80 inside the container, mappable to any host port). No other container or service shall be required. |
| FR-7.3 | The image shall be deployable locally (`docker run`) and on a remote host (by pushing to a registry or `docker save`/`docker load`). |
| FR-7.4 | The server shall return `index.html` for unknown paths (SPA fallback) and provide a health-check endpoint. |

## 5. Accessibility requirements (WCAG 2.2 AA)

These requirements apply to every screen and component and are verified during each development step.

### 5.1 Perceivable

| ID | Requirement | WCAG |
|---|---|---|
| AR-P1 | Every non-text element that conveys meaning (icons, drag handles) has a text alternative; purely decorative graphics are hidden from AT (`aria-hidden="true"` / empty `alt`). Icon-only buttons have an accessible name. | 1.1.1 |
| AR-P2 | The application has no audio or video content. If any is added later, captions/transcripts are required. | 1.2.x |
| AR-P3 | Page structure uses semantic HTML: one `<h1>` (application name); `<h2>` for each section (Create note, Import and export, Notes, Board); `<h3>` for each note title in the list and each column name; `<h4>` for each card title inside a column; landmark regions (`<header>`, `<main>`, `<section>` with headings), lists for collections, `<form>`/`<label>` for inputs, `<button>` for actions. Heading levels are not skipped. | 1.3.1 |
| AR-P4 | Reading and focus order follow the visual order: header → create form → import/export → note list → board. | 1.3.2, 2.4.3 |
| AR-P5 | Instructions do not rely on shape, location, or colour alone (e.g. "the red button"). | 1.3.3 |
| AR-P6 | Content works in portrait and landscape and reflows without horizontal scrolling at 320 CSS px width (board columns stack vertically). | 1.3.4, 1.4.10 |
| AR-P7 | Input fields have appropriate `autocomplete`/type attributes where a purpose exists (here: `autocomplete="off"` for free text). | 1.3.5 |
| AR-P8 | Colour is never the only means of conveying information (errors also use text and an icon; drop target also uses border style and text; required fields use text). | 1.4.1 |
| AR-P9 | Text contrast ≥ 4.5:1 (≥ 3:1 for large text); UI component boundaries, focus indicators and state indicators ≥ 3:1 against adjacent colours. Both light and dark colour schemes (following `prefers-color-scheme`) meet these ratios. Under `forced-colors: active` (Windows High Contrast) focus indicators, the drop-zone cue and the dragged-card state remain visible (outlines/borders, not `box-shadow` or background colour only). | 1.4.3, 1.4.11 |
| AR-P10 | Text can be resized to 200 % without loss of content or function; text spacing overrides (line height 1.5, paragraph spacing 2×, letter spacing 0.12 em, word spacing 0.16 em) do not clip content. Sizes are in relative units (`rem`). | 1.4.4, 1.4.12 |
| AR-P11 | No content appears on hover/focus only (tooltips) unless it is dismissible, hoverable and persistent. | 1.4.13 |

### 5.2 Operable

| ID | Requirement | WCAG |
|---|---|---|
| AR-O1 | All functionality, including drag-and-drop, column assignment, editing, deleting, import, export and dialogs, is operable with the keyboard alone, without timing requirements. | 2.1.1 |
| AR-O2 | No keyboard trap: focus can always leave a component with standard keys; modal dialogs trap focus intentionally but close with Escape. | 2.1.2 |
| AR-O3 | No single-character keyboard shortcuts are defined. | 2.1.4 |
| AR-O4 | No time limits. Status messages remain visible until replaced by the next message or dismissed by the user (no automatic disappearance before the user can read them; minimum display time 10 s if auto-hidden is ever introduced, and always available in a message log region). | 2.2.1 |
| AR-O5 | No content flashes more than three times per second. Animations and transitions are disabled when `prefers-reduced-motion: reduce` is set. | 2.3.1, 2.3.3 (AAA, best effort) |
| AR-O6 | A "Skip to main content" link is the first focusable element, visible on focus. | 2.4.1 |
| AR-O7 | The page has a descriptive `<title>` ("Notes & Kanban Board"). | 2.4.2 |
| AR-O8 | Link and button purposes are clear from their text or accessible name (including note titles for per-note actions). | 2.4.4, 2.4.6 |
| AR-O9 | A clearly visible focus indicator (≥ 2 px outline, ≥ 3:1 contrast) is shown on every focusable element, and focused elements are not entirely hidden by sticky content. | 2.4.7, 2.4.11 |
| AR-O10 | Every drag operation has a single-pointer, non-dragging alternative (the Column select + Move button, FR-5.6). | 2.5.7 |
| AR-O11 | Interactive targets are at least 24 × 24 CSS px (goal 44 × 44 for primary actions). | 2.5.8 |
| AR-O12 | Actions are triggered on pointer up (native button behaviour); visible labels are contained in accessible names. | 2.5.2, 2.5.3 |

### 5.3 Understandable

| ID | Requirement | WCAG |
|---|---|---|
| AR-U1 | The document language is declared (`<html lang="en">`). | 3.1.1 |
| AR-U2 | Text uses plain language; error messages say what went wrong and how to fix it. | 3.1.5 (AAA, best effort) |
| AR-U3 | Focusing or changing a field does not cause a change of context. Changing the Column select only changes its value; the note moves when the Move button is activated (FR-5.6), and focus is then placed as defined in FR-5.6a. | 3.2.1, 3.2.2 |
| AR-U4 | Navigation, control placement and naming are consistent across the list and the board (same Edit/Delete/Move controls in the same order). | 3.2.3, 3.2.4 |
| AR-U5 | Input errors are identified in text, associated with the field, and focus is moved to the first invalid field. Labels and instructions are provided for all inputs. | 3.3.1, 3.3.2, 3.3.3 |
| AR-U6 | Destructive or data-replacing actions (delete note, import over existing data) require confirmation. | 3.3.4 |
| AR-U7 | Users are not asked to re-enter information already provided: invalid submissions keep the entered values. | 3.3.7 |

### 5.3a Criteria not applicable or met by design

| WCAG | Status |
|---|---|
| 1.4.5 Images of Text | Not applicable — no images of text are used. |
| 2.2.2 Pause, Stop, Hide | Not applicable — no auto-moving, blinking or auto-updating content. |
| 2.4.5 Multiple Ways | Exception — single-page application whose content is the result of one process. |
| 2.5.1 Pointer Gestures / 2.5.4 Motion Actuation | Met — no path-based or multipoint gestures (drag has an alternative), no device-motion input. |
| 3.1.2 Language of Parts | Known limitation — user-entered note content may be in any language and is not tagged. |
| 3.2.6 Consistent Help | Not applicable — no help mechanism is provided on multiple pages. |
| 3.3.8 Accessible Authentication | Not applicable — no authentication. |

### 5.4 Robust

| ID | Requirement | WCAG |
|---|---|---|
| AR-R1 | Markup is valid; native HTML elements are preferred over ARIA. Where custom widgets are used (draggable cards, dialog), they expose correct name, role, and state (e.g. `aria-roledescription="draggable note"`, `aria-describedby` with usage instructions, `role="dialog"` + `aria-modal="true"` + `aria-labelledby`). | 4.1.2 |
| AR-R2 | Status messages are exposed through live regions: `role="status"` (polite) for confirmations, `role="alert"` (assertive) for errors, so they are announced without receiving focus. The live-region containers are present in the DOM from initial render (empty), and messages are inserted into them later. | 4.1.3 |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 Usability | Primary tasks (create note, move note) require no more than 3 interactions. |
| NFR-2 Performance | The UI responds to an interaction within 100 ms for up to 500 notes. The production bundle (gzipped) is < 250 kB. |
| NFR-3 Reliability | Invalid imports never alter existing data (atomic import). Storage write failures are reported to the user. |
| NFR-4 Compatibility | Latest two versions of Chrome, Firefox, Safari, Edge; tested with NVDA + Firefox and VoiceOver + Safari (or Orca on Linux), keyboard only, and Windows High Contrast mode. The screen-reader test plan explicitly covers the Column select + Move path. |
| NFR-5 Maintainability | TypeScript with strict mode; unit/component tests for business logic and UI; automated accessibility checks (axe-core) in the test suite. |
| NFR-6 Security | No external network calls at runtime; imported content is rendered as text only (no HTML injection). The container runs a minimal web server. |
| NFR-7 Portability | One Docker image, no runtime configuration required; the listening port is mappable. |

## 7. Traceability matrix

| User story | Acceptance criterion | Requirements |
|---|---|---|
| US-1 Create notes | Creating a note with a title succeeds | FR-1.1, FR-1.4, FR-1.7 |
| US-1 Create notes | Title, description and tags are all saved | FR-1.2, FR-1.4 |
| US-1 Create notes | Saving without a title is rejected | FR-1.3, FR-1.5, AR-U5 |
| US-1 Create notes | New note appears in list and a message is shown | FR-1.6, AR-R2 |
| US-1 Create notes | Note details survive a refresh | FR-3.1, FR-3.2 |
| US-2 Manage notes in a list | All existing notes are displayed | FR-2.1, FR-2.3 |
| US-2 Manage notes in a list | Title, description and tags are shown | FR-2.2 |
| US-2 Manage notes in a list | Edits are saved and displayed | FR-2.5, FR-2.6 |
| US-2 Manage notes in a list | Deleted note is removed from the list | FR-2.7 |
| US-2 Manage notes in a list | Deleted note is absent after a refresh | FR-3.2 |
| US-3 JSON export/import | Export downloads a valid JSON file with all notes | FR-4.1, FR-4.2 |
| US-3 JSON export/import | Import of an exported file preserves all data | FR-4.3, FR-4.4 |
| US-3 JSON export/import | Invalid file is rejected with an error message | FR-4.5 |
| US-3 JSON export/import | Imported notes survive a refresh | FR-4.6, FR-3.2 |
| US-4 Drag notes onto the board | Dragged note appears in the target column | FR-5.2, FR-5.6, FR-5.6a, FR-5.7 |
| US-4 Drag notes onto the board | Visual feedback while dragging | FR-5.3 |
| US-4 Drag notes onto the board | Dropped note is assigned to the column | FR-5.4 |
| US-4 Drag notes onto the board | Assignments survive a refresh | FR-3.1, FR-6.4 |
| US-4 Drag notes onto the board | Drop outside a column keeps the original column | FR-5.5 |
| US-5 Columns and moving notes | New column with a name is added | FR-6.1, FR-6.2 |
| US-5 Columns and moving notes | Moving between columns removes from the old and adds to the new | FR-6.3, FR-5.6a |
| US-6 Browser access | Application is reachable in a web browser | FR-7.1, section 5 (AR-*) |
| US-7 Docker deployment | Deployable locally or remotely with a single image | FR-7.2 – FR-7.4, NFR-7 |

## 8. Assumptions and constraints

- Data is stored per browser and per origin; clearing site data removes notes (users are advised to export regularly).
- Import replaces the current data set (rather than merging) so that "all notes contained in the file are loaded and their data is preserved" holds exactly, including ids and column assignments.
- English is the only UI language in version 1.
- Order of notes inside a column is by time of assignment (most recent last); re-ordering within a column is out of scope.
