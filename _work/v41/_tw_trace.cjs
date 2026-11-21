// _tw_trace.cjs <tw|vanilla> : run the failing case under a VM, trace executed blocks
// usage: node _work/v41/_tw_trace.cjs tw   (local TurboWarp VM 2.1.46)
//        node _work/v41/_tw_trace.cjs van  (vanilla scratch-vm 5.0.300)
'use strict';
const path = require('path');
const fs = require('fs');

const MODE = process.argv[2] || 'tw';
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const TW = ROOT + '/scratch-vm-develop/scratch-vm-develop';
const VAN = 'C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm';

const CASE = 'def g(x):\n    return x[0]\nprint(g([7, 8]))';

let vmPath, execPath;
if (MODE === 'tw') {
  vmPath = TW + '/src/index.js';
  execPath = TW + '/src/engine/execute.js';
} else {
  vmPath = VAN + '/src/index.js';
  execPath = VAN + '/src/engine/execute.js';
}

// ---- wrap execute BEFORE the VM package loads (sequencer captures it at require time)
const origExecute = require(execPath);
let tracing = false;
const trace = [];
const MAXTRACE = 100000;
require.cache[require.resolve(execPath)].exports = function tracedExecute (sequencer, thread) {
  if (tracing && thread && thread.target && trace.length < MAXTRACE) {
    const tgt = thread.target.getName ? thread.target.getName() : '?';
    if (tgt === 'Interpreter') {
      const blocks = thread.target.blocks;
      const block = blocks.getBlock(thread.peekStack());
      if (block) {
        let label = block.opcode + ' @' + thread.peekStack();
        if (block.opcode === 'procedures_call' && block.mutation) {
          label += ' ' + String(block.mutation.proccode).slice(0, 48);
        } else if (block.opcode === 'procedures_definition' && block.inputs && block.inputs.custom_block) {
          const pr = blocks.getBlock(block.inputs.custom_block[1]);
          if (pr && pr.mutation) label += ' ' + String(pr.mutation.proccode).slice(0, 48);
        } else if (block.fields && block.fields.VARIABLE) {
          label += ' ' + block.fields.VARIABLE[0];
        } else if (block.fields && block.fields.LIST) {
          label += ' ' + block.fields.LIST[0];
        }
        if (thread.peekStack() === 'Lc+/innjMGH-,*Hk0[0(') {
          const findV = (n) => { for (const v of Object.values(thread.target.variables)) if (v.name === n) return v.value; };
          label += ' [ec=' + JSON.stringify(String(findV('ec') ?? '')) + ' ti=' + JSON.stringify(String(findV('ti') ?? '')) + ' src=' + JSON.stringify(String(findV('source') ?? '')).slice(0, 30) + ']';
        }
        trace.push(label);
      }
    }
  }
  return origExecute(sequencer, thread);
};

const VirtualMachine = require(vmPath);

(async () => {
  const vm = new VirtualMachine();
  await vm.loadProject(fs.readFileSync(ROOT + '/MiniPy_v4.219.sb3'));
  const runtime = vm.runtime;
  const find = (n) => {
    for (const t of runtime.targets) {
      for (const v of Object.values(t.variables)) if (v.name === n) return v;
    }
  };
  vm.start();
  vm.greenFlag();
  // 模拟 runner：手动步进若干步让 INIT 完成
  for (let i = 0; i < 30; i++) runtime._step();
  const code = find('Code');
  code.value = CASE.split('\n');
  find('mode').value = 0;
  find('ticket').value = (Number(find('ticket').value) || 0) + 1;
  find('stopreq').value = 0;
  find('running').value = 1;
  find('speed').value = 1;
  find('error').value = '';
  find('Output').value.length = 0;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  tracing = true;
  let steps = 0;
  for (let i = 0; i < 4000; i++) {
    runtime._step();
    steps++;
    if (Number(find('running').value) === 0 && i > 5) break;
  }
  tracing = false;
  console.log('MODE=' + MODE + ' steps=' + steps + ' err=' + JSON.stringify(String(find('error').value || '')));
  console.log('out=' + JSON.stringify(find('Output').value.map(String)));
  console.log('blocks traced=' + trace.length);
  // 只打印最后 120 条（错误发生在链尾）
  fs.writeFileSync(ROOT + '/_work/v41/_tw_trace_' + MODE + '.log', trace.join('\n') + '\n');
  console.log('--- last 120 blocks ---');
  for (const l of trace.slice(-120)) console.log(l);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
