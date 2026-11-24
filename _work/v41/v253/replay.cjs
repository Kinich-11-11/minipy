// Replay a frozen stdout oracle in the actual Scratch RUN hat, without evaluating test
// programs in the host language. The score requires exact line boundaries (26-cell UI wrap).
const fs = require('node:fs');
const path = require('node:path');
const VM = require(process.env.MINIPY_VM || '../../vm5300/node_modules/scratch-vm');
const [archive, suite = path.join(__dirname, 'report-cases.json'), pattern = '.'] = process.argv.slice(2);

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
    const initial = r.targets.map(t => [t, t.currentCostume, Object.values(t.variables).map(v => [v, structuredClone(v.value)])]);
    let passed = 0;
    for (const c of cases) {
      vm.stopAll();
      for (const [target, costume, values] of initial) {
        target.currentCostume = costume;
        for (const [v, init] of values) v.value = Array.isArray(init) ? init.slice() : init;
      }
      vars.Code.value = c.code.split('\n');
      for (const [name, value] of Object.entries({mode: 0, ticket: +vars.ticket.value + 1, stopreq: 0, running: 1, speed: 1, error: ''})) vars[name].value = value;
      r.startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: 'RUN'});
      const start = Date.now(), timeout = Number(process.env.MINIPY_MAX_MS || 12000);
      for (let step = 1; step < 30000 && Date.now() - start < timeout; step++) {
        r._step();
        if (!+vars.running.value) break;
      }
      const output = vars.Output.value.map(String), error = String(vars.error.value || '');
      const expected = c.stdout.split('\n').flatMap(line => line.match(/.{1,26}/gu) || ['']);
      const completed = !+vars.running.value;
      const pass = completed && !error && JSON.stringify(output) === JSON.stringify(expected);
      if (pass) passed++;
      console.log(JSON.stringify({name: c.name, pass, output, error, completed, ms: Date.now() - start}));
    }
    console.log(`${passed}/${cases.length} passed`);
    return passed === cases.length ? 0 : 1;
  } finally {
    vm.quit();
  }
}
main().then(status => process.exit(status), error => { console.error(error); process.exit(2); });
