import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

let activeProcess = null;
let isShuttingDown = false;

const cleanExit = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill(signal);
  }
  process.exit(signal === 'SIGINT' ? 130 : 143);
};

process.on('SIGINT', () => cleanExit('SIGINT'));
process.on('SIGTERM', () => cleanExit('SIGTERM'));

console.log('⚡ Running typecheck (npm run typecheck)...');

activeProcess = spawn(npmCmd, ['run', 'typecheck'], {
  cwd: frontendDir,
  stdio: 'inherit',
  // Node refuses to spawn a .cmd shim directly on Windows; go through a shell.
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' }
});

activeProcess.on('close', (code) => {
  if (isShuttingDown) return;
  if (code === null) {
    process.exit(1);
  }
  if (code !== 0) {
    console.error(`\n❌ Typecheck failed with exit code ${code}. Vitest watch mode will not start.`);
    process.exit(code);
  }

  console.log('\n✅ Typecheck passed. Starting vitest in watch mode...');

  activeProcess = spawn(npxCmd, ['vitest'], {
    cwd: frontendDir,
    stdio: 'inherit',
    // Node refuses to spawn a .cmd shim directly on Windows; go through a shell.
    shell: isWindows,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  activeProcess.on('close', (vitestCode) => {
    if (isShuttingDown) return;
    process.exit(vitestCode ?? 0);
  });
});
