import { useState } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCE_GROUPS, type Preferences } from '../preferences';

interface DisplaySettingsProps {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  onClose: () => void;
}

/** Each choice applies straight away. The page behind shows the result once this closes. */
export function DisplaySettings({ preferences, onChange, onClose }: DisplaySettingsProps) {
  const [resetMessage, setResetMessage] = useState('');

  return (
    <>
      <p className="dialog-intro">Changes apply straight away and are remembered in this browser.</p>

      {PREFERENCE_GROUPS.map(({ key, legend, options }) => (
        <fieldset key={key} className="choice-group">
          <legend>{legend}</legend>
          {options.map(({ value, label }) => (
            <label key={value} className="choice">
              <input
                type="radio"
                name={key}
                value={value}
                checked={preferences[key] === value}
                onChange={() => {
                  setResetMessage('');
                  onChange({ ...preferences, [key]: value });
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ))}

      <p className="field-note" aria-live="polite">
        {resetMessage}
      </p>

      <div className="button-row">
        <button type="button" className="button button-primary" onClick={onClose}>
          Done
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            onChange(DEFAULT_PREFERENCES);
            setResetMessage('Display settings are back to their defaults.');
          }}
        >
          Reset to defaults
        </button>
      </div>
    </>
  );
}
