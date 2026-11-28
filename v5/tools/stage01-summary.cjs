'use strict';
// Compare the independent candidate against the immutable historical reports.
// Do not overwrite canonical reports or their SHA, and do not mix in the
// recovered ASCII suite as though it were the omitted original suite.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { compare } = require('../tests/compare.cjs');
const dir = path.join(__dirname, '../reports'), stage = path.join(dir, 'upgrade-stage-01');
const load = (folder, name) => JSON.parse(fs.readFileSync(path.join(folder, name + '.json')));
const before = require('../core-lock.json').sha256, frozen = require('../baseline.json').sha256;
const after = load(stage, 'dictviews-candidate').sha256;
const check = (folder, name, sha) => {
  const r = load(folder, name);
  assert.equal(r.sha256, sha, 'incompatible report ' + name);
  assert(r.runs.every(x => x.state.finished && x.state.sourceIntact && Object.values(x.state.frames).every(n => n === 0)), 'state ' + name);
  return r;
};
const combine = (...names) => ({ runs: names.flatMap(n => check(dir, n, before).runs) });
const scopes = {
  mainObjectsAliases: compare(combine('candidate', 'candidate-objects', 'candidate-aliases'), check(stage, 'dictviews-candidate-main', after)),
  coverage: compare(check(dir, 'candidate-coverage', before), check(stage, 'dictviews-candidate-coverage', after)),
  archiveApps: compare(check(dir, 'candidate-extended', before), check(stage, 'dictviews-candidate-extended', after)),
  archiveRest: compare(check(dir, 'candidate-rest', before), check(stage, 'dictviews-candidate-rest', after)),
  reconstructedAscii: compare(check(stage, 'ascii-recovered-core', before), check(stage, 'ascii-recovered-candidate', after)),
  dictviews: compare(check(stage, 'dictviews-core', before), check(stage, 'dictviews-candidate', after)),
  dictviewsHistory: compare(check(stage, 'dictviews-history-core', before), check(stage, 'dictviews-history-candidate', after)),
  dictviewsBoundaries: compare(check(stage, 'dictviews-boundaries-core', before), check(stage, 'dictviews-boundaries-candidate', after)),
};
const historical = Object.values(scopes).slice(0, 4);
const total = key => historical.reduce((n, x) => n + x[key], 0);
const v4 = {};
for (const [key, name] of [['dictviews','dictviews-v4'], ['dictviewsHistory','dictviews-history-v4'], ['reconstructedAscii','ascii-recovered-v4'], ['dictviewsBoundaries','dictviews-boundaries-v4']]) {
  const r = check(stage, name, frozen);
  v4[key] = { passed: r.runs.filter(x => x.pass).length, total: r.runs.length };
}
const live = load(dir, 'live-diff');
assert.equal(live.sha256, before);
const resolved = new Set(scopes.dictviewsHistory.fixes);
const triage = live.rows.map(r => {
  let disposition = 'defer: investigate observable semantics';
  if (resolved.has(r.name)) disposition = 'fixed in this stage candidate; confirmed by frozen oracle';
  else if (r.reason === 'clock-dependent' || r.reason === 'address-dependent') disposition = 'environment-dependent; retain strict historical score, not a deterministic defect';
  else if (r.reason === 'exception-wording') disposition = 'exception message/version; keep frozen oracle, review target CPython version';
  else if (r.name === 'exec_code' || r.name === '_mods_misc.json:unknown_mod') disposition = 'existing unsupported builtin/module; outside this optimization stage';
  else if (r.vm.error.startsWith('StatisticsError:') && r.python.error.startsWith('statistics.StatisticsError:')) disposition = 'exception qualification/rendering; type name and detail agree';
  else if (r.name === '_cov1:zero division caught') disposition = 'exception messages observed by user code; Python version review needed';
  else if (r.vm.error && r.python.error && r.vm.error.split(':')[0] !== r.python.error.split(':')[0]) disposition = 'exception type mismatch; investigate separately';
  return { ...r, disposition };
});
const summary = {
  frozen, before, after,
  comparisonScope: 'historical saved core reports vs current candidate; new targeted and ASCII suites tested locally on both sides; toolchains may differ for historical reports',
  historical: {
    total: total('total'), beforePassed: total('baselinePassed'), afterPassed: total('candidatePassed'),
    fixes: historical.flatMap(x => x.fixes), regressions: historical.flatMap(x => x.regressions),
  },
  scopes, v4,
  triage: { total: triage.length, stageResolved: triage.filter(x => resolved.has(x.name)).length },
  corePromoted: false,
};
fs.writeFileSync(path.join(stage, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(stage, 'live-diff-triage.json'), JSON.stringify({ sourceCore: before, candidate: after, rows: triage }, null, 2) + '\n');
console.log(JSON.stringify(summary.historical, null, 2));
process.exitCode = Number(Object.values(scopes).some(x => x.regressions.length));
