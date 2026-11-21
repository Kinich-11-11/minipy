'use strict';
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(process.argv[2]));
  const runtime = vm.runtime;
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  for (const t of runtime.targets) {
    const names = vals(t.variables).filter(v => v.type !== 'list').map(v => v.name);
    realLog('target ' + t.getName() + ' isStage=' + t.isStage + ' vars=' + names.join(','));
  }
})();