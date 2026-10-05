'use strict';
const { mkdirSync, rmSync, copyFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const output = resolve(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output);
for (const file of require('./public-files.cjs')) copyFileSync(resolve(root, file), resolve(output, file));
console.log('Built static production files in dist/. Netlify functions are bundled separately by Netlify.');
