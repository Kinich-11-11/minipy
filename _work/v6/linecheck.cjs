'use strict';
/**
 * P1 diagnostics checker: runs the line-number / error-text expectations in
 * p1line.json against a built .sb3 through the same headless scratch-vm harness.
 *   node _work/v6/linecheck.cjs <sb3>
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'p1line.json'), 'utf8'));
const cases = spec.cases;
const casesPath = path.join(__dirname, '_p1line_cases.json');
const outPath = path.join(__dirname, '_p1line_res.json');
fs.writeFileSync(casesPath, JSON.stringify(cases.map((c) => ({ name: c.name, code: c.code })), null, 1));
execFileSync(process.execPath, [path.join(root, '_work', 'v5', 'run5.cjs'), sb3, casesPath, '--max', '8000', '--json', outPath],
  { stdio: 'ignore', cwd: root });
const res = JSON.parse(fs.readFileSync(outPath, 'utf8')).results;
let pass = 0, fail = 0;
for (const c of cases) {
  const r = res.find((x) => x.name === c.name) || { out: [], err: '' };
  const text = (r.out || []).join('').replace(/\s+/g, ' ');
  const want = c.expect.replace(/\s+/g, ' ');
  if (text.indexOf(want) >= 0) { pass++; } else {
    fail++;
    console.log('  x ' + c.name.padEnd(14) + ' want~' + JSON.stringify(c.expect) + ' got=' + JSON.stringify((r.out || []).join('')));
  }
}
console.log('linecheck PASS ' + pass + '  FAIL ' + fail);
process.exit(fail ? 1 : 0);
