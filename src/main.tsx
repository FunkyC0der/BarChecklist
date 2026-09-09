import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { installGlobalErrorHandlers } from './lib/global-error-handlers';
import './index.css';

installGlobalErrorHandlers();

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root is missing.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
