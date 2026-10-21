import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SessionRoot } from './session/SessionRoot';
import { cleanReloadParam } from './ui/reload';
import { ErrorBoundary, NoWebGL, hasWebGL } from './ui/Fallback';
import './ui/styles.css';
import './ui/mobile.css';
import './ui/game-ui.css';
import './session/session.css';
import { registerOffline } from './session/offline';

cleanReloadParam();
void registerOffline().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{hasWebGL() ? <SessionRoot /> : <NoWebGL />}</ErrorBoundary>
  </StrictMode>,
);
