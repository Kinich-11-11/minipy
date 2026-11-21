'use strict';
const fs = require('fs');
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const VirtualMachine = require(ROOT + '/scratch-vm-develop/scratch-vm-develop/src/index.js');
const CASE = "# Input and conversion\nname = input('Your name?')\nprint('Hello, ' + name)";
(async () => {
  const vm = new VirtualMachine();
  const events = [];
  const origEmit = vm.runtime.emit.bind(vm.runtime);
  vm.runtime.emit = function (ev, ...a) {
    if (['QUESTION', 'SAY', 'ANSWER'].includes(ev)) events.push([ev, JSON.stringify(a[0]).slice(0, 40)]);
    return origEmit(ev, ...a);
  };
  await vm.loadProject(fs.readFileSync(ROOT + '/MiniPy_v4.222.sb3'));
  const runtime = vm.runtime;
  const find = (n) => { for (const t of runtime.targets) for (const v of Object.values(t.variables)) if (v.name === n) return v; };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 30; i++) runtime._step();
  // watcher 线程存在吗？
  const hats = [];
  for (const t of runtime.targets) {
    for (const [bid, b] of Object.entries(t.blocks._blocks || t.blocks)) {
      if (b && b.opcode === 'event_whenflagclicked') hats.push(t.getName() + ':' + bid.slice(0, 8));
    }
  }
  console.log('greenflag hats:', JSON.stringify(hats));
  find('Code').value = CASE.split('\n');
  find('mode').value = 0; find('ticket').value = 1; find('stopreq').value = 0;
  find('running').value = 1; find('speed').value = 1; find('error').value = '';
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 120; i++) runtime._step();
  console.log('status=' + String(find('status').value), 'askPending=' + String(find('askPending').value), 'askText=' + JSON.stringify(String(find('askText').value)), 'stdin=' + JSON.stringify(String(find('stdin').value)));
  console.log('events=' + JSON.stringify(events.slice(0, 8)));
  console.log('threads=' + JSON.stringify(runtime.threads.map((th) => ({ status: th.status, target: th.target.getName(), top: String(th.target.blocks.getBlock(th.topBlock).opcode).slice(0, 30) }))));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
