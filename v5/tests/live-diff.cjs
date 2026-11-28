'use strict';
// Re-evaluate unresolved frozen-oracle rows independently, without running the
// MiniPy source in the host as a substitute for its previously recorded VM run.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { cases, oracle } = require('./run.cjs');
const root = path.resolve(__dirname, '..'),
  read = (n) => JSON.parse(fs.readFileSync(path.join(root, 'reports', n + '.json'))),
  lock = require('../core-lock.json');
const groups = {
  candidate: 'report,protocols,main,edge,editor,semantic',
  'candidate-objects': 'objects',
  'candidate-aliases': 'aliases',
  'candidate-coverage': 'coverage',
  'candidate-extended': 'archive,apps',
  'candidate-rest': 'archive-rest',
  'candidate-ascii': 'ascii',
  'candidate-dictviews': 'dictviews',
  'candidate-dictviews-boundaries': 'dictviews-boundaries',
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  rows = [];
for (const [file, selection] of Object.entries(groups)) {
  const r = read(file);
  assert.equal(r.sha256, lock.sha256, 'stale ' + file);
  const suite = selection.split(',').flatMap((group) => cases(group).map((c) => ({ ...c, group })));
  assert.equal(suite.length, r.runs.length);
  for (const [i, x] of r.runs.entries()) {
    const c = suite[i];
    assert.equal(x.name, c.name);
    if (x.pass) continue;
    const py = oracle({ name: c.name, code: c.code });
    const exact = eq(x.out, py.out) && x.error === py.error;
    const plain = (v) => v.join('').replace(/0x[\da-fA-F]+/g, '0xADDR');
    const reason =
      c.code.includes('time.strftime(') && !c.code.includes('struct_time')
        ? 'clock-dependent'
        : exact
          ? 'matches-current-CPython'
          : !x.error && !py.error && plain(x.out) === plain(py.out) && x.out.join('').includes('0x')
            ? 'address-dependent'
            : x.error &&
                py.error &&
                x.error.split(':')[0] === py.error.split(':')[0] &&
                eq(x.out, py.out)
              ? 'exception-wording'
              : 'observable-difference';
    rows.push({
      group: c.group,
      name: c.name,
      reason,
      exact,
      vm: { out: x.out, error: x.error },
      python: py,
    });
  }
}
fs.writeFileSync(
  path.join(root, 'reports/live-diff.json'),
  JSON.stringify(
    {
      sha256: lock.sha256,
      python: read('candidate').python,
      scope: 'only failed strict oracle rows',
      rows,
    },
    null,
    1,
  ) + '\n',
);
