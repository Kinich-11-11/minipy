'use strict';
// Compare the complete ordered rows; refuse stale, mixed, truncated or reordered reports.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'reports', name + '.json')));
const { cases } = require('./run.cjs');
const suites = {
  '': 'report,protocols,main,edge,editor,semantic',
  '-objects': 'objects',
  '-aliases': 'aliases',
  '-coverage': 'coverage',
  '-extended': 'archive,apps',
  '-rest': 'archive-rest',
  '-ascii': 'ascii',
  '-dictviews': 'dictviews',
  '-dictviews-boundaries': 'dictviews-boundaries',
};
function compare(a, b) {
  assert.equal(a.runs.length, b.runs.length, 'truncated suite');
  const changed = [],
    regressions = [],
    fixes = [];
  for (const [i, x] of a.runs.entries()) {
    const y = b.runs[i];
    assert.deepEqual([x.group, x.name, x.round], [y.group, y.name, y.round]);
    assert(y.state.finished && y.state.sourceIntact, `incomplete/modified source: ${y.name}`);
    if (x.pass && !y.pass) regressions.push(x.name);
    if (!x.pass && y.pass) fixes.push(x.name);
    if (
      !x.pass &&
      !y.pass &&
      JSON.stringify([x.out, x.error, x.line]) !== JSON.stringify([y.out, y.error, y.line])
    )
      changed.push(x.name);
  }
  return {
    total: a.runs.length,
    baselinePassed: a.runs.filter((x) => x.pass).length,
    candidatePassed: b.runs.filter((x) => x.pass).length,
    fixes,
    regressions,
    changedWhileFailing: changed,
  };
}
if (require.main === module) {
  const base = require('../baseline.json'),
    candidate = require('../core-lock.json'),
    summary = {};
  let failed = false;
  for (const [s, selection] of Object.entries(suites)) {
    const a = load('baseline' + s),
      b = load('candidate' + s);
    assert.equal(a.sha256, base.sha256);
    assert.equal(b.sha256, candidate.sha256);
    assert.equal(a.vmFileSha256, b.vmFileSha256);
    assert.equal(a.node, b.node);
    assert.equal(a.python, b.python);
    const expected = selection
      .split(',')
      .flatMap((group) => cases(group).map((c) => [group, c.name, 1]));
    assert.deepEqual(
      a.runs.map((x) => [x.group, x.name, x.round]),
      expected,
      'missing baseline rows',
    );
    const result = compare(a, b);
    summary[s.slice(1) || 'main'] = result;
    failed ||= result.regressions.length > 0;
  }
  fs.writeFileSync(path.join(root, 'reports/comparison.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = Number(failed);
}
module.exports = { compare };
