'use strict';
// Verify the Src267 -> editor-line map used by the current-line marker.
const fs = require('node:fs');
const VM = require('C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js');

const projectPath = process.argv[2];
const programPath = process.argv[3];
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
  const allVars = (t) => Object.values(t.variables);
  const stageList = (n) => allVars(stage).find((v) => v.name === n && v.type === 'list');
  const interpList = (n) => allVars(interp).find((v) => v.name === n && v.type === 'list');
  const stageVar = (n) => allVars(stage).find((v) => v.name === n && v.type !== 'list');

  const program = fs.readFileSync(programPath, 'utf8').replace(/\r/g, '');
  const code = stageList('Code');
  code.value.length = 0;
  for (const line of program.split('\n')) code.value.push(line);
  const before = Array.from(code.value);
  for (const [k, v] of Object.entries({ mode: 0, ticket: +stageVar('ticket').value + 1, stopreq: 0, running: 1, speed: 1, error: '' })) stageVar(k).value = v;
  stageList('Output').value = [];
  r.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });

  const src = interpList('Src267');
  const map = stageList('SrcMap267');
  const pcv = stageVar('pc');
  const samples = [];
  let lastPc = null;
  for (let i = 0; i < 30000; i++) {
    r._step();
    const pc = Number(pcv.value);
    if (pc !== lastPc && pc >= 1 && pc <= src.value.length) {
      lastPc = pc;
      samples.push({ pc, map: map.value[pc - 1], src: src.value[pc - 1] });
    }
    if (!+stageVar('running').value) break;
  }
  const after = Array.from(code.value);

  const bad = samples.filter((s) => {
    const m = Number(s.map);
    if (!m) return false; // helper line appended at runtime: intentionally not highlighted
    if (m < 1 || m > before.length) return true;
    const orig = before[m - 1];
    const srcLine = String(s.src);
    const o = String(orig);
    // Derived lines must be built from the original: joined = original + more,
    // expanded head = prefix of original, expanded body = suffix, split piece = substring.
    return !(o === srcLine || o.startsWith(srcLine) || srcLine.startsWith(o) || o.includes(srcLine.trim()) || srcLine.includes(o.trim()));
  });

  const joined = samples.filter((s) => Number(s.map) !== s.pc);
  origLog(JSON.stringify({
    codeSame: JSON.stringify(before) === JSON.stringify(after),
    status: String(stageVar('status').value),
    error: String(stageVar('error').value),
    output: stageList('Output').value.map(String),
    codeLines: before.length,
    srcLines: src.value.length,
    mapLines: map.value.length,
    markerSamples: samples.length,
    markerMismatches: bad.length,
    examples: joined.slice(-8).map((s) => ({ pc: s.pc, editorLine: s.map, src: s.src, code: before[Number(s.map) - 1] })),
    bad: bad.slice(0, 5)
  }, null, 2));
  process.exit(bad.length ? 1 : 0);
})();
