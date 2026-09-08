import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const checks = [
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['test', ['run', 'test']],
];

let failed = false;

for (const [name, args] of checks) {
  console.log(`\n▶ ${name}`);
  const result = spawnSync(pnpm, args, { stdio: 'inherit' });

  if (result.status !== 0) {
    failed = true;
    console.error(`✖ ${name} failed`);
  }
}

if (failed) {
  process.exitCode = 1;
}
