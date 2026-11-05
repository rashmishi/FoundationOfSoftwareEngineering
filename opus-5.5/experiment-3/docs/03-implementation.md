# Implementation — Notes & Kanban Board

| Field | Value |
|--|--|
| Document | 03 — Implementation |
| Version | 2.0 |
| Date | 2026-11-02 |
| Inputs | [01 — Requirements](01-requirements-specification.md) (accepted), [02 — Architecture & Design](02-architecture-and-design.md) (accepted) |
| Status | Accepted by accessibility review, round 2 (see section 7) |

This document is a guide to the source code. It maps each requirement to the files that implement it, lists the places where the code differs from the design (and why), and records the test results at the time of review.

## 1. Stack and build

| Item | Version / setting |
|--|--|
| React | 18.3 (StrictMode) |
| TypeScript | 5.6, `strict`, `noUnusedLocals`, `noUnusedParameters` |
| Vite | 5.4 (production bundle ≈ 84 kB JS gzipped, 4 kB CSS — NFR-2) |
| Drag and drop | `@dnd-kit/core` 6, `@dnd-kit/sortable` 10 |
| Tests | Vitest 2 + Testing Library + jsdom + axe-core; Playwright 1.64 + `@axe-core/playwright` |
| Runtime image | `nginxinc/nginx-unprivileged:1.27-alpine`, user 101, port 80 |

Commands: `npm run dev`, `npm run build`, `npm test` (unit + component), `npm run test:e2e` (Playwright), `npm run typecheck`.

## 2. Source map

```
src/
  main.tsx, App.tsx                 providers, page shell, skip links, global shortcuts, reset banner, error boundary
  react-extras.d.ts                 types for the popover and inert attributes
  model/                            pure logic (no React)
    types.ts  reducer.ts  selectors.ts  validation.ts  importExport.ts
    storage.ts  tags.ts  dates.ts  ids.ts  toastQueue.ts
  state/                            React contexts and hooks
    PreferencesContext.tsx  sound.ts  AnnouncerContext.tsx  FocusContext.tsx  focusKeys.ts
    ToastContext.tsx  BoardContext.tsx  FilterContext.tsx  DialogContext.tsx
    KeyboardMoveContext.tsx  useNoteActions.ts
  components/
    Header.tsx  NoteForm.tsx  NoteFields.tsx  FieldError.tsx  SearchBar.tsx
    Workspace.tsx  NoteList.tsx  Board.tsx  BoardColumn.tsx  AddColumnForm.tsx
    NoteCard.tsx  InlineTitleEditor.tsx  NoteMeta.tsx  IconButton.tsx  MenuButton.tsx
    floating.ts  Dialog.tsx  DialogHost.tsx  HelpContent.tsx  ToastRegion.tsx  Icon.tsx
  styles/tokens.css  styles/app.css
  test/setup.ts  helpers.tsx  model.test.ts  contrast.test.ts  app.test.tsx
public/theme-init.js  favicon.svg
e2e/helpers.ts  stories.spec.ts  accessibility.spec.ts  widgets.spec.ts
examples/notes-export-example.json
Dockerfile  nginx.conf  docker-compose.yml  playwright.config.ts
```

## 3. Requirement → implementation

### 3.1 Functional requirements

| Req. | Where | Notes |
|--|--|--|
| FR-1 Create notes | `NoteForm.tsx`, `NoteFields.tsx` (`useNoteForm`), `validation.ts`, `tags.ts` | `noValidate` form; errors set `aria-invalid`, linked by `aria-describedby` (hint, counter, error); first invalid field focused; values kept; polite summary when ≥ 2 fields fail; date field's `validity.badInput` checked; `CharCount` from 90 % of the limit. |
| FR-2 List | `NoteList.tsx`, `NoteCard.tsx`, `DialogHost.tsx` (`EditNoteDialog`, delete `ConfirmDialog`), `useNoteActions.ts` | Delete focus uses `neighbourTargets()` in `focusKeys.ts`. |
| FR-3 Persistence | `storage.ts`, `BoardContext.tsx` (save effect), `PreferencesContext.tsx`, `App.tsx` (`ResetBanner`) | Stored data is validated with the same parser as imports. |
| FR-4 Export/import | `Header.tsx`, `importExport.ts`, `DialogHost.tsx` (`ImportDialog`) | Import button + hidden file input (`tabIndex=-1`, `aria-hidden`); inline error linked to the button; error toast is assertive and stays. |
| FR-5, FR-6.3, FR-13.1 Pointer drag | `Workspace.tsx` (`DndContext`, sensors, `onDragEnd`), `NoteList.tsx` (`useDraggable`), `BoardColumn.tsx` (`useSortable`, `useDroppable`) | `pointerWithin` collision: dropping outside every column changes nothing. dnd-kit announcements silenced; its ARIA attributes are not spread. |
| FR-6.4 Move dialog | `DialogHost.tsx` (`MoveNoteDialog`) | Selects only change the form; "Move" applies. |
| FR-6.5 Keyboard drag | `KeyboardMoveContext.tsx`, `NoteCard.tsx` (`onHandleKeyDown`), `BoardColumn.tsx` (inert preview) | Original card stays mounted and focused; "Not on board" is the leftmost target for list-origin moves. |
| FR-6.1, 6.6, 6.7, FR-17 Columns | `AddColumnForm.tsx`, `BoardColumn.tsx`, `DialogHost.tsx` (`RenameColumnDialog`, `DeleteColumnDialog`) | Collapse button exposes `aria-expanded`/`aria-controls`; collapsed columns remain drop targets. |
| FR-7 Deployment | `Dockerfile`, `nginx.conf`, `docker-compose.yml` | Health check `/healthz`; non-root. |
| FR-8 Priorities and tags | `NoteMeta.tsx` (`PriorityBadge`, `TagList`), `tags.ts` (`tagColour`), `tokens.css` | Word + bar icon + colour; tag colour from a hash of the text. |
| FR-9 Search/filter | `SearchBar.tsx`, `FilterContext.tsx`, `selectors.ts` | `useDeferredValue`; count announced once, 500 ms after typing stops or at once for selects. |
| FR-10 Due dates | `NoteMeta.tsx` (`DueDate`), `dates.ts`, `FilterContext.tsx` (`useToday`) | "Overdue:" text + warning icon + left border; re-checked every minute and on tab visibility. |
| FR-11 Dialogs | `Dialog.tsx`, `DialogHost.tsx` | Native `showModal()`; own live regions; focus returns to the opener on close unless the owner requests another target. |
| FR-12 Toasts / Undo | `toastQueue.ts`, `ToastContext.tsx`, `ToastRegion.tsx`, `BoardContext.tsx` (`commit`, `undo`), `Header.tsx` (Undo button), `App.tsx` (Ctrl/Cmd+Z, F8) | Eviction rules are a pure, unit-tested function; timers pause on hover, focus and hidden tab. |
| FR-14 Toolbar / tooltips | `NoteCard.tsx`, `IconButton.tsx`, `floating.ts`, `app.css` (`.toolbar`) | Tooltips in the top layer (`popover="manual"`), hoverable, Escape to dismiss. |
| FR-15 Inline rename | `InlineTitleEditor.tsx`, `NoteCard.tsx` | F2 or menu "Rename"; visible "Note title" label. |
| FR-16 Menus | `MenuButton.tsx` | APG menu button; `aria-disabled` items stay focusable and announce why they are unavailable. |
| FR-18 Motion | `tokens.css` (motion tokens), `app.css`, `PreferencesContext.tsx` (`data-reduce-motion`), `Workspace.tsx` (`dropAnimation`) | All durations ≤ 300 ms; reduced motion → 0.01 ms, fades only, no countdown bar. |
| FR-19 Sound | `sound.ts`, `PreferencesContext.tsx` (`play`) | Web Audio tones ≤ 200 ms, gain 0.04, off by default. |
| FR-20 Dark mode | `tokens.css`, `PreferencesContext.tsx`, `public/theme-init.js`, `app.css` (`forced-colors`) | Theme applied before first paint by an external script (CSP-safe). |
| FR-21 Settings/help | `DialogHost.tsx` (`SettingsDialog`), `HelpContent.tsx`, `Header.tsx` | Header order fixed: Undo, Export notes, Import notes, Keyboard help, Settings. |
| FR-22 Focus | `FocusContext.tsx` (`requestFocus` with fallbacks; main heading last), `focusKeys.ts`, callers in `useNoteActions.ts`, `DialogHost.tsx`, `BoardColumn.tsx`, `ToastRegion.tsx`, `BoardContext.tsx` | Targets are `data-focus` keys so focus survives re-mounting (for example a card moving to another column). |

### 3.2 Accessibility requirements

| Req. | Implementation highlights |
|--|--|
| A-PE-1 | `Icon` renders `aria-hidden="true" focusable="false"`; icon-only buttons have `aria-label` "<tooltip text>, note “<title>”". |
| A-PE-2 | No media; sounds optional and paired with text. |
| A-PE-3 | Landmarks: `header`, `main`, `role="search"`, sections named by `h2`; headings h1 → h2 → h3 (list notes, columns) → h4 (board notes); notes, columns, tags in `ul`/`li`; columns stack below 640 px; Playwright checks no horizontal scroll at 320 px. |
| A-PE-4 | Colour tokens checked by `contrast.test.ts` (92 pairs, both themes) and by axe in a real browser (both themes); rendered toolbar colour checked ≥ 3:1; text-spacing override test; tooltips persistent, hoverable, dismissible. |
| A-OP-1 | All features keyboard-operable; Escape exits every mode; shortcuts are Ctrl/Cmd+Z, F8, F2 (on a title), Space/arrows (on a picked-up handle) only. |
| A-OP-2 | Toast durations 5/8/15/30 s or keep; pause on hover/focus/hidden; errors stay; header Undo and Ctrl/Cmd+Z. |
| A-OP-3 | ≤ 300 ms, no flashing; reduced-motion flag. |
| A-OP-4 | Skip links → `tabindex="-1"` headings; 3 px focus ring with 2 px offset everywhere; sticky header only when ≥ 640 px tall with `scroll-padding-top`; `--toast-space` padding and `scroll-padding-bottom` keep focus above toasts; board region named and focusable. |
| A-OP-5 | Move dialog, Move up/down, Remove from board, column move items; activation constraints 6 px / 200 ms; targets 44 px (32 px for card toolbar icons on fine pointers, 44 px on coarse). |
| A-UN-1..3 | Plain wording, full dates, hints, specific error messages, confirmations, Undo. |
| A-RO-1 | Native `button`, `input`, `select`, `dialog`, `fieldset`, `time`; ARIA only for menu, disclosure, pressed state, live regions; axe-core clean in jsdom and in Chromium. |

## 4. Differences from the design (and why)

| Design | Implementation | Reason / effect on accessibility |
|--|--|--|
| 8.2: toolbar in the card's top row next to the title. | Toolbar is a footer row at the bottom of the card. | In 18rem columns the four 32 px buttons squeezed titles into a one-word-per-line strip. The DOM order (handle, title, content, toolbar) now matches the visual order exactly. |
| 6: `<search>` element (with `role="search"` fallback). | `<div role="search" aria-label="Search and filter notes">`. | React 18 / TypeScript do not type `<search>`; the exposed role is identical. |
| 8.6: Escape handled by the dialog's `cancel` event. | Also handled on the dialog's `keydown`. | Same behaviour in every browser (some engines and jsdom do not fire `cancel`). Inner widgets that consume Escape (menu, tooltip, keyboard move, inline editor) stop it first. |
| 9: import reads `file.text()`. | `FileReader`. | Works in older browsers and the test environment. |
| 2 / nginx: `style-src 'self'`. | `style-src 'self' 'unsafe-inline'`; `script-src 'self'`. | A strict style policy blocks users' text-spacing and readability bookmarklets (WCAG 1.4.12). The app renders no user HTML, so the risk is low. Scripts stay `'self'` only. |
| 8.10: "Show next" in the queued-messages bar. | "Show next" dismisses the oldest visible success/info toast (an error only if nothing else is shown), then focuses the toast that appears (or the previous focus, else the h1). | Messages were already announced when raised; focus never falls to `<body>` when the button disappears. |
| 8.5: Tab in an open menu closes it and lets focus move on. | Tab (and Shift+Tab) closes the menu and returns focus to the menu button. | The menu sits in the top layer and is hidden as Tab is handled, so letting the browser move focus could drop focus to `<body>`. Returning to the button is predictable and one more Tab continues the sequence. |
| 8.9: overdue copy "Overdue" + "Due …". | "Overdue: due Tuesday 3 November 2026" in one phrase. | Reads as one sentence instead of "Overdue Due …". |

## 5. Notable implementation details

- **One source of truth for column membership.** A note's column is derived from `columns[].noteIds`, so a note cannot be in two columns (`reducer.ts`).
- **Undo snapshots.** `commit(action, undo)` stores the full previous `BoardState` for the latest undoable action; `undo()` restores it with `replaceAll`. Only one level is kept, matching FR-12.6.
- **Announcer.** Messages are appended as new `<p>` nodes after 60 ms and removed after 7 s. The delay lets a dialog that closes in the same event leave the top layer first, so the page regions are no longer inert. While a dialog is open, messages go to that dialog's own regions (registered on mount).
- **Focus manager.** `requestFocus(...targets)` tries each target after the next commit, retrying for two animation frames before using the main heading, so focus never falls to `<body>`.
- **Toasts.** `addToast`/`removeToast`/`settle` in `toastQueue.ts` implement the visible limit (3, or 1 below 500 px viewport height), eviction (never errors or the focused toast), queueing, and replacement of older Undo toasts.
- **Pointer drag guard.** `guardListeners()` in `NoteCard.tsx` stops a drag from starting in a text field, open menu or inline editor.
- **Search announcements.** `SearchBar.tsx` runs its effect only when the filters change; one timer in a ref is reset by each keystroke (500 ms) or select change (150 ms) and reads the latest count from a ref when it fires, so deferred re-renders and note changes never add announcements.
- **Keyboard-move visibility.** The handle tooltip shows "Moving to <column>, position n of m. Space to drop, Escape to cancel."; the target column gets the dashed drop-target outline, and a collapsed target shows "Drop here: end of <column>" outside its hidden body; the target is scrolled into view (focus stays on the handle).
- **Sticky header offset.** `Header.tsx` measures the header with a ResizeObserver into `--header-space`, used by `scroll-padding-top`.
- **Popovers.** `floating.ts` shows menus and tooltips in the top layer and positions them with fixed coordinates, flipping and clamping to the viewport; a Playwright test checks that a menu on the last card is not clipped.

## 6. Test results at review time

| Suite | Command | Result |
|--|--|--|
| Unit (reducer, tags, dates, validation, import/export, filters, toast queue) | `npm test` | 27 passed |
| Regression (focus after self-removing controls, search announcement timing, keyboard-move target visibility) | `npm test` | 5 passed |
| Contrast (92 pairs, light + dark) | `npm test` | 92 passed |
| Component (user stories, keyboard paths, focus, announcements, axe) | `npm test` | 22 passed |
| End-to-end in Chromium (pointer drag, persistence, export/import, axe incl. contrast in both themes, rendered toolbar contrast, menu clipping, 320 px reflow, forced colours, reduced motion, text spacing, menu/tooltip/dialog keyboard behaviour, toast pause) | `npm run test:e2e` | 19 passed |
| Same end-to-end suite against the Docker container | `BASE_URL=http://localhost:8089 npm run test:e2e` | 19 passed |
| Type check | `npm run typecheck` | 0 errors |

Manual checks that automated tests cannot cover (screen readers, zoom, OS contrast themes) are listed in document 04.

## 7. Review record

| Date | Reviewer | Result |
|--|--|--|
| 2026-11-02 | accessibility-reviewer, round 1 | Not accepted. B1 focus lost to `<body>` (note-list Clear filters, import-error Dismiss, Show next) → focus moved to heading / Import button / shown toast. B2 search count announced per keystroke and on note changes → effect on filter changes only, single debounce timer, latest count from ref. B3 keyboard-move target invisible in collapsed/off-screen columns → tooltip says where, collapsed target hint, target outline, scroll into view. B4 inset menu focus ring → removed; menu padding and item gap make room for the standard ring. Suggestions taken: measured sticky-header offset, Notes-heading fallback for hidden notes, Tab-in-menu documented (section 4), Show next prefers non-error toasts, toast-focus safety on Ctrl/Cmd+Z, 8 px toolbar spacing, regression tests (`regressions.test.tsx`). |
| 2026-11-02 | accessibility-reviewer, round 2 | **Accepted.** B1–B4 and suggestions confirmed in the code; no new problems. Optional point applied: the count announcement waits until deferred filter results have rendered (`settled` in `FilterContext.tsx`). |
