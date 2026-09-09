import { logger } from './logger';

/** Catches whatever the app didn't already: a throw outside a React render
 * pass, or a rejected promise nobody awaited. Call once from main.tsx. */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logger.error('app.uncaught-error', event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('app.unhandled-rejection', event.reason);
  });
}
