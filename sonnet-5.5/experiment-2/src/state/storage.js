import { createInitialState } from './reducer.js';
import { normalizeData } from './importExport.js';

export const DATA_KEY = 'notes-board:data:v1';
export const SETTINGS_KEY = 'notes-board:settings';

export function loadState() {
  try {
    const text = localStorage.getItem(DATA_KEY);
    if (!text) return createInitialState();
    const result = normalizeData(JSON.parse(text), { strict: false });
    if (!result.ok) return createInitialState();
    return result.data;
  } catch {
    return createInitialState();
  }
}

/** Returns true when the data was written, false when the browser refused (private mode, quota, disabled storage). */
export function saveState(state) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS = {
  theme: null, // null = follow the operating system until the person picks one
  sound: false,
  textSize: 'normal', // normal | large | xlarge
  animations: true,
  autoDismiss: true,
};

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null,
      sound: raw.sound === true,
      textSize: raw.textSize === 'large' || raw.textSize === 'xlarge' ? raw.textSize : 'normal',
      animations: raw.animations !== false,
      autoDismiss: raw.autoDismiss !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* settings just won't persist */
  }
}
