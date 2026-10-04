'use strict';
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'dist', 'node_modules', '.netlify'].includes(entry.name)) return [];
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : /\.(?:js|cjs)$/.test(path) ? [path] : [];
  });
}
let failed = false;
for (const file of walk(root)) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
for (const file of readdirSync(root).filter(f => f.endsWith('.html'))) {
  const source = readFileSync(resolve(root, file), 'utf8');
  if (!source.includes('lang="en"') && !source.includes('lang=en')) { console.error(file + ': missing document language'); failed = true; }
  for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (!match[1].trim()) continue;
    const result = spawnSync(process.execPath, ['--check'], { input: match[1], encoding: 'utf8' });
    if (result.status !== 0) { console.error(file + ': ' + result.stderr); failed = true; }
  }
}
if (failed) process.exit(1);
console.log('JavaScript syntax and HTML document-language checks passed.');
