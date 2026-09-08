import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom exposes scrollTo but its built-in implementation reports "Not implemented".
// Keep it a harmless spyable no-op for components that preserve page position.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
  writable: true,
});
