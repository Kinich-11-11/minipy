// _tw_probe.cjs <sb3-name> : run failing case on given sb3 (tw/vanilla), dump Dbg list
'use strict';
const fs = require('fs');
const MODE = process.argv[2];
const SB3 = process.argv[3];
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const TW = ROOT + '/scratch-vm-develop/scratch-vm-develop';
const VAN = 'C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm';
const vmPath = MODE === 'tw' ? TW + '/src/index.js' : VAN + '/src/index.js';
const VirtualMachine = require(vmPath);
const CASE = process.argv[4] || 'def g(x):\n    return x[0]\nprint(g([7, 8]))';
(async () => {
  const vm = new VirtualMachine();
  await vm.loadProject(fs.readFileSync(SB3));
  const runtime = vm.runtime;
  const find = (n) => {
    for (const t of runtime.targets) {
      for (const v of Object.values(t.variables)) if (v.name === n) return v;
    }
  };
  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 30; i++) runtime._step();
  find('Code').value = CASE.split('\n');
  find('mode').value = 0;
  find('ticket').value = (Number(find('ticket').value) || 0) + 1;
  find('stopreq').value = 0;
  find('running').value = 1;
  find('speed').value = 1;
  find('error').value = '';
  find('Output').value.length = 0;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 3000; i++) {
    runtime._step();
    if (Number(find('running').value) === 0 && i > 5) break;
  }
  console.log('MODE=' + MODE + ' err=' + JSON.stringify(String(find('error').value || '')));
  console.log('out=' + JSON.stringify(find('Output').value.map(String)));
  console.log('Dbg=' + JSON.stringify((find('Dbg') ? find('Dbg').value : null)));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
