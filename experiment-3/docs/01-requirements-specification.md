# Requirements Specification — Notes & Kanban Board

| Field | Value |
|--|--|
| Document | 01 — Requirements Specification |
| Product | Notes & Kanban Board (single-page React web application) |
| Version | 2.0 |
| Date | 2026-11-02 |
| Status | Accepted by accessibility review, round 3 (see section 10) |

## 1. Purpose and scope

This document states what the Notes & Kanban Board application must do. It turns the user stories into numbered, testable requirements, adds the requirements for the extra features (priorities, toasts with Undo, dialogs, reordering, note toolbars, inline title editing, "More actions" menus, search and filter, due dates, collapsible columns, animations, sound, dark mode), and sets accessibility requirements that every feature must meet.

The application runs in the browser. It has no server-side logic and no user accounts. All data is kept in the browser's local storage on the user's device. It is shipped as one Docker image.

Out of scope: multi-user sync, sign-in, server-side storage, mobile native apps.

## 2. Definitions

| Term | Meaning |
|--|--|
| Note | An item with a title (required), description, tags, priority, optional due date, and an optional column. |
| Note list | The section that shows every note, whether or not it is on the board. |
| Board | The Kanban board: an ordered set of columns. |
| Column | A named group on the board. A note can be in at most one column. |
| Unassigned note | A note that is not in any column. It is shown in the note list only. |
| Toast | A short message that appears in a corner of the screen, may offer an action (for example Undo), and closes by itself after a set time. |
| Move dialog / Move menu | The non-drag way to put a note in a column or change its place in a column. |
| Persist | Save to local storage so the data is still there after the page is reloaded. |

Requirement keywords: **must** = mandatory; **should** = expected unless there is a stated reason not to; **may** = optional.

## 3. Users and stakeholders

| Role | Needs |
|--|--|
| End user | Create, organise, find and move notes quickly, with mouse, touch, keyboard, voice control or a screen reader. |
| End user with a disability | Includes people who are blind or have low vision, colour vision deficiency, motor impairments (keyboard-only, switch, voice control), vestibular disorders (motion sensitivity), hearing loss, and cognitive or learning disabilities. Their needs are covered in section 5. |
| System administrator | Deploy the application to a local or remote machine with a single Docker image and one command. |

## 4. Functional requirements

Each requirement lists acceptance criteria (AC) taken from the user stories. "Given / When / Then" wording is kept where the story used it.

### FR-1 Create notes

| ID | Requirement |
|--|--|
| FR-1.1 | The user must be able to create a note from a "New note" form that has the fields Title (required), Description (optional, multi-line), Tags (optional), Priority (None, Low, Medium, High; default None), and Due date (optional). |
| FR-1.2 | Tags must be entered as comma-separated text. Leading and trailing spaces are removed, empty tags are dropped, and duplicates (ignoring letter case) are removed. The form must say in visible text that tags are separated by commas. |
| FR-1.3 | When the user saves with a title, the note must be created with every value entered. |
| FR-1.4 | When the user tries to save without a title (empty or only spaces), the note must not be saved. A text error message must appear next to the Title field ("Enter a title for the note."), the field must be marked invalid for assistive technology, and focus must move to the Title field. |
| FR-1.5 | When a note is created, it must appear in the note list and a confirmation message ("Note "<title>" created.") must be shown and announced to screen readers without moving focus. The form must then be cleared and focus must return to the Title field so another note can be added. |
| FR-1.6 | A new note must be persisted at once, so it is still there after the page is reloaded. |
| FR-1.7 | Field limits must be stated in each field's hint text ("Up to 200 characters"; tags: "Separate tags with commas. Each tag up to 40 characters."). Input must never be silently cut off: no `maxlength` truncation on paste. Instead, a value over its limit gives a text error when the user saves, using the pattern in A-UN-3: "Title can be at most 200 characters (you have 230).", "Description can be at most 5000 characters (you have 5120).", "Tag "…" is longer than 40 characters. Shorten it.", "Enter a valid date, for example 2026-11-03." A character count ("180 of 200 characters") is shown under Title and Description once 90 % of the limit is reached, and is announced politely only when the limit is crossed. |
| FR-1.8 | When a save is refused, everything the user entered must stay in the form so they only fix the error (no re-entry). |

AC (from story): new note with a title is created; title, description and tags are all saved; saving without a title is refused; the created note appears in the list with a confirmation message; the note survives a reload.

### FR-2 View and manage notes in a list

| ID | Requirement |
|--|--|
| FR-2.1 | The note list must show all notes (subject only to the search and filter the user has chosen, FR-9). When a filter hides notes, the list must say so in text using the single wording "Showing 3 of 10 notes" (FR-9.3), and offer a "Clear filters" button. |
| FR-2.2 | Each note in the list must show its title, description, tags, priority, due date (if any) and the column it is in (or "Not on board"). |
| FR-2.3 | The user must be able to edit all of a note's fields in an Edit dialog (FR-11). Saving must update the note everywhere it is shown and persist the change. The same title rule as FR-1.4 applies. |
| FR-2.4 | The user must be able to delete a note. Deleting asks for confirmation in a dialog (FR-11). After deletion the note is removed from the list and the board, a toast offers Undo (FR-12), and the deletion is persisted, so the note does not return after a reload (unless the user chose Undo). |
| FR-2.5 | After a note is deleted, focus must move to a sensible place: the next note in the same list, else the previous one, else the list heading. |

### FR-3 Persistence

| ID | Requirement |
|--|--|
| FR-3.1 | All notes, columns, note order and column membership must be saved to local storage after every change. |
| FR-3.2 | User preferences (theme, sound on/off, reduced motion, toast duration) must be saved separately and restored on reload. |
| FR-3.3 | If stored data cannot be read (corrupt or from an unknown version), the application must start with an empty board and default columns, keep the unreadable data under a backup key, and show a message that explains this in plain words. |
| FR-3.4 | If saving fails (for example storage is full), the application must show an error message saying the last change could not be saved. |

### FR-4 Export and import JSON

| ID | Requirement |
|--|--|
| FR-4.1 | An "Export notes" button must download a file named `notes-YYYY-MM-DD.json`. The file must be valid JSON and contain every note (all fields) and every column (name, order, collapsed state, note order), plus a format name and version. |
| FR-4.2 | An "Import notes" control must let the user choose a `.json` file with a standard file picker. It must be reachable and operable with the keyboard and named "Import notes". |
| FR-4.3 | Given a file exported by the application, importing must load all notes and columns from the file with their data preserved. Import replaces the current notes and columns. Before replacing, a confirmation dialog must say how many notes will be replaced and how many will be loaded. A toast with Undo is shown afterwards. |
| FR-4.4 | Given a file that is not valid JSON, or valid JSON that does not match the format (missing title, wrong types, unknown column reference, and so on), the import must be rejected, current data must not change, and an error message must say what is wrong and what to do ("The file is not valid JSON. Choose a file exported from this application."). The error must be announced to screen readers and stay visible until the user dismisses it or starts another import. |
| FR-4.5 | Imported notes must be persisted so they are still there after a reload. |

### FR-5 Put notes on the board by drag and drop

| ID | Requirement |
|--|--|
| FR-5.1 | The user must be able to drag a note from the note list and drop it on a column. The note then appears in that column (at the drop position, or at the end). |
| FR-5.2 | When dragging starts, the application must give visual feedback that does not rely on colour alone: the dragged card is lifted (shadow and slight scale), a placeholder with a dashed outline shows the original place, and the column under the pointer shows a thick outline and the text "Drop here". |
| FR-5.3 | Dropping on a column must assign the note to that column and persist the assignment. |
| FR-5.4 | Dropping outside any column must leave the note where it was (same column and position, or unassigned). |
| FR-5.5 | After a reload, every note must still be in its column, in the same order. |
| FR-5.6 | Each successful move must be announced to screen readers, for example ""Buy milk" moved to In progress, position 2 of 4." |
| FR-5.7 | Every drag action must have a way to do the same thing without dragging (see FR-6.4 and A-OP-5). |

### FR-6 Create columns and move notes between them

| ID | Requirement |
|--|--|
| FR-6.1 | The user must be able to add a column by entering a name in an "Add column" form. The name is required, up to 60 characters (same rules and error handling as the note title, FR-1.4, FR-1.7, FR-1.8) and must be unique ignoring letter case; a duplicate name gives the error "A column named "<name>" already exists. Choose a different name." |
| FR-6.2 | On first start the board must have three columns: "To do", "In progress", "Done". |
| FR-6.3 | Dragging a note from one column to another must remove it from the first column and add it to the second, and persist the change. |
| FR-6.4 | Each note must offer a "Move to…" action (in its "More actions" menu and as a toolbar button) that opens a dialog where the user picks a column (or "Not on board") and a position, then confirms. This works with mouse, touch, keyboard and screen reader and does not need dragging. |
| FR-6.5 | Notes must also be movable with the keyboard alone through keyboard drag, on board cards and on note-list items: (a) the drag handle is a `button` named "Drag, note "<title>"" whose `aria-describedby` points to visible-on-request instructions: "Press Space to pick up. Use Left and Right arrows to change column, Up and Down arrows to change position. Press Space to drop or Escape to cancel. Screen reader users can also use the Move to… button."; the Keyboard help dialog presents the Move to… dialog as the main non-drag method for screen reader users, because arrow keys may not reach the page in browse mode; (b) Space or Enter picks the note up; the handle then has `aria-pressed="true"`, the card is shown lifted with a thick dashed outline and the text "Moving", and the pick-up is announced: "Picked up "Buy milk". Column To do, position 1 of 3." For a note-list item that is not on the board: "Picked up "Buy milk". Not on board. Press Right arrow to choose a column."; (c) Left/Right arrows move the note to the previous/next column (from the note list, Right goes to the first column), keeping the same position where possible, else the end; Up/Down arrows change its position within the column; collapsed columns can be targets (the note is put at the end); each step is announced: "To do, position 2 of 3."; at an edge nothing moves and "Already at the top of To do." (or bottom / first column / last column) is announced; (d) Space or Enter drops: the move is applied, persisted, announced ("Dropped "Buy milk" in In progress, position 2 of 4.") and focus stays on the note's drag handle in its new place (for a drag that started in the note list, focus stays on that note-list item's drag handle, since the item stays in the list and also appears on the board); (e) Escape cancels: the note returns to exactly its original place, "Move cancelled. "Buy milk" returned to To do, position 1." is announced, and focus stays on the drag handle; (f) Tab or clicking elsewhere while a note is picked up also cancels, as in (e). |
| FR-6.6 | Each column's "More actions" menu must offer: Rename column, Move column left, Move column right, Collapse/Expand, Delete column. Deleting a column asks for confirmation; its notes become unassigned (they are not deleted); a toast offers Undo. |
| FR-6.7 | Moving a column left or right must change its order and persist it. |

### FR-7 Access and deployment

| ID | Requirement |
|--|--|
| FR-7.1 | The application must work in the current versions of Chrome, Edge, Firefox and Safari on desktop and mobile. |
| FR-7.2 | The application must be delivered as a single Docker image that serves the built files over HTTP. `docker run -p 8080:80 <image>` must be enough to use it at `http://localhost:8080` (or the remote host's address). |
| FR-7.3 | The image must include a health check and must not need any other service. |

### FR-8 Priorities and colour-coded tags

| ID | Requirement |
|--|--|
| FR-8.1 | Each note has a priority: None, Low, Medium, High. Low, Medium and High are shown as a badge with the word ("High priority"), an icon whose shape differs by level (one, two or three bars), and a colour. None shows no badge. |
| FR-8.2 | Each tag is shown as a chip with its text. Chips get a colour from a fixed palette, chosen from the tag text so the same tag always has the same colour. Colour is extra information only; the tag text is always shown. |
| FR-8.3 | Every colour pair used for badges and chips must meet the contrast rules of A-PE-4 in both light and dark themes. |

### FR-9 Search and filter with live results

| ID | Requirement |
|--|--|
| FR-9.1 | A search box (labelled "Search notes") must filter notes in the list and on the board as the user types, matching title, description and tags, ignoring letter case. |
| FR-9.2 | Filters must be available for: Tag (any tag in use), Priority, and Due date (Any, Overdue, Due in the next 7 days, No due date). |
| FR-9.3 | The number of matching notes must be shown in text with the single wording "Showing 3 of 10 notes" and announced to screen readers politely exactly once per change: after the user pauses typing (about 500 ms), and after each filter change. The visible count text itself is not a live region, so the result is not read twice. |
| FR-9.4 | Changing search or filters must not move focus or change anything other than which notes are shown. |
| FR-9.5 | A "Clear filters" button must reset search and filters. Pressing Escape in the search box clears the search text. |
| FR-9.6 | When nothing matches, the list and each column must say so in text ("No notes match the current search."). |

### FR-10 Due dates and overdue highlighting

| ID | Requirement |
|--|--|
| FR-10.1 | A note may have a due date, entered with a standard date field that also accepts typed input. |
| FR-10.2 | The due date must be shown in words with the full date, weekday and month names written out ("Due Tuesday 3 November 2026"), in a `<time datetime="2026-11-03">` element. |
| FR-10.3 | A note whose due date is before today and that is not in a column named "Done" must be marked overdue with the visible word "Overdue", a warning icon, and a coloured border. Notes due today show "Due today". |
| FR-10.4 | Overdue status must be checked again when the date changes while the page is open (checked at least every minute). |
| FR-10.5 | A typed date that is not a real date must be rejected on save with the text error "Enter a valid date, for example 2026-11-03." (FR-1.7). Because a native date field reports a typed impossible date as an empty value, the check must use the field's `validity.badInput` so the error is never silently skipped. |

### FR-11 Modal dialogs for editing and confirmation

| ID | Requirement |
|--|--|
| FR-11.1 | Editing a note, moving a note (FR-6.4), deleting a note, deleting a column, importing (FR-4.3), Settings (FR-21.1) and Keyboard help (FR-21.2) must use modal dialogs. |
| FR-11.2 | Each dialog must: have a visible title used as its accessible name; move focus into the dialog when opened (to the first field, or for confirmations to the least destructive button, "Cancel"); keep Tab and Shift+Tab inside the dialog; close with Escape and with a visible "Cancel" or "Close" button; return focus to the control that opened it (or, if that control no longer exists, to the sensible place from FR-2.5). |
| FR-11.3 | Confirmation dialogs must state the consequence in words ("Delete note "Buy milk"? You can undo this for a short time.") and name the destructive button by its action ("Delete note"), not "OK". |
| FR-11.4 | Content behind an open dialog must be inert (not reachable by keyboard or screen reader). |

### FR-12 Toast notifications with Undo

| ID | Requirement |
|--|--|
| FR-12.1 | Results of actions (created, saved, deleted, moved, imported, column added) must appear as toasts. They must be announced by screen readers without moving focus: success messages politely, errors assertively. |
| FR-12.2 | Undoable actions (delete note, delete column, import, move note, edit note) must show an "Undo" button in the toast. Undo restores the exact previous state, persists it, and is announced ("Undo: note "Buy milk" restored."). |
| FR-12.3 | Toasts must close by themselves after a default of 8 seconds. The time must pause while the pointer is over the toast, while any toast has keyboard focus, and while the browser tab is hidden. |
| FR-12.4 | In Settings, the user must be able to choose the toast duration: 5, 8, 15 or 30 seconds, or "Keep until I close them". |
| FR-12.5 | Every toast must have a "Dismiss" button. The keyboard shortcut F8 must move focus to the newest toast (F8 is not used by browsers or common screen readers on its own, and does not switch keyboard layouts as Alt+Shift does on Windows). Escape in a toast must dismiss it. Focus after Dismiss, Undo or Escape follows FR-22. |
| FR-12.6 | The most recent undoable action must also be undoable from a header "Undo" button (its accessible name starts with "Undo" and says what it will undo, for example "Undo, delete note "Buy milk""; when there is nothing to undo it stays focusable with `aria-disabled="true"` and the name "Undo, nothing to undo"), and with Ctrl+Z (Cmd+Z on Mac) when focus is not in a text field, for as long as no newer undoable action has happened — even after its toast has closed. This means Undo never depends on reaching the toast in time. |
| FR-12.7 | Error toasts (import failed, save failed) must not close by themselves. |
| FR-12.8 | Toasts must not cover the element that has keyboard focus. They are placed in a dedicated region at the bottom of the screen that is outside the scrolling content, and the content area gets bottom padding equal to the toast area height so the page can scroll focused items above it. At most three toasts are shown at once (only one when the viewport is less than 500 CSS px tall, for example at 400 % zoom). When the limit is reached, the oldest toast that is neither an error toast nor holding focus is removed; error toasts and the focused toast are never removed this way. If every shown toast is protected, the new toast waits in a queue. Queuing affects only what is shown, never what is announced: every message is written to the persistent live region at once (polite for success, assertive for errors). While messages wait, the toast region shows the visible text "<n> more messages" ("1 more message" when there is one) with a "Show next" button, reachable with F8 and Tab. A queued toast is not announced again when it is finally shown, and its auto-close timer starts only when it becomes visible. If a toast that holds focus is removed for any reason, focus goes back to the element that had focus before the toast (FR-22). |

### FR-13 Reorder notes within a column

| ID | Requirement |
|--|--|
| FR-13.1 | The user must be able to drag a card up or down inside a column to change its position. The new order must persist. |
| FR-13.2 | The same must be possible without dragging: "Move up" and "Move down" in the note's More actions menu, the Move dialog's position field, and keyboard drag (FR-6.5). |
| FR-13.3 | The new position must be announced ("position 2 of 4"). Focus must stay on the moved note (on the same control used to move it). |

### FR-14 Note toolbar (icon-only buttons)

| ID | Requirement |
|--|--|
| FR-14.1 | Each note card must have a small toolbar with icon-only buttons: Edit, Move to…, Delete, and More actions. |
| FR-14.2 | On devices with a mouse, the toolbar may be visually faded until the pointer is over the card. In the faded state the icons must still have at least 3:1 contrast against the card background in both themes (so they are dimmer, never invisible). It must become fully visible whenever any element in the card has keyboard focus. On touch devices (no hover) it must always be fully visible. The buttons stay in the tab order at all times; they are never hidden from keyboard or screen reader users. |
| FR-14.3 | Each icon button must have a visible tooltip with a short name ("Edit", "Move to…", "Delete", "More actions") shown on hover and on keyboard focus, and an accessible name that starts with exactly that text followed by the note title: "Edit, note "Buy milk"", "Move to…, note "Buy milk"" (label in name, WCAG 2.5.3). The same pattern applies to all controls that add context to visible text. |
| FR-14.4 | Tooltips must stay visible while the pointer is over the tooltip or the button, must be dismissible with Escape without moving focus, and must not cover the button itself. |

### FR-15 Inline editing of note titles

| ID | Requirement |
|--|--|
| FR-15.1 | The user must be able to rename a note directly on the card by choosing "Rename" from the More actions menu, or by pressing F2 when the card's title button has focus. (Double-click is not used, because a single click on the title already opens the Edit dialog, FR-15.4; this keeps the behaviour predictable.) |
| FR-15.2 | Inline editing replaces the title with a labelled text field ("Note title") holding the current title, with the text selected and focus in the field. Enter saves; Escape cancels and restores the old title. Moving focus out saves if the title is valid. Focus then returns to the title button (for Enter and Escape). |
| FR-15.3 | Pressing Enter with an empty or too-long title is refused with an inline error message linked to the field ("Enter a title for the note." or "Title can be at most 200 characters (you have 230)." as in FR-1.7) and the field stays open with focus in it. If focus leaves the field while the title is invalid, the edit is cancelled and the old title is restored, and "Rename cancelled. Title not changed." is announced; focus is not pulled back. |
| FR-15.4 | The title itself must be a button that opens the note's Edit dialog on click or Enter, so the title is reachable and operable with a keyboard. |

### FR-16 "More actions" dropdown menus

| ID | Requirement |
|--|--|
| FR-16.1 | Each note and each column must have a "More actions" button that opens a menu. Note menu: Edit, Rename, Move to…, Move up, Move down, Remove from board (if on the board), Delete. Column menu: see FR-6.6. |
| FR-16.2 | Menus must follow the standard menu button pattern: the button says whether the menu is open; Enter, Space or Down Arrow opens the menu and focuses the first item; Up Arrow opens it on the last item; arrow keys move between items, Home/End go to first/last, typing a letter goes to the next item starting with it; Enter or Space activates; Escape closes and returns focus to the button; Tab closes the menu. |
| FR-16.3 | Items that cannot be used right now (for example "Move up" on the first card) must be shown as unavailable and announced as such, but stay focusable in the menu so users can learn they exist. |
| FR-16.4 | Clicking outside the menu closes it. |

### FR-17 Collapsible columns

| ID | Requirement |
|--|--|
| FR-17.1 | Each column header must have a button that collapses or expands the column. The button's name includes the column name and its state is exposed (expanded / collapsed). |
| FR-17.2 | A collapsed column shows its name and note count ("In progress, 4 notes") and can still receive dropped notes. |
| FR-17.3 | Collapsed state must persist. |

### FR-18 Animations and transitions

| ID | Requirement |
|--|--|
| FR-18.1 | The application may animate: cards entering and leaving, drag lift and drop, menu and dialog opening, toast slide-in, column collapse. |
| FR-18.2 | No animation may last longer than 300 ms (except the toast progress bar), and nothing may flash more than three times per second. |
| FR-18.3 | When the operating system asks for reduced motion (`prefers-reduced-motion: reduce`), or the user turns on "Reduce motion" in Settings, all movement animations must be removed or replaced by a simple fade of 100 ms or less, and smooth scrolling must be turned off. |
| FR-18.4 | No content may move, blink or scroll by itself for more than 5 seconds. (The toast countdown bar is the only moving item; it pauses with the toast and is hidden when Reduce motion is on.) |

### FR-19 Sound effects

| ID | Requirement |
|--|--|
| FR-19.1 | The application may play short sounds (each under 0.5 seconds) for: note created, note moved/dropped, note deleted, undo, error. |
| FR-19.2 | Sound must be off by default and turned on with a "Sound effects" switch in Settings. The setting persists. |
| FR-19.3 | Sounds must never be the only way information is given: every sound goes with a visible message and a screen reader announcement. |
| FR-19.4 | Sounds must be quiet (well below the volume of speech output) so they do not drown out screen readers. |

### FR-20 Dark mode

| ID | Requirement |
|--|--|
| FR-20.1 | A Theme setting must offer System (follow the operating system), Light and Dark. The default is System. |
| FR-20.2 | The choice must take effect at once and persist. There must be no flash of the wrong theme while the page loads. |
| FR-20.3 | Both themes must meet every contrast rule in A-PE-4. |
| FR-20.4 | The application must stay usable in Windows High Contrast / forced-colours mode: text, borders, focus rings, column edges, badges and drop-target outlines must remain visible. |

### FR-21 Settings and help

| ID | Requirement |
|--|--|
| FR-21.1 | A "Settings" button in the header must open a dialog with: Theme, Reduce motion, Sound effects, Toast duration. |
| FR-21.2 | A "Keyboard help" button must open a dialog listing all keyboard shortcuts and how to move notes without dragging. |
| FR-21.3 | The header controls (Undo, Export notes, Import notes, Keyboard help, Settings) must always appear in the same order and place (WCAG 3.2.3, 3.2.6). |

### FR-22 Focus management

Focus must always go to a predictable, visible place after an action, and never be lost to the page `<body>`. Every heading that can receive focus in this table (main heading, Notes, Board, column headings, empty-list headings) has `tabindex="-1"` so it can take focus without entering the Tab order.

| Action | Where focus goes |
|--|--|
| Note created (FR-1.5) | Title field of the New note form. |
| Note edited in the Edit dialog and saved | The control that opened the dialog (title button, toolbar Edit button or menu button). |
| Note deleted (FR-2.5) | Title button of the next note in the same list or column, else the previous one, else that list's or column's heading (made focusable with `tabindex="-1"`). |
| Note moved with the Move dialog, "Remove from board", "Move up/down", drag or keyboard drag | The same control on the same note in its new place (for example its "More actions" button, or its drag handle). If the note is now hidden by a filter, the Notes heading. |
| Column added | The new column's heading. |
| Column renamed, collapsed/expanded, or moved left/right | That column's "More actions" button (or the collapse button, if that was used). |
| Column deleted | The next column's "More actions" button, else the previous column's, else the "Board" heading. |
| Undo that restores a deleted note or column (from a toast, header button or Ctrl/Cmd+Z) | The title button of the restored note, or the restored column's heading. The undo is announced. |
| Undo of a move, edit or import | If triggered from a toast: the element that had focus before the toast was focused (or the affected note's title button if that element no longer exists). If triggered from the header button or shortcut: focus stays where it is. |
| Toast "Dismiss" button or Escape in a toast | The element that had focus before focus entered the toast region (F8 or Tab). If that element no longer exists, the main heading. |
| Toast removed while it holds focus | Same as Dismiss. |
| Menu item activated | As listed above for that action; for items that open a dialog, the dialog (FR-11.2). |
| Menu closed with Escape | The menu button. |
| Dialog closed (any way) | FR-11.2 (the opener, or the place listed above if the opener is gone). |
| Import succeeded | The Notes heading. |
| Import failed | Focus stays on the Import notes control; the error is announced. |

## 5. Accessibility requirements

The target is **WCAG 2.2 level AA**. The requirements below are grouped by the four principles of the review guidelines. Each states how it applies to this product.

### 5.1 Perceivable

| ID | Guideline | Requirement |
|--|--|--|
| A-PE-1 | Text alternatives | Every icon that carries meaning (toolbar buttons, priority icon, overdue icon, drag handle) must have a text alternative: icon-only buttons get an accessible name; icons next to visible text are hidden from assistive technology so the text is not read twice. Decorative graphics are hidden from assistive technology. |
| A-PE-2 | Time-based media | The product has no audio or video content. Sound effects (FR-19) are short, optional, off by default and always paired with visible text and announcements, so no captions are needed. If a demo video is published with the product, it must have captions. |
| A-PE-3 | Adaptable | Structure must be in the markup: a single `h1` for the app; `h2` for "New note", "Notes", "Board"; `h3` for each note title in the note list; `h3` for each column name under "Board"; `h4` for each note title inside a column. Heading levels must never skip a level and must reflect nesting. The note list and each column's notes must be lists (`ul`/`li`). The board must be a list of columns so the column count is announced. Form fields must have visible `<label>`s tied to them. Required fields are marked with the word "(required)" in the label as well as the `required` attribute. Reading order in the DOM must match the visual order. The layout must reflow at 320 CSS px width without horizontal scrolling of the page (columns stack vertically; the board may scroll horizontally only inside its own region at wider sizes), and at 200 % and 400 % zoom nothing is cut off. Content must not be locked to one screen orientation. Inputs that collect user data use `autocomplete` where a standard value applies (none of the current fields do; `autocomplete="off"` is used on search). |
| A-PE-4 | Distinguishable | Normal text must have contrast of at least 4.5:1 and large text 3:1 against its background, in both themes, including tag chips, badges, placeholder text, disabled-looking text, and text on hover and focus states. User-interface parts and states (input borders, button borders, focus ring, column edges, drop-target outline, checkboxes, the toolbar icons) must have at least 3:1 against adjacent colours. Colour must never be the only way to show information: priority has a word and icon shape; overdue has a word and icon; tags have text; errors have text and an icon; drag targets have an outline and text. Text must remain readable and not cut off when users set line height 1.5, paragraph spacing 2×, letter spacing 0.12 em and word spacing 0.16 em. Sizes use `rem` so text scales with browser settings. Sounds do not play automatically for more than 3 seconds. Content shown on hover or focus (tooltips, the faded toolbar) must be dismissible, hoverable and persistent as in FR-14.4. |

### 5.2 Operable

| ID | Guideline | Requirement |
|--|--|--|
| A-OP-1 | Keyboard accessible | Every function must work with the keyboard alone: create, edit, inline rename, delete, import, export, add/rename/delete/reorder columns, collapse columns, move a note to a column and within a column, search, filter, Undo, settings. There must be no keyboard trap: menus, dialogs, inline editors and keyboard drag can always be left with Escape (and Tab for menus). Single-character shortcuts must not be used; all shortcuts use a modifier key or a function key (Ctrl/Cmd+Z, F8) or only act when a specific control has focus (F2 on a note title, Space on a drag handle). Shortcuts are listed in the Keyboard help dialog. |
| A-OP-2 | Enough time | No task has a time limit. Toasts follow FR-12.3 to FR-12.7: they pause on hover/focus/hidden tab, their duration can be changed or turned off, error toasts stay, and Undo is always also available from the header button and Ctrl/Cmd+Z, so no one needs to reach a toast before it closes. The search announcement delay does not limit the user. |
| A-OP-3 | Seizures and physical reactions | Nothing flashes more than three times per second. Motion follows FR-18 and can be turned off by the operating-system setting or the in-app "Reduce motion" setting. |
| A-OP-4 | Navigable | A "Skip to board" link and a "Skip to notes" link must be the first focusable items and become visible on focus. Landmarks: `header` (banner), `main`, a `search` region, `section`s named by their headings for New note, Notes and Board. The page `<title>` must describe the app ("Notes & Kanban Board"); when a dialog is open the title need not change. Focus order follows the visual order. Any region that can scroll on its own (the board at wide widths) must be a named region (`role="region"`, `aria-label="Board columns"`) that can be scrolled with the keyboard; if it can ever contain no focusable content it must itself be focusable (`tabindex="0"`). Focus placement after actions follows FR-22. A visible focus indicator (at least a 2 px outline with 3:1 contrast, plus 2 px offset) must be shown on every focusable element, in both themes and in forced-colours mode. Focused elements must not be hidden by sticky headers or toasts (sticky header content uses `scroll-padding-top`; toasts per FR-12.8). Links and buttons have names that make sense out of context ("Delete, note "Buy milk"" rather than "Delete", following the FR-14.3 pattern). Headings and labels describe their purpose. |
| A-OP-5 | Input modalities | Every action done by dragging must also be possible with single pointer clicks (Move dialog, Move up/down, column menu) — WCAG 2.5.7. Drag must work with mouse, touch and pen, and start only after the pointer moves 6 px or a touch is held 200 ms, so a tap does not start a drag by mistake. Actions fire on pointer up, so they can be cancelled by moving away. Visible text of each control must be part of its accessible name (label in name), so voice control users can say what they see. Interactive targets must be at least 24 × 24 CSS px (WCAG 2.5.8); the product goal is 44 × 44 CSS px for primary controls and toolbar buttons on touch devices. No function depends on device motion. |

### 5.3 Understandable

| ID | Guideline | Requirement |
|--|--|--|
| A-UN-1 | Readable | The page language must be set (`lang="en"`). Labels, buttons and messages must use short, plain words ("Delete note", "Move to…", "Not on board") and avoid jargon such as "persist" or "payload". Dates are shown in a readable form with the weekday. Icons are never used without a name, and the meaning of icon-only toolbar buttons is also shown in tooltips. |
| A-UN-2 | Predictable | Focusing a control or changing a field must never cause a change of context: picking a column in the Move dialog does not move the note until "Move" is pressed; changing filters only filters. Theme and sound settings apply at once but do not move focus. Controls that look the same do the same thing everywhere; the header, toolbar and menu order are the same on every note and column. Instructions never depend only on shape, colour, size or position (no "click the green button"). |
| A-UN-3 | Input assistance | All fields have visible labels and, where useful, short hints linked to the field (tags: "Separate tags with commas"). Errors are shown in text next to the field, linked to it, include how to fix it, and the field is marked invalid; focus moves to the first field with an error. Destructive actions (delete note, delete column, import that replaces data) ask for confirmation and can be undone. |

### 5.4 Robust

| ID | Guideline | Requirement |
|--|--|--|
| A-RO-1 | Compatible | Native HTML elements must be used wherever possible (`button`, `input`, `select`, `dialog`, `ul`/`li`, `time`, `label`). Custom widgets must expose the right role, name, state and value: menu button (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`), menu and menu items (`role="menu"`, `role="menuitem"`, `aria-disabled`), collapse buttons (`aria-expanded`), switches (`role="switch"` with `aria-checked`, or a native checkbox), invalid fields (`aria-invalid`, `aria-describedby`), drag handles (button with a name and `aria-describedby` pointing to drag instructions). Status messages use live regions (`role="status"` / `role="alert"`) that exist in the page before messages are put in them. ARIA must not be added where native semantics already do the job, and no element may have an ARIA role that conflicts with its native one. The markup must pass automated checks (axe-core) with no violations. |

## 6. Non-functional requirements

| ID | Requirement |
|--|--|
| NFR-1 Performance | The app must stay responsive (actions under 100 ms) with 500 notes. Filtering must not block typing. |
| NFR-2 Size | The production JavaScript bundle should be under 250 kB gzipped. |
| NFR-3 Reliability | Invalid stored or imported data must never crash the app (validated at the boundary). |
| NFR-4 Privacy | No data leaves the browser. No analytics, cookies or third-party requests. |
| NFR-5 Maintainability | TypeScript in strict mode; state changes in a pure reducer that is unit-tested. |
| NFR-6 Testability | Automated unit, component and accessibility tests must run with one command. |
| NFR-7 Deployability | A single multi-stage Dockerfile builds and serves the app; the final image is based on a small web server image and runs as a non-root user. |
| NFR-8 Browser support | Latest two versions of Chrome, Edge, Firefox, Safari. |
| NFR-9 Accessibility verification | Automated checks (axe-core) find only part of WCAG problems, so each release must also be checked by hand: keyboard-only walkthrough of every user story; NVDA with Firefox or Chrome on Windows; VoiceOver with Safari on macOS and iOS; 200 % and 400 % browser zoom and 320 px width; text-spacing override; forced-colours (High Contrast) mode; reduced-motion setting; grayscale and colour-vision-deficiency simulation. The checklist is part of document 04. |

## 7. Data requirements

| Entity | Fields |
|--|--|
| Note | `id` (string, unique), `title` (string, 1–200 chars after trimming), `description` (string, up to 5000 chars), `tags` (string[], each 1–40 chars), `priority` (`"none" \| "low" \| "medium" \| "high"`), `dueDate` (`"YYYY-MM-DD"` or `null`), `createdAt`, `updatedAt` (ISO date-time strings). |
| Column | `id` (string, unique), `name` (string, 1–60 chars, unique ignoring case), `collapsed` (boolean), `noteIds` (string[], order of notes in the column). |
| Board state | `notes` (Note[], order is the note list order, newest first), `columns` (Column[], left to right). A note id may appear in at most one column. |
| Export file | `{ "format": "notes-kanban", "version": 1, "exportedAt": ISO, "notes": Note[], "columns": Column[] }`. |

## 8. Traceability matrix

| User story | Acceptance criterion | Requirements |
|--|--|--|
| Create notes | Note with a title is created | FR-1.1, FR-1.3 |
| | Title, description and tags are saved | FR-1.2, FR-1.3 |
| | Save without a title is refused | FR-1.4, A-UN-3 |
| | Note appears in list with confirmation | FR-1.5, FR-12.1 |
| | Survives reload | FR-1.6, FR-3.1 |
| View and manage list | All notes shown | FR-2.1 |
| | Title, description, tags shown | FR-2.2 |
| | Edit saves and displays | FR-2.3, FR-11, FR-15 |
| | Delete removes from list | FR-2.4, FR-2.5, FR-11, FR-12 |
| | Deleted note gone after reload | FR-2.4, FR-3.1 |
| Export / import JSON | Export downloads valid JSON with all notes | FR-4.1 |
| | Import of exported file restores data | FR-4.2, FR-4.3 |
| | Invalid file rejected with error | FR-4.4, A-UN-3 |
| | Imported notes survive reload | FR-4.5 |
| Drag to board | Dropped note appears in column | FR-5.1, FR-5.3 |
| | Visual feedback while dragging | FR-5.2, A-PE-4 |
| | Note assigned to column on drop | FR-5.3 |
| | Assignments survive reload | FR-5.5 |
| | Drop outside keeps original column | FR-5.4 |
| Columns | New named column is added | FR-6.1 |
| | Drag between columns moves note | FR-6.3, FR-6.4, FR-6.5 |
| Browser access | — | FR-7.1 |
| Docker deployment | — | FR-7.2, FR-7.3, NFR-7 |
| Additional features | Priority & tag colours | FR-8 |
| | Toasts with Undo | FR-12, A-OP-2 |
| | Modal dialogs | FR-11 |
| | Reorder within column | FR-13 |
| | Hover toolbar | FR-14 |
| | Inline title editing | FR-15 |
| | More actions menu | FR-16 |
| | Search and filter | FR-9 |
| | Due dates and overdue | FR-10 |
| | Collapsible columns | FR-17 |
| | Animations | FR-18, A-OP-3 |
| | Sound effects | FR-19, A-PE-2 |
| | Dark mode | FR-20, A-PE-4 |

## 9. Assumptions and constraints

1. One user per browser profile; data is not shared between devices except by export/import.
2. Local storage holds roughly 5 MB, which is far more than 500 notes need.
3. "Done" for overdue purposes (FR-10.3) means a column whose name is "Done" ignoring letter case.
4. Import replaces data rather than merging, because merging needs conflict rules the stories do not ask for; the confirmation dialog and Undo protect against mistakes.
5. Sound is off by default so it never surprises users or competes with screen reader speech.

## 10. Review record

| Date | Reviewer | Result |
|--|--|--|
| 2026-11-02 | accessibility-reviewer, round 1 | Not accepted. Six blocking gaps: B1 heading levels for board notes; B2 faded toolbar contrast; B3 toast eviction vs. error/focus rules; B4 focus after toast, Undo, column and move actions; B5 keyboard drag key mapping, state and announcements; B6 errors for length limits and invalid dates. Fixed in A-PE-3, FR-14.2, FR-12.8, new FR-22, FR-6.5, FR-1.7/FR-1.8/FR-10.5. Suggestions also taken: no double-click rename (FR-15), label-in-name pattern (FR-14.3), single count wording (FR-9.3), one toast at small viewports (FR-12.8), named scrollable board region (A-OP-4), revert on blur (FR-15.3), consistent header (FR-21.3), Settings as dialog (FR-11.1), F8 instead of Alt+Shift+N (FR-12.5), manual AT checks (NFR-9), full date names (FR-10.2). |
| 2026-11-02 | accessibility-reviewer, round 2 | Not accepted. B1–B6 resolved. New blocking N1: queued toasts could withhold announcements. Fixed in FR-12.8 (announce immediately, visible "more messages" text, timer starts on show). Suggestions taken: too-long title message (FR-15.3), focus after list-origin keyboard drop and Move to… for screen reader users (FR-6.5), consistent name pattern (A-OP-4), `tabindex="-1"` on focus-target headings (FR-22), header Undo state and name (FR-12.6), `validity.badInput` and numbering (FR-10.5). |
| 2026-11-02 | accessibility-reviewer, round 3 | **Accepted.** N1 and all round 2 suggestions confirmed resolved; no new problems. Optional nit applied: "<n> more messages" wording in FR-12.8. |
