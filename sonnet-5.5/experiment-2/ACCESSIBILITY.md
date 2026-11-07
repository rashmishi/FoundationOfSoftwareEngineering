# Accessibility

Target: **WCAG 2.2 Level AA**. This page lists what was done in each requested area, then says plainly how it was
checked and what was *not* checked.

## What was done

### Forms
- Every field has a visible `<label>`; hints and errors are tied to the field with `aria-describedby`; required
  fields say **(required)** in text and use the `required` attribute (1.3.1, 3.3.2, 4.1.2).
- Validation is custom (`noValidate`), so messages are consistent and readable. Errors have an icon **and** text,
  say what is wrong and how to fix it, and focus moves to the first problem (3.3.1, 3.3.3). Errors clear as soon as the
  field is corrected.
- Values are kept when validation fails (3.3.7). Priority is a real radio group in a `fieldset`; the tag field is
  a labelled input with an **Add tag** button, removable tag chips, and a spoken confirmation for each change.
- Enter in the tag field adds the tag and never submits the form by accident (3.2.2).

### Text
- Real `lang="en"`, descriptive `<title>`, plain wording, no instructions that depend on colour, shape or position
  (1.3.3, 3.1.1, 2.4.2).
- All sizes are `rem`; the layout reflows at 320 CSS px and at 200% zoom without two-way scrolling (1.4.4, 1.4.10).
  Text spacing overrides (1.4.12) do not clip anything. A **Settings** text size option (125% / 150%) is also provided.
- Icon-only buttons have an accessible name and a visible tooltip; names contain the visible text (2.5.3, 1.1.1).
  Tooltips show on hover and focus, stay open while hovered, and close with **Esc** (1.4.13).

### Buttons and structure
- Real `<button>`, `<input>`, `<ul>`, `<h1>`–`<h4>`, `<header>`, `<main>`, `role="search"`, and labelled regions.
  Reading order matches visual order (1.3.2). ARIA is used only where HTML has no equivalent: menu button, switch,
  live regions (4.1.2).
- Menus follow the WAI-ARIA menu button pattern (arrows, Home/End, Esc, Tab). Modal dialogs use native `<dialog>`
  with `showModal()`: focus enters, the page behind is inert, Esc closes, focus returns.
- Collapsible columns expose `aria-expanded`/`aria-controls`; collapsed content is `inert` and hidden.

### Keyboard
- Everything works with the keyboard: create, edit, rename, delete, import, export, add/rename/move/delete columns, and
  move notes between and within columns (**More actions → Move to / Move up / Move down**) (2.1.1, 2.5.7).
- Four skip links; no keyboard traps; no single-key shortcuts (2.1.2, 2.4.1, 2.1.4).
- Focus is always visible (3px ring, offset, ≥3:1 in both themes) and follows the note after it moves; after a delete
  it goes to the list or board heading (2.4.3, 2.4.7, 2.4.13). Panes keep focus clear of the notification area (2.4.11).
- The hover toolbar is also shown on keyboard focus and always on touch screens.

### Visual
- Contrast tokens for light and dark themes: text ≥ 7:1 almost everywhere (minimum 4.5:1), borders and focus rings ≥ 3:1
  (1.4.3, 1.4.11). Tag colours were checked for all eight hues.
- Nothing relies on colour alone (1.4.1): priority = colour + bars icon + word; overdue = colour + warning icon + the
  words "Overdue: was due …"; errors = icon + text; drag targets = dashed outline, a "Drop here" label and an insertion
  line; switches show On/Off text.
- All controls are at least 44 × 44 CSS px at the default size (2.5.8, exceeds 24 px).
- `prefers-reduced-motion` and an in-app **Animations** setting remove motion (2.3.3). `forced-colors` rules keep
  borders, focus rings, switches and drop indicators visible. `color-scheme` follows the theme.

### Safety
- Deleting a note or column asks for confirmation, and the safe button (Cancel) has focus.
- Every change except collapsing a column can be undone from the notification or the header **Undo** button.
- Closing the edit dialog with unsaved changes warns before discarding. Import is all-or-nothing and never overwrites
  anything for an invalid file. A banner warns if the browser cannot save.
- No unexpected sound: sound effects are off by default (1.4.2).

### Task completion
- Every action gives a visible message and a screen-reader announcement without moving focus (4.1.3): created, saved,
  deleted, moved ("… to the 'Done' column, position 2 of 3"), imported, import failed (alert), tag added, result counts.
- Notifications last 9–14 s, pause while hovered or focused, can be dismissed, and can be turned off in **Settings**
  (2.2.1). Empty states and "no results" explain what to do next.
- Help is in the same place on every view (3.2.6) and explains mouse, keyboard and screen-reader use.

## How it was checked

Run in Chromium through the in-app browser, on the dev server and on the production bundle:

| Check | Result |
| --- | --- |
| axe-core 4.14 (WCAG 2.0–2.2 A/AA + best practice): base page, open menu, validation error, edit/help/settings dialogs, **light and dark** | 0 violations. The few "needs review" items were inspected: arrow glyphs in the Help text (since replaced by words), a menu overlay hiding a background, and `aria-controls` on a popup button. |
| Contrast computed for badges, tag chips (8 hues), buttons, toast, muted text, borders, focus ring, both themes | all ≥ 4.5:1 text and ≥ 3:1 non-text (lowest text 7.1:1) |
| Target size of every interactive element (87 on screen) | 100% ≥ 44 × 44 px |
| Reflow at 320 px wide; text-spacing override (1.4.12) | no horizontal scroll; no clipped text |
| Keyboard flows: menu (open, move, Esc, Tab, wrap), move via menu with focus following, edit dialog (focus, dirty-Esc warning, focus return), inline rename, delete confirm, skip links | pass |
| Drag and drop with real `DragEvent`s: list→column, column→column, insert position, reorder, drop outside, visual states | pass |
| Import/export round trip, invalid JSON, invalid structure, persistence after refresh | pass |
| 34 unit tests (state, import/export, validation, filters) | pass |
| Production bundle under the Dockerfile's exact Content-Security-Policy | no violations |

## Not checked (be aware)

- **No real screen reader** (NVDA, JAWS, VoiceOver, Orca) was used. Announcements rely on live regions and standard
  patterns but have not been heard. This is the most important remaining check.
- **Forced-colors, grayscale and colour-blindness simulations** were not run; the design relies on non-colour cues and the
  forced-colors CSS is untested.
- **Drag and drop used synthetic events**, not a physical mouse or touch drag. Touch dragging varies by browser; the
  **Move to** menu is the reliable alternative there.
- Only Chromium was used. Firefox and Safari were not tried (`<dialog>`, `:has()` and `inert` are in current versions).
- The **Docker image was not built or run** (the Docker engine was not running when this was written). The build stage was
  reproduced in a clean directory (`npm ci`, `npm test`, `npm run build`) and the output was served with the same CSP.
