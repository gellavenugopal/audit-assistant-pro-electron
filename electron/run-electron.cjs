const { spawn } = require('child_process');
const electronPath = require('electron');

delete process.env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, process.argv.slice(2), {
  stdio: 'inherit',
  windowsHide: false,
});

child.on('close', (code, signal) => {
  if (code === null) {
    console.error(`${electronPath} exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code);
});
