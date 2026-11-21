// _tw_askprobe.cjs <tw|van> : run demo20 with RUN, watch ask queue & status
'use strict';
const fs = require('fs');
const MODE = process.argv[2] || 'tw';
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const TW = ROOT + '/scratch-vm-develop/scratch-vm-develop';
const VAN = 'C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm';
const vmPath = MODE === 'tw' ? TW + '/src/index.js' : VAN + '/src/index.js';
const VirtualMachine = require(vmPath);
const CASE = "# Input and conversion\nname = input('Your name?')\nprint('Hello, ' + name)\nn = int(input('A number?'))\nprint(n * n, n + 1)";
(async () => {
  const vm = new VirtualMachine();
  await vm.loadProject(fs.readFileSync(ROOT + '/MiniPy_v4.221.sb3'));
  const runtime = vm.runtime;
  const find = (n) => { for (const t of runtime.targets) for (const v of Object.values(t.variables)) if (v.name === n) return v; };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 30; i++) runtime._step();
  find('Code').value = CASE.split('\n');
  find('mode').value = 0; find('ticket').value = 1; find('stopreq').value = 0;
  find('running').value = 1; find('speed').value = 1; find('error').value = '';
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  const dev = runtime.ioDevices;
  const askState = () => {
    const q = (dev.ask && dev.ask.question !== undefined) ? dev.ask : (dev.userData && dev.userData._askQueue) ? dev.userData : null;
    if (!q) return 'no-ask-dev';
    if (q.question !== undefined) return JSON.stringify(String(q.question)) + ' answered=' + String(q.answered);
    if (q._askQueue) return 'queue=' + JSON.stringify(q._askQueue.map((a) => ({ q: String(a.question).slice(0, 20), answered: a.answered })));
    return 'unknown';
  };
  const trace = [];
  for (let i = 0; i < 400; i++) {
    runtime._step();
    if (i % 40 === 0 || i < 12) {
      trace.push({ i, status: String(find('status').value), ask: askState(), threads: runtime.threads.length });
    }
    if (Number(find('running').value) === 0 && i > 30) break;
  }
  console.log('MODE=' + MODE);
  for (const t of trace) console.log(JSON.stringify(t));
  console.log('threads at end:', runtime.threads.map((th) => ({ status: th.status, warp: th.warpMode, top: th.topBlock && runtime.targets[0] })));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
