import { Dialog } from './Dialog.jsx';
import { Icon } from './Icon.jsx';
import { useSettings } from '../state/settings.jsx';
import { DEFAULT_SETTINGS } from '../state/storage.js';

export function HelpDialog({ onClose }) {
  return (
    <Dialog title="Help" onClose={onClose} className="dialog-wide">
      <div className="dialog-body prose">
        <h3>What this app does</h3>
        <p>
          Write notes with a title, description, tags, a priority and a due date. Every note appears in the <strong>Notes</strong> list. Put a
          note on the <strong>Board</strong> to track it in a column such as “To do”, “In progress” or “Done”. Everything is saved in this
          browser automatically.
        </p>

        <h3>Moving notes</h3>
        <ul>
          <li>
            <strong>With a mouse or touch:</strong> drag a note onto a column. Drop it between two notes to choose its place.
          </li>
          <li>
            <strong>Without dragging:</strong> open a note’s <strong>More actions</strong> menu and choose “Move to”, “Move up in column” or
            “Move down in column”. This works with the keyboard, a screen reader, voice control and switch devices.
          </li>
          <li>If you drop a note somewhere that is not a column, it stays where it was.</li>
        </ul>

        <h3>Using the keyboard</h3>
        <ul>
          <li>
            <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> move between controls. <kbd>Enter</kbd> or <kbd>Space</kbd> press a button.
          </li>
          <li>
            In a menu, use the <kbd>Up</kbd> and <kbd>Down</kbd> arrow keys to move, <kbd>Enter</kbd> to choose and <kbd>Esc</kbd> to close it.
          </li>
          <li>
            <kbd>Esc</kbd> closes a dialog. The first <kbd>Esc</kbd> hides a tooltip if one is showing.
          </li>
          <li>Use the “skip” links at the very top of the page to jump straight to the form, the notes list or the board.</li>
          <li>There are no single-key shortcuts, so nothing happens by accident while you type.</li>
        </ul>

        <h3>Changing and undoing</h3>
        <ul>
          <li>
            To change a title quickly, double-click it or choose <strong>Rename title</strong> from the More actions menu. Choose{' '}
            <strong>Edit details</strong> to change everything.
          </li>
          <li>
            Deleting asks you to confirm. After most changes a message appears with an <strong>Undo</strong> button. The <strong>Undo</strong>{' '}
            button at the top of the page is always available and reverses the latest change. Messages stay for several seconds and pause
            while you point at them or focus inside them.
          </li>
        </ul>

        <h3>Saving and sharing your notes</h3>
        <ul>
          <li>
            <strong>Export notes</strong> downloads all your notes and columns as a JSON file.
          </li>
          <li>
            <strong>Import notes</strong> adds the notes from such a file. Notes with the same identity are updated. A file that is not valid
            is rejected and nothing changes.
          </li>
        </ul>

        <h3>Looks and sound</h3>
        <p>
          <strong>Dark mode</strong> and <strong>Sound effects</strong> are in the header. <strong>Settings</strong> has text size, animations
          and notification options. Sound effects are off until you turn them on, and everything a sound tells you is also shown as text.
        </p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

const SIZES = [
  { value: 'normal', label: 'Standard text size' },
  { value: 'large', label: 'Large text (125%)' },
  { value: 'xlarge', label: 'Extra large text (150%)' },
];

export function SettingsDialog({ onClose }) {
  const { settings, update } = useSettings();
  return (
    <Dialog title="Settings" onClose={onClose}>
      <div className="dialog-body">
        <p className="dialog-description">Changes apply straight away and are remembered in this browser.</p>

        <fieldset className="field fieldset">
          <legend className="field-label">Text size</legend>
          <div className="choice-list">
            {SIZES.map((s) => (
              <label key={s.value} className="choice">
                <input type="radio" name="text-size" value={s.value} checked={settings.textSize === s.value} onChange={() => update({ textSize: s.value })} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
          <p className="field-hint">You can also zoom the whole page with your browser. The layout adapts to both.</p>
        </fieldset>

        <fieldset className="field fieldset">
          <legend className="field-label">Motion and messages</legend>
          <div className="choice-list">
            <label className="choice">
              <input type="checkbox" checked={settings.animations} onChange={(e) => update({ animations: e.target.checked })} />
              <span>Use animations and transitions</span>
            </label>
            <label className="choice">
              <input type="checkbox" checked={settings.autoDismiss} onChange={(e) => update({ autoDismiss: e.target.checked })} />
              <span>Hide notifications automatically after a few seconds</span>
            </label>
          </div>
          <p className="field-hint">
            Animations are always reduced when your device is set to reduce motion. Turn automatic hiding off to keep every notification until
            you dismiss it.
          </p>
        </fieldset>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={() => update({ ...DEFAULT_SETTINGS, theme: settings.theme, sound: settings.sound })}>
          <Icon name="undo" />
          Reset these settings
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
