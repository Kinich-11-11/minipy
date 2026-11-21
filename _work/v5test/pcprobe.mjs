
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm=new VM();
await vm.loadProject(fs.readFileSync('D:/编程/scratch/ai/minipython/MiniPy_v5.sb3'));
const runtime=vm.runtime;
const stage=runtime.getTargetForStage();
const interp=runtime.targets.find(t=>t.getName()==='Interpreter');
const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
const el=(t,n)=>{const v=vals(t.variables).find(x=>x.name===n); return v?v.value:undefined;};
const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
vm.start(); vm.greenFlag();
for(let i=0;i<30;i++) runtime._step();
const code=sl('Code'); code.value.length=0;
for(const l of ['a = 1','b = 2','c = a + b','print(c)','print(a)']) code.value.push(l);
sv('mode').value=0; sv('ticket').value=1; sv('stopreq').value=0; sv('running').value=1; sv('speed').value=1;
runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
const samples=[];
for(let i=0;i<40;i++){
  runtime._step();
  samples.push({step:i, pc:String(gv('pc')), running:String(gv('running')), status:String(gv('status'))});
  if(Number(gv('running'))===0 && i>3) break;
}
console.log('Iline =', JSON.stringify(el(interp,'Iline')));
console.log('Iop   =', JSON.stringify(el(interp,'Iop')));
console.log('Ia    =', JSON.stringify(el(interp,'Ia')));
console.log('Kval  =', JSON.stringify(el(interp,'Kval')));
console.log('out   =', JSON.stringify(gl('Output')));
console.log('pc samples:', JSON.stringify(samples.slice(-6)));
process.exit(0);
