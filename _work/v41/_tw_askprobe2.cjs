'use strict';
const fs = require('fs');
const MODE = process.argv[2] || 'tw';
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const TW = ROOT + '/scratch-vm-develop/scratch-vm-develop';
const VAN = 'C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm';
const vmPath = MODE === 'tw' ? TW + '/src/index.js' : VAN + '/src/index.js';
const VirtualMachine = require(vmPath);
const CASE = "# Input and conversion\nname = input('Your name?')\nprint('Hello, ' + name)";
(async () => {
  const vm = new VirtualMachine();
  const events = [];
  const origEmit = vm.runtime.emit.bind(vm.runtime);
  vm.runtime.emit = function (ev, ...a) {
    if (ev === 'QUESTION' || ev === 'SAY' || ev === 'ANSWER') events.push([ev, JSON.stringify(a[0]).slice(0, 40)]);
    return origEmit(ev, ...a);
  };
  await vm.loadProject(fs.readFileSync(ROOT + '/MiniPy_v4.221.sb3'));
  const runtime = vm.runtime;
  const find = (n) => { for (const t of runtime.targets) for (const v of Object.values(t.variables)) if (v.name === n) return v; };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 30; i++) runtime._step();
  find('Code').value = CASE.split('\n');
  find('mode').value = 0; find('ticket').value = 1; find('stopreq').value = 0;
  find('running').value = 1; find('speed').value = 1; find('error').value = '';
  events.length = 0;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 120; i++) runtime._step();
  console.log('MODE=' + MODE + ' (RUN) status=' + String(find('status').value) + ' events=' + JSON.stringify(events.slice(0, 6)));
  // 清理并重跑为逐步 STEP 模式（模拟 STEP：只跑一步看 ask 是否入队）
  events.length = 0;
  find('stopreq').value = 1; find('running').value = 0;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 10; i++) runtime._step();
  find('busy').value = 0; find('stopreq').value = 0; find('error').value = '';
  find('Output').value.length = 0;
  find('Code').value = CASE.split('\n');
  find('mode').value = 0; find('ticket').value = (Number(find('ticket').value) || 0) + 1;
  find('stopreq').value = 0; find('running').value = 1; find('speed').value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 4; i++) runtime._step();   // 只跑 4 步（近似 STEP 的粒度）
  console.log('MODE=' + MODE + ' (4 steps) status=' + String(find('status').value) + ' events=' + JSON.stringify(events.slice(0, 6)));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
