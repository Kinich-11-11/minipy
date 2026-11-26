'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const work = path.dirname(__dirname);
const src = path.resolve(work, '../../MiniPy_v4.252.sb3');
const out = path.join(__dirname, 'MiniPy_v4.252-view-membership-candidate.sb3');
const expected = 'e8633f497337273b22ee21fafbe56914578f87cc83581d4d87ae29b40962ff89';
if (crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex') !== expected) {
  throw new Error('Unexpected MiniPy v4.252 baseline');
}
const head = fs.readFileSync(path.join(work, 'head.txt'), 'utf8').split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m, `const ROOT = ${JSON.stringify(path.dirname(src))};`)
  .replace(/^const SRC = .*;$/m, `const SRC = ${JSON.stringify(src)};`)
  .replace(/^const OUT = .*;$/m, `const OUT = ${JSON.stringify(out)};`)
  .replace(/^const STAMP = .*;$/m, "const STAMP = 'MiniPy v4.252 + view membership (candidate)';");
const patch = fs.readFileSync(path.join(__dirname, 'view-membership.patch.js'), 'utf8');
const tail = fs.readFileSync(path.join(work, 'tail.txt'), 'utf8')
  .replace('fs.writeFileSync(OUT_JSON, JSON.stringify(project));', '');
// File name sets the relative requires for head/tail; no generated source is written.
const filename = path.join(work, 'build-membership.generated.cjs');
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = module.paths;
mod._compile([head, patch, tail].join('\n'), filename);