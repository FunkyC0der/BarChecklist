import type { ZodType } from 'zod';

import { normalizeError, type NormalizedError } from './log-error';
import { queueLogEvent, sessionId } from './log-sink';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContextValue = string | number | boolean;
export type LogContext = Record<string, LogContextValue>;

export type LogEntry = {
  level: LogLevel;
  event: string;
  message?: string | undefined;
  error?: NormalizedError | undefined;
  context: LogContext;
  occurredAt: string;
};

/** Allowlist, not blocklist: an id, a stable RPC/event name, a status code,
 * or the route/session/build identity may be logged. Anything else — email,
 * display name, checklist/task text, tokens, full URLs — is dropped rather
 * than risk a beta user's data ending up in a support screenshot or the
 * Supabase logs. */
const ALLOWED_CONTEXT_KEYS = new Set([
  'rpc',
  'code',
  'sqlstate',
  'status',
  'route',
  'buildVersion',
  'sessionId',
  'event',
  'reason',
  'attempt',
  'count',
  'queryKey',
  'mutationKey',
]);

function isAllowedContextKey(key: string) {
  return ALLOWED_CONTEXT_KEYS.has(key) || /Id$/.test(key);
}

function filterContext(
  context: Record<string, unknown> | undefined,
): LogContext {
  if (!context) return {};
  const filtered: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (!isAllowedContextKey(key)) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      filtered[key] = value;
    }
  }
  return filtered;
}

let globalContext: LogContext = { sessionId, buildVersion: __APP_VERSION__ };

function emit(
  level: LogLevel,
  event: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  const normalized = error === undefined ? undefined : normalizeError(error);
  const entry: LogEntry = {
    level,
    event,
    error: normalized,
    message: normalized?.message,
    context: { ...globalContext, ...filterContext(context) },
    occurredAt: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[${level}] ${event}`);

    console.log('context', entry.context);
    if (normalized) {
      console.log('error', normalized, error);
    }

    console.groupEnd();
  } else if (level === 'error') {
    // screenshot of the console stays readable
    console.error(
      `[checklister] ${event}${normalized ? ` — ${normalized.kind}:${normalized.code ?? normalized.name}` : ''}`,
    );
  }

  if (level === 'warn' || level === 'error') {
    queueLogEvent(entry);
  }
}

export const logger = {
  setContext(context: Record<string, unknown>) {
    globalContext = { ...globalContext, ...filterContext(context) };
  },
  debug(event: string, context?: Record<string, unknown>) {
    emit('debug', event, undefined, context);
  },
  info(event: string, context?: Record<string, unknown>) {
    emit('info', event, undefined, context);
  },
  warn(event: string, context?: Record<string, unknown>) {
    emit('warn', event, undefined, context);
  },
  error(event: string, error: unknown, context?: Record<string, unknown>) {
    emit('error', event, error, context);
  },
};

/** RPC responses are parsed against a Zod schema so a schema drift between
 * client and server fails loudly instead of rendering `undefined`. Without
 * this, the failure was a raw ZodError with the full issue list surfaced
 * straight to the UI as JSON. */
export function parseOrLog<T>(
  schema: ZodType<T>,
  data: unknown,
  event: string,
  context?: Record<string, unknown>,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(event, result.error, context);
    throw result.error;
  }
  return result.data;
}
