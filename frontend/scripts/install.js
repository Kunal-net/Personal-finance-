#!/usr/bin/env /Users/kunalsuryanshi/Library/Caches/ms-playwright-go/1.57.0/node
const { execFileSync } = require('child_process');
const path = require('path');

const NODE = process.execPath;
const NPM_CLI = '/tmp/package/bin/npm-cli.js';
const CWD = path.join(__dirname, '..');

console.log('Node:', NODE);
console.log('CWD:', CWD);
console.log('Starting npm install...');

try {
  execFileSync(NODE, [NPM_CLI, 'install', '--prefer-offline', '--loglevel', 'verbose'], {
    cwd: CWD,
    stdio: 'inherit',
    timeout: 300000,
  });
  console.log('✅ npm install done!');
} catch (e) {
  console.error('❌ install failed:', e.message);
  process.exit(1);
}
