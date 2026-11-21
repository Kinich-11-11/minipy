
import fs from 'fs';
import { performance } from 'perf_hooks';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const log=(m)=>fs.appendFileSync('D:/编程/scratch/ai/minipython/_work/v5test/progress.log', m+'\n');
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5test/progress.log','');
const vm=new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime=vm.runtime, stage=runtime.getTargetForStage();
const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
const setG=(n,val)=>{const v=sv(n);if(v)v.value=val;};
vm.start(); vm.greenFlag();
for(let i=0;i<30;i++) runtime._step();
const cases=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
for(const c of cases){
  const t0=performance.now();
  const code=sl('Code'); code.value.length=0; for(const l of c.code.replace(/\r/g,'').split('\n')) code.value.push(l);
  setG('mode',0); setG('ticket',1); setG('stopreq',0); setG('running',1); setG('speed',1);
  const answers=(c.inputs||[]).slice();
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  let steps=0, slow=0;
  while(steps<4000){
    const ts=performance.now();
    if(answers.length && String(gv('status'))==='Waiting for input') runtime.emit('ANSWER',answers.shift());
    runtime._step(); steps++;
    const d=performance.now()-ts; if(d>200) slow++;
    if(Number(gv('running'))===0 && steps>5) break;
    if(performance.now()-t0>45000) break;
  }
  log(c.name+' | steps='+steps+' | wall='+Math.round(performance.now()-t0)+'ms | slowSteps='+slow+' | status='+gv('status')+' | out='+JSON.stringify(gl('Output').map(String))+' | err='+JSON.stringify(String(gv('error')||'')));
  setG('stopreq',1); setG('running',0);
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'HALT'});
  for(let i=0;i<10;i++) runtime._step();
  setG('busy',0); setG('stopreq',0); setG('error','');
}
log('ALL DONE');
process.exit(0);
