import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(pnpm, ['exec', 'supabase', 'test', 'db'], {
  encoding: 'utf8',
});
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

// The CLI reports an unreachable local stack as a raw connect error, which says
// nothing about how to fix it.
if (result.status !== 0 && /ECONNREFUSED|failed to connect/i.test(output)) {
  console.error('\n✖ The local Supabase stack is not running.');
  console.error('  Start it, then run pnpm supabase:test again:');
  console.error('    pnpm db:up');
}

process.exit(result.status ?? 1);
