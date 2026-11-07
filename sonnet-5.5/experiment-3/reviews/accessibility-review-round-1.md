# Accessibility review, round 1

Reviewer: the `accessibility-reviewer` definition in `.claude/agents/accessibility-reviewer.md`, run through a
general-purpose Opus subagent (the custom agent was created mid-session and was not yet registered).
Artifacts reviewed: `index.html`, `public/theme-init.js`, `src/App.jsx`, `src/components/*`, `src/styles.css`.

Verdict: **not acceptable as built**. 7 high, 9 medium and 8 low findings. All were fixed.

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| H1 | High | Search box and priority/tag selects had no label | Labels (visually hidden), `role="search"` group |
| H2 | High | Hover toolbar invisible on keyboard focus and touch | Shown on `:focus-within` and `@media (hover: none)` |
| H3 | High | `outline: none` on inputs; checkbox focus invisible | Removed; global `:focus-visible` outline in both themes |
| H4 | High | Toasts and import error not announced | Always-mounted `role="status"` / `role="alert"` regions; banner `role="alert"` |
| H5 | High | Undo toast gone after 5 s, no way to pause | Pause on hover/focus, 20 s for Undo toasts, header Undo button, Ctrl+Z |
| H6 | High | Text contrast below 4.5:1 (dark primary button, link, danger text; light danger/muted/tags; brightness hover) | Darker/lighter tokens, hover states darken instead of brighten |
| H7 | High | Inline rename inputs had no name | `aria-label` plus Enter/Escape hint |
| M1 | Medium | Errors not linked to fields; required not marked | `aria-required`, `aria-invalid`, `aria-describedby`, focus first invalid field |
| M2 | Medium | Focus lost after menu, rename, dialog, delete, move | Focus restored to trigger, heading, moved card or `main` |
| M3 | Medium | No keyboard way to reorder inside a column | Move up / down / to top / to bottom menu items, with position announced |
| M4 | Medium | No reduced-motion support | `prefers-reduced-motion` rule |
| M5 | Medium | Form field borders under 3:1 | `--field-border` token |
| M6 | Medium | Collapse button had no state or column name | `aria-expanded`, `aria-controls`, column name in label |
| M7 | Medium | Icon buttons named by `title`, names not unique | Unique `aria-label`s; toggles use `aria-pressed` |
| M8 | Medium | Result count not announced | `role="status"` |
| M9 | Medium | Menu keyboard model incomplete | Roving focus, Home/End, close on Tab/blur |
| L1-L8 | Low | Decorative SVGs, heading levels, count and priority context, dialog description, `.sr-label`, reflow at 320 px | All fixed |

## Checks after the fixes

- `axe-core` (WCAG 2.0 to 2.2 A/AA plus best practice) reports 0 violations in the light and dark themes, with the
  menu open, and with the edit dialog open showing a validation error.
- Focus moves to the invalid title field after a failed save, returns to the menu button after a menu action, and
  lands on the main area after a delete.
- Not checked: a real screen reader, forced-colours mode, and a second reviewer pass on the fixed code.
