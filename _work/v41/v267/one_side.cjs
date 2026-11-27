'use strict';
// Run every case from cases.json on one build and dump the results.
// usage: node one_side.cjs <sb3> <out.json> [repeat]
const fs = require('node:fs');
const path = require('node:path');
const VM = require('C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js');

const [projectPath, outPath, repeatArg] = process.argv.slice(2);
const repeat = Number(repeatArg || 1);
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));

console.warn = () => {};
const origLog = console.log;
console.log = () => {};

(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(projectPath));
  vm.start(); vm.greenFlag();
  const r = vm.runtime;
  for (let i = 0; i < 30; i++) r._step();
  const stage = r.getTargetForStage();
  const interp = r.targets.find((t) => t.getName() === 'Interpreter');
  const varsOf = (t) => Object.values(t.variables);
  const stageList = (n) => varsOf(stage).find((v) => v.name === n && v.type === 'list');
  const stageVar = (n) => varsOf(stage).find((v) => v.name === n && v.type !== 'list');
  const interpList = (n) => varsOf(interp).find((v) => v.name === n && v.type === 'list');

  async function runOnce(program) {
    vm.stopAll();
    const code = stageList('Code');
    code.value.length = 0;
    for (const line of program.replace(/\r/g, '').split('\n')) code.value.push(line);
    const before = Array.from(code.value);
    for (const [k, v] of Object.entries({ mode: 0, ticket: +stageVar('ticket').value + 1, stopreq: 0, running: 1, speed: 1, error: '' })) stageVar(k).value = v;
    stageList('Output').value = [];
    r.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    const t0 = Date.now();
    for (let i = 0; i < 30000 && Date.now() - t0 < 90000; i++) {
      r._step();
      if (!+stageVar('running').value) break;
    }
    const after = Array.from(code.value);
    return {
      out: stageList('Output').value.map(String),
      error: String(stageVar('error').value || ''),
      status: String(stageVar('status').value || ''),
      changed: JSON.stringify(before) !== JSON.stringify(after),
      before, after, ms: Date.now() - t0,
      src: interpList('Src267') ? interpList('Src267').value.map(String) : null,
      map: stageList('SrcMap267') ? stageList('SrcMap267').value.map(String) : null
    };
  }

  const results = [];
  for (const c of cases) {
    const runs = [];
    for (let k = 0; k < repeat; k++) runs.push(await runOnce(c.code));
    results.push({ name: c.name, runs });
    origLog(c.name + ' ' + runs.map((x) => x.ms + 'ms/' + x.status + (x.changed ? '/CHANGED' : '')).join(' | '));
  }
  fs.writeFileSync(outPath, JSON.stringify(results, null, 1));
  origLog('written ' + outPath);
  vm.quit();
})().catch((e) => { console.error(e); process.exit(2); });
