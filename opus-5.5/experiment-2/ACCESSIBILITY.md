# Accessibility

Target: **WCAG 2.2 Level AA**, going on to AAA criteria where they fit the app.
This file records how that target shaped the requirements and the design, and what
has and has not been tested.

## Features by category

| Category | What the app does | WCAG 2.2 |
|---|---|---|
| **Forms** | Visible labels. Fields say whether they are required or optional. Errors say how to fix the problem and are linked to the field, which receives focus. The note being written is kept across a refresh. The tags hint shows exactly what will be saved. A failed save keeps what was typed. | 1.3.1, 3.2.2, 3.3.1, 3.3.2, 3.3.3 (AA); 3.3.5 Help (AAA) |
| **Text** | Four text sizes up to 200%, wide text spacing and a wide letter font, all remembered. Lines are limited to about 70 characters. Text is left aligned, with no capitals or italics for emphasis. Note text finds its own direction, so right-to-left languages display correctly. | 1.3.2, 1.4.4, 1.4.10, 1.4.12 (AA); 1.4.8 Visual Presentation (AAA, in part) |
| **Buttons and structure** | Buttons have text labels and unique names for screen readers. One banner, one main landmark and an orderly heading tree. Notes are named articles with grouped actions. Tools stay in the same place. The page title names the open dialog. Targets are 44 × 44 px. | 1.3.1, 2.4.2, 2.4.6, 2.5.3, 2.5.8, 3.2.3, 3.2.4, 4.1.2 (AA); 2.4.10 Section Headings, 2.5.5 Target Size (AAA) |
| **Keyboard** | All features work from the keyboard. Notes can be picked up, carried with the arrow keys and dropped, with every step announced. Esc cancels. Skip links reach each area. There are no single-key shortcuts to trigger by accident, and no keyboard traps. | 2.1.1, 2.1.2, 2.1.4, 2.4.1, 2.4.3, 2.4.7, 2.4.11 (AA); 2.1.3 Keyboard (No Exception) (AAA) |
| **Visual** | Light, dark and high contrast themes (7:1 text). Follows the device's colour and contrast settings, and supports forced colours. State is shown by shape and text as well as colour. | 1.4.1, 1.4.3, 1.4.11 (AA); 1.4.6 Contrast (Enhanced) (AAA) |
| **Safety** | Undo for every change, up to 20 steps. Deleting a note or a column asks first. Closing an edit with unsaved changes asks first. An import that would overwrite a changed note asks first. Oversized and invalid files are rejected. Nothing flashes. | 2.2.1, 2.3.1, 3.3.4 (AA); 2.3.2 Three Flashes, 3.3.6 Error Prevention (All) (AAA) |
| **Task completion** | Help in a fixed place, with steps and keys. Search by title, description or tag, with the number of results announced. A summary of progress. Clear confirmation after each action. Three ways to move a note, so that nobody depends on one ability. | 2.5.1, 2.5.7, 3.2.6, 4.1.3 (AA); 3.3.5 Help (AAA) |

These are design intentions, not a claim of conformance. See [Limits of this
testing](#limits-of-this-testing).

## Features that carry accessibility risks, and how they are handled

Several requested features are common sources of accessibility failures when built
in the usual way. Each one here has been adapted so that it does not exclude anyone.

| Feature | The usual risk | How this app handles it | WCAG 2.2 |
|---|---|---|---|
| Colour-coded priorities and tags | Meaning carried by colour alone | Every priority badge says its level in words and has its own arrow shape. Tags show their text. Colours meet 4.5:1, and 7:1 in high contrast. | 1.4.1, 1.4.3, 1.4.6 |
| Messages that hide themselves | A time limit on reading and on Undo | Messages pause while pointed at or focused. Errors never hide. Display settings can lengthen the time or keep messages until dismissed. Undo stays in the header after a message has gone. | 2.2.1, 4.1.3 |
| Edit and delete dialogs | Lost focus, keyboard traps | Native modal dialogs contain focus, close on Esc and return focus to the button that opened them. | 2.1.2, 2.4.3 |
| Reordering by drag | Needs a precise pointer movement | Move up, Move down, Move to top and Move to bottom in the menu, and Up and Down while a note is picked up. A line shows where a note will land. | 2.1.1, 2.5.7 |
| Icon-only buttons that appear on hover | No name, unreachable by keyboard or touch, tooltips that vanish | Each button has a full accessible name, which its tooltip starts with. The toolbar also appears on keyboard focus and is always visible on touch screens. It keeps its space while hidden, so nothing shifts. Tooltips can be pointed at, stay until left and close on Esc. Display settings can show the toolbar all the time, which helps voice control and low vision users. | 1.4.13, 2.1.1, 2.5.3, 4.1.2 |
| Inline title editing | A field with no label, focus left behind | The field has a visible label, gets focus on opening and reports empty titles. Enter saves, Esc cancels, and focus returns to the More actions button. Double-clicking is a shortcut only. | 2.4.3, 3.3.1, 3.3.2 |
| More actions menus | Home-made menus that do not work with a keyboard or screen reader | The WAI-ARIA menu button pattern: arrow keys, Home, End, first-letter search, Esc and Tab to close. Focus returns to the button. Menus open upwards when there is no room below. | 2.1.1, 4.1.2 |
| Live search and filters | Announcements on every key press | Results update at once, but the count is announced only after typing pauses. Filters are ordinary labelled selects in a section that can be shown or hidden. | 3.2.2, 4.1.3 |
| Due dates and overdue highlighting | A red border as the only warning | The words "Overdue", a warning icon and a machine-readable `<time>`, as well as the border. Dates are shown in the user's own date format. | 1.3.1, 1.4.1 |
| Collapsible columns | A hidden state that is not announced | The column title is a button with `aria-expanded`. Collapsed columns keep their note count and still accept dropped notes. | 4.1.2 |
| Animations and transitions | Motion sickness, distraction | Animation follows the device's reduced motion setting and can be switched off. When it is off, nothing on the page animates. Motion is short and nothing flashes. | 2.3.1 (AA); 2.3.3 Animation from Interactions (AAA) |
| Sound effects | Startling sounds, clashing with screen readers, sound as the only cue | Sound is off until the user turns it on. Every sound comes with a visible, announced message, and each lasts under half a second. | 1.4.2 |
| Dark mode toggle | A toggle that does not say whether it is on | A real button with `aria-pressed`, in the same place on every visit. It also reflects the device's own dark setting. | 4.1.2, 3.2.3 |

## Accessibility requirements

These extend the user stories. Each one is an acceptance condition, not a
nice-to-have.

| # | Requirement | WCAG 2.2 |
|---|---|---|
| A1 | Every action works with the keyboard alone, with a visible focus indicator and a logical focus order. | 2.1.1, 2.1.2, 2.4.3, 2.4.7 |
| A2 | Every drag has a single-pointer, non-drag alternative. | 2.5.7 |
| A3 | Success messages are announced by screen readers without moving focus. Errors are announced too. | 4.1.3 |
| A4 | A rejected form names the problem in text, says how to fix it, and is tied to the field. Required fields say so in the label. | 3.3.1, 3.3.2, 3.3.3 |
| A5 | Deleting a note must be confirmed first. | 3.3.4 |
| A6 | Content reflows without horizontal scrolling at 320 CSS px (400% zoom), and survives 200% text resize and increased text spacing. | 1.4.4, 1.4.10, 1.4.12 |
| A7 | Text contrast is at least 4.5:1, and control boundaries, focus indicators and meaningful graphics at least 3:1, in light and dark themes. | 1.4.3, 1.4.11 |
| A8 | State is never shown by colour alone. | 1.4.1 |
| A9 | Pointer targets are at least 24 × 24 CSS px. | 2.5.8 |
| A10 | Focused elements are never entirely hidden by the fixed message bar. | 2.4.11 |
| A11 | Structure is exposed through landmarks, headings, lists and labels. Repeated controls have unique names that contain their visible label. | 1.3.1, 2.4.6, 2.5.3, 4.1.2 |
| A12 | Skip links bypass repeated content, the page has a title and a language. | 2.4.1, 2.4.2, 3.1.1 |
| A13 | Choosing a value in a control never moves a note or focus on its own. | 3.2.2 |
| A14 | Focus is never lost: it returns to a sensible place after dialogs, deletes and moves. | 2.4.3 |

## Design decisions

**Drag and drop has two non-drag twins (A1, A2).** Every note, in the list and on
the board, has a *Column* select with a *Move* button, and a *Pick up* button. The
select is how touch and switch users move notes. *Pick up* gives keyboard users the
directness of a drag: arrow keys choose a column, and each step is announced. The
note stays put until it is dropped, and leaving the button puts it back. The
instructions above the board mention all of these.

**Undo as well as confirmation (Safety).** Confirming every move would be tiresome,
and confirmation alone does not help after a mistake, so all changes can be undone
from the message or from the button in the header. Undo history is kept in memory,
so it ends when the page is closed or refreshed. Deleting still asks first.

**Imports ask only when something would be lost.** Adding notes can be undone, so
it goes straight through. A prompt appears only if a note the user has would be
overwritten by a different version.

**A button that stays enabled.** Undo uses `aria-disabled` rather than `disabled`
when there is nothing to undo. It stays in the tab order, and pressing it explains
why nothing happened.

**Settings use a container query for layout.** Media queries ignore the root font
size, so the text size setting could not switch the layout. A container query can.
Sizes are percentages, so they scale from whatever size the user has set in their
browser.

**Move needs a button (A13).** On Windows, pressing an arrow key on a closed
`<select>` fires `change` immediately. Moving on `change` would throw the note
through every column as the user browses the options, so the move happens only
when the button is pressed.

**One place for messages (A3, A10).** A single bar at the bottom of the page holds
two always-present live regions: `role="status"` for success and `role="alert"`
for errors. They stay in the DOM so that assistive technology picks up changes.
Messages do not time out, so nobody has to read against a clock. Users can dismiss
them. `scroll-padding-bottom` keeps the focused element clear of the bar.

**Native `<dialog>` for edit and delete (A1, A14).** `showModal()` provides the
focus containment, `Esc` handling and inert background. Delete dialogs open with
focus on *Cancel*, the safe choice. Focus returns to the button that opened the
dialog, or to the section heading if that button no longer exists.

**Focus after a move (A14).** Moving a note between columns remounts its card, so
focus is placed on the same card's *Move* button in the new location.

**Reflow instead of horizontal scrolling (A6).** Kanban boards normally scroll
sideways. Here, columns wrap onto new rows and stack at narrow widths. Breakpoints
use `rem` so they respond to zoom and text resize.

**Tags are one text field.** A comma-separated field is a plain labelled input. A
chip widget would need a custom keyboard model and offers little extra here.

**Colour and motion.** Light and dark themes follow `prefers-color-scheme`. Drag
states use dashed outlines, which survive forced-colors mode and are not
colour-only. The card being dragged is tinted rather than faded, because fading it
would take its text below 4.5:1. The app has no animation.

## Testing

See the end of [README.md](README.md) for how to run the tests.

Automated checks in `e2e/` run in Chromium through Playwright:

- axe-core with the WCAG 2.0, 2.1 and 2.2 A/AA rule sets, in the light, dark and
  high contrast themes, across the empty, populated, error, dialog, mid-drag,
  keyboard pick-up, search and settings states
- each row of the features table above, in `e2e/features.spec.ts`
- axe "incomplete" results count as failures. The one exception is text in the
  status bar and dialogs, whose background axe cannot determine because they float
  over the page. That text's rendered contrast is measured directly instead.
- a control test that injects a contrast failure, to prove that axe can fail
- non-text contrast of the design tokens (`src/contrast.test.ts`), which axe does
  not check
- no horizontal scrolling at 320 × 256, and none with WCAG 1.4.12 text spacing
- all interactive targets at least 24 × 24 px
- the whole workflow using only the keyboard
- focus position after dialogs, deletes and moves

### Limits of this testing

Automated tools catch only part of WCAG. The following have **not** been done and
should be before claiming conformance:

- manual testing with screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- testing with people with disabilities
- testing with voice control and switch access
- full testing in Firefox and Safari
- touch drag behaviour on real devices (the *Move* control is the supported route
  on touch screens)
- forced colours mode, which has styles but no automated test
- a reading level check of the wording (WCAG 3.1.5). It was written plainly, but
  not measured.

The AAA criteria named above are met only for what the table describes. The app
does not claim Level AAA, and criteria such as sign language (1.2.6) do not apply.
