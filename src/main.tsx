import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { cleanReloadParam } from './ui/reload';
import { ErrorBoundary, NoWebGL, hasWebGL } from './ui/Fallback';
import './ui/styles.css';
import './ui/mobile.css';

cleanReloadParam();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{hasWebGL() ? <App /> : <NoWebGL />}</ErrorBoundary>
  </StrictMode>,
);
