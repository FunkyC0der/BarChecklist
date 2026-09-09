import { normalizeError } from './log-error';

export function getErrorMessage(error: unknown, fallback: string) {
  const message = normalizeError(error).message;
  return message.trim() ? message : fallback;
}
