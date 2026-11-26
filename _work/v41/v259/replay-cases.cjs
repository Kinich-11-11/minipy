// Replay a suite in the stock Scratch RUN hat. Unlike v253/replay.cjs this understands
// transcripts that end with a CPython error: the expected Output is the stdout cells followed
// by one "Line N: <message>" paragraph, and the reported error must match exactly.
const fs = require('node:fs');
const VM = require(process.env.MINIPY_VM || '../../vm5300/node_modules/scratch-vm');
const [archive, suite, pattern = '.'] = process.argv.slice(2);

async function main() {
  const cases = JSON.parse(fs.readFileSync(suite, 'utf8')).filter(c => new RegExp(pattern).test(c.name));
  if (!cases.length) throw Error('No matching cases');
  const vm = new VM();
  try {
    await vm.loadProject(fs.readFileSync(archive));
    vm.start();
    vm.greenFlag();
    const r = vm.runtime;
    for (let i = 0; i < 30; i++) r._step();
    const targets = [r.getTargetForStage(), r.targets.find(t => t.getName() === 'Interpreter')];
    const vars = Object.fromEntries(targets.flatMap(t => Object.values(t.variables).map(v => [v.name, v])));
    let passed = 0;
    for (const c of cases) {
      vm.stopAll();
      vars.Code.value = c.code.replace(/\n$/, '').split('\n');
      for (const [k, v] of Object.entries({mode: 0, ticket: +vars.ticket.value + 1, stopreq: 0, running: 1, speed: 1, error: ''})) vars[k].value = v;
      vars.Output.value = [];
      r.startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: 'RUN'});
      const start = Date.now(), timeout = Number(process.env.MINIPY_MAX_MS || 60000);
      for (let i = 0; i < 30000 && Date.now() - start < timeout; i++) { r._step(); if (!+vars.running.value) break; }
      const output = vars.Output.value.map(String), error = String(vars.error.value || '');
      const expected = c.stdout.split('\n').flatMap(line => line.match(/.{1,26}/gu) || ['']);
      const completed = !+vars.running.value;
      let out = output, pass;
      if (c.error) {
        const at = output.findIndex(x => /^Line \d+: /.test(x));
        out = at < 0 ? output : output.slice(0, at);
        const text = at < 0 ? '' : output.slice(at).join('').replace(/^Line \d+: /, '');
        pass = completed && text === c.error && JSON.stringify(out) === JSON.stringify(expected);
      } else {
        pass = completed && !error && JSON.stringify(out) === JSON.stringify(expected);
      }
      if (pass) passed++;
      console.log(JSON.stringify({name: c.name, pass, output: out, error, completed, ms: Date.now() - start}));
    }
    console.log(`${passed}/${cases.length} passed`);
    return passed === cases.length ? 0 : 1;
  } finally {
    vm.quit();
  }
}
main().then(status => process.exit(status), error => { console.error(error); process.exit(2); });
