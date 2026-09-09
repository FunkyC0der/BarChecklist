import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function read(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readConfig() {
  const config = readFileSync('supabase/config.toml', 'utf8');
  const projectId =
    /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1] ?? 'unknown';
  const dbPort =
    /^\[db\][^[]*?^port\s*=\s*(\d+)/ms.exec(config)?.[1] ?? '54322';
  return { dbPort, projectId };
}

function waitForDocker() {
  if (read('docker', ['info']) !== null) return true;

  if (process.platform !== 'darwin') {
    console.error(
      '✖ Docker is not running. Start it, then run pnpm db:up again.',
    );
    return false;
  }

  console.log('▶ Docker is not running, launching Docker Desktop');
  spawnSync('open', ['-a', 'Docker'], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    spawnSync('sleep', ['3']);
    if (read('docker', ['info']) !== null) return true;
  }
  console.error('✖ Docker did not become ready in two minutes.');
  return false;
}

// A Supabase stack from another project_id holds the port when the repo was
// renamed or another Supabase project is running. Report it instead of stopping
// it: those containers may belong to work the developer still needs.
function findForeignStack({ dbPort, projectId }) {
  const listed = read('docker', [
    'ps',
    '--filter',
    `publish=${dbPort}`,
    '--format',
    '{{.Names}}',
  ]);
  if (!listed) return null;
  const own = `supabase_db_${projectId}`;
  return listed.split('\n').find((name) => name && name !== own) ?? null;
}

const config = readConfig();
if (!waitForDocker()) process.exit(1);

const foreign = findForeignStack(config);
if (foreign) {
  const project = foreign.replace(/^supabase_db_/, '');
  console.error(
    `✖ Port ${config.dbPort} is held by the Supabase stack "${project}", not by this repo's "${config.projectId}".`,
  );
  console.error(`  Stop it, then run pnpm db:up again:`);
  console.error(
    `    docker ps -q --filter name=_${project} | xargs -r docker stop`,
  );
  process.exit(1);
}

console.log('▶ supabase start');
const started = spawnSync(pnpm, ['run', 'supabase:start'], {
  stdio: 'inherit',
});
process.exit(started.status ?? 1);
