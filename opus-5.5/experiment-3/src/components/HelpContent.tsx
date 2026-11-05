const SHORTCUTS: [string, string][] = [
  ['Tab / Shift+Tab', 'Move between controls.'],
  ['Ctrl+Z (Cmd+Z on Mac)', 'Undo the last change, when you are not typing in a field.'],
  ['F8', 'Go to the newest notification.'],
  ['F2', 'Rename a note, when its title has focus.'],
  ['Escape', 'Close a menu, dialog, tooltip or notification, cancel a rename or a move, or clear the search.'],
  ['Arrow keys, Home, End', 'Move between items in an open menu.'],
];

export function HelpContent() {
  return (
    <div className="help">
      <h3>Moving notes without dragging</h3>
      <ol>
        <li>
          Use the <strong>Move to…</strong> button on a note (or Move to… in its More actions menu). Choose a column and a
          position, then press <strong>Move</strong>. This works well with screen readers.
        </li>
        <li>
          Use <strong>Move up</strong>, <strong>Move down</strong> or <strong>Remove from board</strong> in a note’s More
          actions menu.
        </li>
        <li>
          Keyboard move: go to the note’s <strong>Drag</strong> button and press Space to pick the note up. Left and Right
          arrows change the column, Up and Down arrows change the position. Press Space to drop or Escape to cancel. Screen
          reader users may need to switch to focus mode first, or use Move to… instead.
        </li>
      </ol>
      <h3>Keyboard shortcuts</h3>
      <dl className="shortcuts">
        {SHORTCUTS.map(([key, text]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
