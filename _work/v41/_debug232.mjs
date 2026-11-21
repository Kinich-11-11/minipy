import fs from 'node:fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const rt = vm.runtime;
const target = rt.targets.find(t => t.getName() === 'Interpreter');
const variables = Object.values(rt.getTargetForStage().variables).concat(Object.values(target.variables));
const get = n => variables.find(v => v.name === n);
const original = rt._primitives.procedures_call;
rt._primitives.procedures_call = function(args, util) {
  const code = args.mutation?.proccode || '';
  if (/^fail |^callfn|^builtin2/.test(code)) {
    console.log('TRACE', code, JSON.stringify(args));
    if (code === 'fail %s') console.log('STACK', util.thread.stack.map(id => target.blocks.getBlock(id)?.mutation?.proccode || target.blocks.getBlock(id)?.opcode).join(' > '));
  }
  return original(args, util);
};
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) rt._step();
get('Code').value = ['e = Exception()', 'print(format(e, ""))'];
for (const [k,v] of Object.entries({mode:0,ticket:1,stopreq:0,running:1,speed:1,error:''})) get(k).value=v;
rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
for(let i=0;i<1000;i++){rt._step();if(Number(get('running').value)===0&&i>3)break;}
console.log('OUT',get('Output').value,'ERR',get('error').value);
process.exit(0);
