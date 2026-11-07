import { useBoard } from '../state/board.jsx';
import { useSettings } from '../state/settings.jsx';
import { Icon } from './Icon.jsx';
import { playSound } from '../lib/sound.js';

function Switch({ label, checked, onChange, onIcon, offIcon }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-label">{label}</span>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb">
          <Icon name={checked ? onIcon : offIcon} />
        </span>
      </span>
      <span className="switch-state" aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}

export function Header({ onHelp, onSettings }) {
  const { actions, undoTopId, undoLabel } = useBoard();
  const { settings, theme, update } = useSettings();

  return (
    <header className="app-header">
      <div className="brand">
        <Icon name="board" className="brand-icon" />
        <h1>Notes Board</h1>
      </div>
      <div className="header-actions">
        <button type="button" className="btn" disabled={!undoTopId} onClick={actions.undo}>
          <Icon name="undo" />
          <span>
            Undo<span className="sr-only"> {undoLabel}</span>
          </span>
        </button>
        <button type="button" className="btn" onClick={onHelp}>
          <Icon name="help" />
          Help
        </button>
        <button type="button" className="btn" onClick={onSettings}>
          <Icon name="settings" />
          Settings
        </button>
        <Switch label="Dark mode" checked={theme === 'dark'} onChange={(on) => update({ theme: on ? 'dark' : 'light' })} onIcon="moon" offIcon="sun" />
        <Switch
          label="Sound effects"
          checked={settings.sound}
          onChange={(on) => {
            update({ sound: on });
            // Play one short sound as confirmation when turning on (the setting is not applied yet).
            if (on) playSound('toggle', { force: true });
          }}
          onIcon="volumeOn"
          offIcon="volumeOff"
        />
      </div>
    </header>
  );
}
