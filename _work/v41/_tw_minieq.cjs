// _tw_minieq.cjs : run _min_eq.sb3 under tw/vanilla, print out list
'use strict';
const fs = require('fs');
const MODE = process.argv[2] || 'tw';
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const TW = ROOT + '/scratch-vm-develop/scratch-vm-develop';
const VAN = 'C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm';
const vmPath = MODE === 'tw' ? TW + '/src/index.js' : VAN + '/src/index.js';
const VirtualMachine = require(vmPath);
(async () => {
  const vm = new VirtualMachine();
  await vm.loadProject(fs.readFileSync(ROOT + '/_work/v41/_min_eq.sb3'));
  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 20; i++) vm.runtime._step();
  const stage = vm.runtime.getTargetForStage();
  const out = Object.values(stage.variables).find((v) => v.name === 'out');
  console.log('MODE=' + MODE + ' out=' + JSON.stringify(out.value));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
