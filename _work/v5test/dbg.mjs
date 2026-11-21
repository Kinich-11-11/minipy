
import fs from 'fs';
import { performance } from 'perf_hooks';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const t0=performance.now();
const vm=new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
console.error('loaded in', Math.round(performance.now()-t0),'ms');
const runtime=vm.runtime, stage=runtime.getTargetForStage();
const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
vm.start(); vm.greenFlag();
for(let i=0;i<30;i++) runtime._step();
console.error('after flag status=',gv('status'),'running=',gv('running'),'busy=',gv('busy'));
const code=sl('Code'); code.value.length=0; code.value.push("print('hi')");
sv('mode').value=0; sv('ticket').value=1; sv('stopreq').value=0; sv('running').value=1; sv('speed').value=1;
const w0=performance.now();
runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
for(let i=0;i<40;i++){
  const t=performance.now(); runtime._step();
  console.error('step',i,'dt='+(performance.now()-t).toFixed(1)+'ms running='+gv('running')+' status='+gv('status')+' err='+JSON.stringify(gv('error'))+' out='+JSON.stringify(gl('Output')));
  if(Number(gv('running'))===0&&i>2) break;
}
console.error('total', (performance.now()-w0).toFixed(0),'ms');
process.exit(0);
