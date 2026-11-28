'use strict';
// Drive the same RUN hat as the editor. Do not clear interpreter data between programs.
const fs = require('node:fs'),
  path = require('node:path');
const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'));
const hash = (buf) => createHash('sha256').update(buf).digest('hex');
const write = (name, x) => fs.writeFileSync(name, JSON.stringify(x, null, 1) + '\n');
const vmModule = process.env.MINIPY_VM || path.join(root, '_work/vm5300/node_modules/scratch-vm');
const VM = require(vmModule);
const idx = path.resolve(require.resolve(vmModule));
const python = process.env.PYEXE || 'python';
const version = () => spawnSync(python, ['--version'], { encoding: 'utf8' }).stdout.trim();
const wrap = (lines) => lines.flatMap((l) => l.match(/.{1,26}/gu) || ['']);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function oracle(c) {
  if (c.expectedLines) return { out: wrap(c.expectedLines), error: c.error || '' };
  if ('stdout' in c)
    return { out: wrap(c.stdout === '' ? [] : c.stdout.split('\n')), error: c.error || '' };
  const r = spawnSync(python, ['-X', 'utf8', '-c', c.code], {
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, PYTHONHASHSEED: '0' },
  });
  if (r.error || r.signal || (!r.stderr.trim() && r.status !== 0))
    throw Error(`CPython ${c.name}: ${r.error || r.status}`);
  const text = r.stdout.replace(/\r\n/g, '\n');
  return {
    out: wrap(text ? text.replace(/\n$/, '').split('\n') : []),
    error: r.status === 0 ? '' : r.stderr.trimEnd().split(/\r?\n/).at(-1),
  };
}
const suites = {
  report: '_work/v41/v253/report-cases.json',
  protocols: '_work/v41/v253/edge-cases.json',
  main: '_work/v41/v258/edge-cases.json',
  edge: '_work/v41/v259/edge-cases.json',
  editor: '_work/v41/v267/cases.json',
  semantic: 'v5/tests/semantic.json',
  ascii: 'v5/tests/ascii.json',
  objects: 'v5/tests/objects.json',
  aliases: 'v5/tests/aliases.json',
  dictviews: 'v5/tests/dictviews.json',
  'dictviews-boundaries': 'v5/tests/dictviews-boundaries.json',
  apps: '_work/v41/v259/cases.json',
};
function cases(group) {
  if (group === 'dictviews-history') {
    const names = new Set([
      '_new6_edge:dict methods battery',
      '_cov205d:dict comprehension frequency',
      '_cov4:dict comprehension',
      '_cov7:comprehension over dict items',
      '_cov7:dict and set comprehension with condition',
      '_covX:dict comprehension over items',
      '_covY:comprehension over dict values',
      '_covY:comprehension over dict items',
    ]);
    const rows = cases('coverage').filter((c) => names.has(c.name));
    if (rows.length !== names.size) throw Error('Missing frozen dict view history');
    return rows;
  }
  if (group === 'coverage')
    return read('_work/v41/_curve/expected.json')
      .filter((c) => /^_(new|cov)/.test(c.tag))
      .map((c) => ({
        ...c,
        name: c.tag + ':' + c.name,
        expectedLines: c.exp,
        error: (c.pyerr || '').trimEnd(),
      }));
  if (group === 'archive-rest') {
    const input = new Map(
      read('_work/v41/_curve/expected.json')
        .filter((c) => c.inputs)
        .map((c) => [c.name, c.inputs]),
    );
    return read('_work/v41/_reg232_237.json')
      .filter((c) => c.pyerr || c.code.includes('input('))
      .map((c) => ({
        ...c,
        expectedLines: c.py,
        error: (c.pyerr || '').trimEnd(),
        inputs: input.get(c.name),
      }));
  }
  if (group === 'archive')
    return read('_work/v41/_reg232_237.json')
      .filter((c) => !c.inputs && !c.code.includes('input(') && Array.isArray(c.py) && !c.pyerr)
      .map((c) => ({ ...c, stdout: c.py.join('\n') }));
  if (group === 'bench')
    return [
      { name: 'empty', code: '', stdout: '' },
      {
        name: 'physical-800',
        code: Array(799).fill('# line').concat('print(1)').join('\n'),
        stdout: '1',
      },
      {
        name: 'calls-30',
        code: 'def f(x):\n    return x + 1\ns=0\nfor i in range(30):\n    s += f(i)\nprint(s)',
        stdout: '465',
      },
      {
        name: 'branch-loop',
        code: 's=0\nfor i in range(120):\n    if i % 2: s += i\nprint(s)',
        stdout: '3600',
      },
      read(suites.editor)[0],
      {
        name: 'string-literal-1500',
        code: `s='${'x'.repeat(1500)}'\nprint(len(s))`,
        stdout: '1500',
      },
    ];
  if (!suites[group]) throw Error('Unknown suite: ' + group);
  return read(suites[group]);
}
function variables(t) {
  return Object.fromEntries(Object.values(t.variables).map((v) => [v.name, v]));
}
async function session(archive, profile = false) {
  const vm = new VM(),
    r = vm.runtime;
  const buf = fs.readFileSync(archive),
    start = performance.now();
  let counts = {};
  if (profile) {
    const original = r._primitives.procedures_call;
    r._primitives.procedures_call = (args, util) => {
      const k = args.mutation.proccode;
      counts[k] = (counts[k] || 0) + 1;
      return original(args, util);
    };
  }
  await vm.loadProject(buf);
  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 30; i++) r._step();
  const bootMs = performance.now() - start,
    s = variables(r.getTargetForStage()),
    local = variables(r.targets.find((t) => t.getName() === 'Interpreter'));
  function run(c, expected) {
    vm.stopAll();
    const lines = c.code.replace(/\r/g, '').split('\n');
    s.Code.value = lines.slice();
    s.Output.value = [];
    for (const [k, v] of Object.entries({
      mode: c.mode || 0,
      ticket: c.mode ? 100000 : 1,
      stopreq: 0,
      running: 1,
      speed: 1,
      error: '',
    }))
      s[k].value = v;
    counts = {};
    r.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    const t0 = performance.now(),
      limit = Number(process.env.MINIPY_MAX_MS || 180000);
    let peakCells = 0;
    const answers = [...(c.inputs || [])];
    for (let n = 0; n < 100000 && +s.running.value && performance.now() - t0 < limit; n++) {
      if (
        answers.length &&
        s.status.value === 'Waiting for input' &&
        (s.stdin || local.stdin).value === ''
      )
        (s.stdin || local.stdin).value = answers.shift();
      r._step();
      if (profile)
        peakCells = Math.max(
          peakCells,
          Object.values(local).reduce((v, x) => v + (x.type === 'list' ? x.value.length : 0), 0),
        );
    }
    const ms = +(performance.now() - t0).toFixed(2),
      raw = s.Output.value.map(String),
      error = String(s.error.value || ''),
      map = s.SrcMap267.value.map(Number);
    let out = raw,
      line = null;
    if (error) {
      const at = raw.findLastIndex((x) => /^Line \d+: /.test(x));
      if (
        at >= 0 &&
        raw.slice(at).join('') === `Line ${Number(raw[at].match(/^Line (\d+)/)[1])}: ${error}`
      ) {
        line = Number(raw[at].match(/^Line (\d+)/)[1]);
        out = raw.slice(0, at);
      }
    }
    const state = {
      finished: !+s.running.value && !+s.busy.value,
      sourceIntact: eq(lines, s.Code.value),
      frames: Object.fromEntries(
        ['VSave', 'LSave', 'FrVBase', 'FrLBase', 'FnStack']
          .filter((k) => local[k])
          .map((k) => [k, local[k].value.length]),
      ),
    };
    const pass =
      state.finished &&
      state.sourceIntact &&
      Object.values(state.frames).every((v) => v === 0) &&
      eq(expected.out, out) &&
      expected.error === error &&
      (!c.map || eq(c.map, map)) &&
      (!c.line || line === c.line);
    return {
      pass,
      ms,
      out,
      error,
      line,
      ...(c.map ? { map } : {}),
      state,
      ...(profile
        ? {
            peakCells,
            topCalls: Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 16),
          }
        : {}),
      ...(!pass ? { expected } : {}),
    };
  }
  return { vm, run, bootMs, sha256: hash(buf) };
}
async function main() {
  const [archive, output, selection = 'report,protocols,main,edge,editor,semantic', n = '1'] =
    process.argv.slice(2);
  if (!archive || !output || !Number.isInteger(+n) || +n < 1)
    throw Error('run.cjs <archive> <report.json> [groups,csv] [repeats]');
  const all = selection
    .split(',')
    .flatMap((group) => cases(group).map((c) => ({ ...c, group })))
    .map((c) => ({ ...c, expected: oracle(c) }));
  const sess = await session(archive, process.env.MINIPY_PROFILE === '1');
  const report = {
    sha256: sess.sha256,
    node: process.version,
    vmFileSha256: hash(fs.readFileSync(idx)),
    python: version(),
    bootMs: sess.bootMs,
    profile: process.env.MINIPY_PROFILE === '1',
    runs: [],
  };
  try {
    for (let i = 0; i < +n; i++)
      for (const c of all) {
        const x = { group: c.group, name: c.name, round: i + 1, ...sess.run(c, c.expected) };
        report.runs.push(x);
        if (!x.state.finished) throw Error(`Incomplete RUN: ${c.name}`);
      }
  } finally {
    sess.vm.quit();
    write(output, report);
  }
  const failures = report.runs.filter((x) => !x.pass);
  process.stdout.write(
    `${report.runs.length - failures.length}/${report.runs.length} oracle + state; ${failures.map((x) => x.name).slice(0, 15)}\n`,
  );
  return failures.length ? 1 : 0;
}
if (require.main === module) {
  console.log = console.warn = () => {};
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(e);
      process.exit(2);
    });
}
module.exports = { session, cases, oracle };
