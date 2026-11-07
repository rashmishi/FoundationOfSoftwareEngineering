import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SettingsProvider } from './state/settings.jsx';
import { ToastProvider } from './state/toasts.jsx';
import { BoardProvider } from './state/board.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <BoardProvider>
          <App />
        </BoardProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
);
