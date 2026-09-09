# Observability

How a beta bug report ("зламалось учора ввечері") gets reconstructed without
asking the user to open their phone's Web Inspector. There is no third-party
service here — everything lives in Supabase (Postgres logs and a
`client_events` table) plus a structured `console` on the client.

## What is logged and what never is

Allowlist, not blocklist — `src/lib/logger.ts`'s `ALLOWED_CONTEXT_KEYS`
enforces this on every call:

- **Logged:** id fields (`userId`, `teamId`, `checklistId`, `taskId`,
  `completionId`, `sessionId`, …), stable event slugs, RPC names, SQLSTATE
  codes, realtime channel status, route names, the app build version.
- **Never logged:** email, invite tokens or URLs containing them,
  `display_name`, checklist/task titles or any other free text, the
  `Authorization` header/JWT, or a full `location.href` with query string.

`src/lib/logger.test.ts` asserts the allowlist actually strips `email`,
`token`, and `title` from a logged context — that test is the privacy
regression guard; if it starts failing, something is about to leak.

## Event slugs

Stable, kebab-scoped identifiers — grep for these, not for free text:

| Slug | Where | Meaning |
| --- | --- | --- |
| `app.render-crash` | `app-error-boundary.tsx` | A component threw during render. |
| `app.uncaught-error` / `app.unhandled-rejection` | `global-error-handlers.ts` | Nothing else caught it. |
| `query-client.query-failed` / `query-client.mutation-failed` | `query-client.ts` | Any failed TanStack Query call. |
| `teams.refresh.failed` | `team-context.tsx` | `refreshTeams()` swallowed an error. |
| `teams.realtime.degraded` | `team-context.tsx` | The `my-teams:*` channel didn't reach `SUBSCRIBED`. |
| `realtime.today.degraded` / `realtime.today.error` | `use-today-realtime.ts` | The Today channel degraded, with the Supabase-reported error if any. |
| `realtime.team.degraded` / `realtime.team.error` | `use-team-realtime.ts` | Same, for the per-team channel. |
| `auth.sign-out.failed` | `app-layout.tsx` | Sign-out RPC failed (now also surfaces an error toast). |
| `auth.session-init.failed` | `auth-context.tsx` | Initial `getSession()` failed. |
| `auth.state-change` | `auth-context.tsx` | Every Supabase auth event, by name (`SIGNED_IN`, `TOKEN_REFRESHED`, …). |
| `auth.session-gate.blocked` | `guards.tsx` | `SessionGate` is showing its error screen; carries the real reason. |
| `today.snapshot.parse-failed` | `today-api.ts` | `get_today_snapshot` response didn't match the client's Zod schema. |
| `history.list.parse-failed` / `history.filter-options.parse-failed` | `history-api.ts` | Same, for `get_history` / `get_history_filter_options`. |

Server-side, `private.log_event(fn, reason, context)` writes
`raise log '[checklister] fn=% reason=% ctx=%'` right before every
`raise exception` in `complete_task`, `uncomplete_task`,
`get_today_snapshot`, `get_history`, and `accept_team_invite`. `raise log`
survives the transaction rollback the exception triggers, unlike a table
write from inside the same failing function.

## Reading the logs

**Client-side structured console** — open the browser console. In dev,
`logger.*` prints a collapsed group per event with full context and the raw
error. In production it prints one compact line
(`[checklister] <event> — <kind>:<code or name>`) so a user's screenshot
stays legible.

**Postgres logs (server failures)** — Supabase Dashboard → Logs → Postgres,
filter for `[checklister]`:

```
[checklister] fn=complete_task reason=not_scheduled ctx={"actor": "...", "taskId": "...", "teamId": "..."}
```

**`client_events` table (client warn/error breadcrumbs)** — no select policy
exists on purpose (see the table comment in
`supabase/migrations/20260909120000_observability.sql`); query it via the
Dashboard SQL editor with the service role, or `psql` against the project's
direct connection string.

Triage: every error a user hit in the last 24 hours —

```sql
select occurred_at, event, code, context
from client_events
where user_id = '<user-uuid>'
  and occurred_at > now() - interval '24 hours'
order by occurred_at desc;
```

All errors for a team in a time window —

```sql
select occurred_at, user_id, event, code, context
from client_events
where team_id = '<team-uuid>'
  and level = 'error'
  and occurred_at between '<from>' and '<to>'
order by occurred_at;
```

## Tying a bug report to a session

Every browser tab gets one `sessionId` (a UUID generated once in
`log-sink.ts`) attached to every event it sends, including realtime and
render-crash events with no natural request id. Cross-reference it with
[`docs/qa/beta-smoke-real-devices.md`](../qa/beta-smoke-real-devices.md)
RES-02 by asking the reporter for the time they saw the problem, then:

```sql
select * from client_events
where session_id = '<session-id>'
order by occurred_at;
```

## Retention

No `pg_cron` job runs against this table. Delete anything older than 30 days
by hand, from the Dashboard SQL editor:

```sql
delete from client_events where created_at < now() - interval '30 days';
```

## Limits enforced by `log_client_event`

- Requires `auth.uid()` — the RPC is `security definer` but still checks the
  caller is authenticated; `user_id`/`created_at` are stamped server-side and
  never trusted from the payload.
- At most 20 events per call, 4 KB per event.
- A `teamId` is accepted only if the caller is a member of that team.
- The client (`src/lib/log-sink.ts`) keeps a 50-entry in-memory ring buffer
  (`getRecentEvents()`) as the base for a future "send diagnostics" button,
  flushes queued warn/error events every 10 seconds, on tab hide, and
  immediately on any `error`-level event. The sink never throws and never
  re-enters the logger to report its own failure.
