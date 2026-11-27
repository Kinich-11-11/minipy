'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  fs = require('node:fs'),
  os = require('node:os');
const { build, plan } = require('../build.cjs'),
  { validate } = require('../validate.cjs'),
  { zipRead } = require('../../_work/sb3lib.js');
const base = require('../baseline.json');
const root = path.resolve(__dirname, '../..'),
  digest = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mod = (id, after = [], writes = [id]) => ({ id, after, writes });
test('dependency closure is stable and a dependency is applied once', () => {
  assert.deepEqual(
    plan([mod('c', ['a', 'b']), mod('b', ['a']), mod('a')], ['c', 'b']).map((x) => x.id),
    ['a', 'b', 'c'],
  );
});
test('duplicate, missing, cyclic and conflicting patches fail before writing', () => {
  for (const [ms, ids, rx] of [
    [[mod('a'), mod('a')], ['a'], /duplicate/],
    [[mod('a', ['b'])], ['a'], /unknown/],
    [[mod('a', ['b']), mod('b', ['a'])], ['a'], /cycle/],
    [[mod('a'), mod('b', [], ['a'])], ['a', 'b'], /conflicting/],
  ])
    assert.throws(() => plan(ms, ids), rx);
});
test('baseline is fixed and cannot be an output', () => {
  const p = path.join(root, base.file);
  assert.equal(digest(p), base.sha256);
  assert.throws(() => build({ out: p }), /overwrite/);
});
test('core is byte-identical from either root; a failed patch cannot publish', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minipy-v5-test-')),
    out = path.join(dir, 'result.sb3');
  try {
    const full = build({ out }),
      lock = require('../core-lock.json');
    assert.equal(full.sha256, lock.sha256);
    assert.equal(build({ out, core: true }).sha256, full.sha256);
    assert.throws(
      () =>
        build({
          out,
          core: true,
          extensions: [
            {
              ...mod('broken'),
              apply(p) {
                p.targets[0].blocks.bad = {
                  opcode: 'operator_add',
                  parent: null,
                  next: null,
                  fields: {},
                  inputs: { OPERAND1: [1, [4, '2']] },
                  topLevel: true,
                };
              },
            },
          ],
        }),
      /arithmetic/,
    );
    assert.equal(digest(out), lock.sha256);
    const entries = zipRead(out),
      p = JSON.parse(entries.find((e) => e.name === 'project.json').data);
    const b = p.targets[0].blocks,
      root = Object.keys(b).find((k) => b[k].topLevel && b[k].next);
    b[b[root].next].parent = null;
    assert.throws(() => validate(p, entries), /parent/);
  } finally {
    if (fs.existsSync(out)) fs.unlinkSync(out);
    fs.rmdirSync(dir);
  }
});
