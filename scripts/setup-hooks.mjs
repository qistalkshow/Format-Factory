import { chmodSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

if (existsSync('.git')) {
  if (process.platform !== 'win32') chmodSync('.githooks/pre-commit', 0o755);
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    stdio: 'inherit',
  });
} else
  console.log('No Git repository yet. Run npm run prepare after git init.');
