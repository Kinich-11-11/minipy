'use strict';
// Alternate AB/BA. Each sample loads its own VM; correctness is a precondition,
// and a warm-up in that VM is recorded separately (not mixed into medians).
const fs = require('node:fs'),
  os = require('node:os');
const { session, cases, oracle } = require('./run.cjs');
async function main() {
  const [a, b, output, n = '5'] = process.argv.slice(2);
  if (!Number.isInteger(+n) || +n < 3) throw Error('at least three rounds');
  const suite = cases('bench').map((c) => ({ ...c, expected: oracle(c) }));
  const report = {
    node: process.version,
    zlib: process.versions.zlib,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0].model,
    method: 'alternating independent VMs, 30 startup steps, one untimed warm-up before workloads',
    samples: [],
  };
  for (let i = 0; i < +n; i++)
    for (const key of i % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
      const s = await session(key === 'baseline' ? a : b);
      try {
        const warm = s.run(suite[0], suite[0].expected);
        if (!warm.pass) throw Error('warm-up did not complete');
        const ms = {};
        for (const c of suite) {
          const x = s.run(c, c.expected);
          if (!x.pass) throw Error(key + ': ' + c.name);
          ms[c.name] = x.ms;
        }
        report.samples.push({
          key,
          sha256: s.sha256,
          round: i + 1,
          bootMs: s.bootMs,
          warmupMs: warm.ms,
          ms,
        });
      } finally {
        s.vm.quit();
      }
      fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
    }
}
console.log = console.warn = () => {};
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(2);
  });
