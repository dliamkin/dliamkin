import { spawn } from 'node:child_process';
import path from 'node:path';

const projectDir = process.cwd();
const nodeBin = '/home/dliamkin/.nvm/versions/node/v24.18.0/bin/node';
const viteBin = path.join(projectDir, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(nodeBin, [viteBin, '--host', '0.0.0.0'], {
  cwd: projectDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.dirname(nodeBin)}:${process.env.PATH || ''}`,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
