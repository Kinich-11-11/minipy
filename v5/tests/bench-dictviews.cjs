'use strict';
// Stage benchmark: before/after use the same workloads, even where the old
// view result is wrong. A failed oracle timing is not a speed comparison.
const fs = require('node:fs'), os = require('node:os');
const { session, cases, oracle } = require('./run.cjs');
async function main() {
  const [a, b, out, n = '5'] = process.argv.slice(2);
  if (!a || !b || !out || !Number.isInteger(+n) || +n < 3) throw Error('expected before after report repeats>=3');
  const selection = new Set(['view-repr-direct', 'view-items-comp', 'view-list-still-works']);
  const suite = cases('dictviews').filter((c) => selection.has(c.name));
  suite.push({ name: 'arithmetic-control', code: 's=0\nfor i in range(30): s+=i\nprint(s)' });
  for (const c of suite) c.expected = oracle(c);
  const report = {
    node: process.version, zlib: process.versions.zlib,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0].model,
    method: 'one initialized VM per archive; untimed warmup of every workload; alternating AB/BA rounds, no profiling',
    samples: [],
  };
  const sessions = {};
  try {
    for (const [key, file] of [['before', a], ['after', b]]) {
      sessions[key] = await session(file);
      for (const c of suite) sessions[key].run(c, c.expected);
    }
    for (let i = 0; i < +n; i++) {
      for (const key of i % 2 ? ['after', 'before'] : ['before', 'after']) {
        const s = sessions[key];
        const samples = suite.map(c => {
          const r = s.run(c, c.expected);
          if (!r.state.finished || !r.state.sourceIntact || (key === 'after' && !r.pass))
            throw Error(`${key}: ${c.name}`);
          return { name: c.name, ms: r.ms, pass: r.pass };
        });
        report.samples.push({ key, round: i + 1, sha256: s.sha256, samples });
      }
    }
  } finally {
    for (const s of Object.values(sessions)) s.vm.quit();
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  }
}
console.log = console.warn = () => {};
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(2); });
