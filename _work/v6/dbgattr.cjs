const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
process.on('uncaughtException', e=>{ realLog('ERR '+e.stack.slice(0,600)); process.exit(1); });
(async()=>{
 const vm=new VM();
 await vm.loadProject(fs.readFileSync(process.argv[2]));
 const rt=vm.runtime;
 const t0=rt.targets[0];
 realLog('target keys: '+Object.keys(t0).join(','));
 realLog('blocks ctor: '+(t0.blocks && t0.blocks.constructor && t0.blocks.constructor.name));
 realLog('has _blocks: '+(t0.blocks && typeof t0.blocks._blocks));
 const any=Object.keys(t0.blocks._blocks||{})[0];
 realLog('sample block: '+JSON.stringify(t0.blocks._blocks[any]).slice(0,200));
 realLog('primitives count: '+Object.keys(rt._primitives).length);
 process.exit(0);
})();