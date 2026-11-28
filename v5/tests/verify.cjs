'use strict';
// Reproduce from a checkout. A nonzero *semantic* score is preserved in JSON;
// process failures, partial runs, broken lifecycle or new regressions abort.
const { spawnSync } = require('node:child_process'),
  path = require('node:path');
const root = path.resolve(__dirname, '../..'),
  dir = path.join(root, 'v5/reports');
const node = process.execPath,
  python = process.env.PYEXE || 'python';
function run(exe, args, allow = [0], env = {}) {
  const r = spawnSync(exe, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.error || r.signal || !allow.includes(r.status))
    throw Error(`${args.join(' ')}: ${r.error || r.signal || r.status}`);
}
const groups = {
  '': 'report,protocols,main,edge,editor,semantic',
  '-objects': 'objects',
  '-aliases': 'aliases',
  '-coverage': 'coverage',
  '-extended': 'archive,apps',
  '-rest': 'archive-rest',
  '-ascii': 'ascii',
  '-dictviews': 'dictviews',
  '-dictviews-boundaries': 'dictviews-boundaries',
  '-nestedrefs': 'nestedrefs',
  '-nestedrefs-boundaries': 'nestedrefs-boundaries',
};
const A = require('../baseline.json').file,
  B = require('../core-lock.json').file,
  report = (key, s = '') => path.join(dir, key + s + '.json');
const replay = (archive, file, group, env = {}) =>
  run(node, ['v5/tests/run.cjs', archive, file, group], [0, 1], env);
run(node, ['--test', 'v5/tests/build.test.cjs']);
for (const [key, archive] of [
  ['baseline', A],
  ['candidate', B],
]) {
  run(python, ['v5/tools/audit.py', archive, report(key, '-inventory')]);
  for (const [suffix, group] of Object.entries(groups)) replay(archive, report(key, suffix), group);
  run(node, ['v5/tests/lifecycle.cjs', archive, report(key, '-lifecycle')]);
  run(
    node,
    ['v5/tests/workspace.cjs', archive, report(key, '-workspace')],
    key === 'baseline' ? [0, 1] : [0],
  );
  replay(archive, report(key, '-vm2'), 'semantic,objects,ascii,nestedrefs', {
    MINIPY_VM: path.join(root, 'scratch-vm-develop/scratch-vm-develop'),
  });
}
run(node, ['v5/tests/compare.cjs']);
run(node, ['v5/tests/live-diff.cjs']);
run(python, ['v5/tools/features.py']);
if (process.argv.includes('--bench')) {
  run(node, ['v5/tests/bench.cjs', A, B, report('benchmark'), '5']);
  for (const [key, archive] of [
    ['baseline', A],
    ['candidate', B],
  ])
    run(node, ['v5/tests/run.cjs', archive, report(key, '-profile'), 'bench'], [0], {
      MINIPY_PROFILE: '1',
    });
  run(python, ['v5/tools/report.py']);
}
