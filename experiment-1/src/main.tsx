import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme, loadSettings } from './lib/settings';
import './styles.css';

// Apply the theme before the first render so the page never flashes the wrong colours.
applyTheme(loadSettings().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
