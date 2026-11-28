'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { build } = require('../build.cjs');
const lock = require('../core-lock.json');
const patch = require('../patches/dict-view-consumers.cjs');

test('incremental builds enforce the core guard and reproduce bytes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minipy-dict-view-'));
  const a = path.join(dir, 'a.sb3'), b = path.join(dir, 'b.sb3');
  try {
    assert.equal(patch.requiresCore, lock.sha256);
    const first = build({ out: a, core: true, extensions: [patch] });
    assert.equal(first.input, lock.sha256);
    assert.notEqual(first.sha256, lock.sha256);
    assert.equal(build({ out: b, core: true, extensions: [patch] }).sha256, first.sha256);
    assert.deepEqual(fs.readFileSync(a), fs.readFileSync(b));
    assert.throws(() => build({ out: a, core: true, extensions: [{ ...patch, requiresCore: 'wrong' }] }), /incompatible core/);
    assert.deepEqual(fs.readFileSync(a), fs.readFileSync(b));
    assert.equal(build({ out: b, core: true }).sha256, lock.sha256);
  } finally {
    for (const file of [a, b]) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
});
