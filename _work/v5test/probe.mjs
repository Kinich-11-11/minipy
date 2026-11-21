
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath=process.argv[2], casesPath=process.argv[3], outPath=process.argv[4];
const cases=JSON.parse(fs.readFileSync(casesPath,'utf8'));
const vm=new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime=vm.runtime, stage=runtime.getTargetForStage();
const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
const setG=(n,val)=>{const v=sv(n);if(v)v.value=val;};
vm.start(); vm.greenFlag();
for(let i=0;i<30;i++) runtime._step();
const res=[];
for(const c of cases){
  const code=sl('Code'); code.value.length=0; for(const l of c.code.replace(/\r/g,'').split('\n')) code.value.push(l);
  setG('mode',0); setG('ticket',1); setG('stopreq',0); setG('running',1); setG('speed',1);
  const out=sl('Output'); if(out) out.value.length=0;
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  let steps=0;
  while(steps<3000){ runtime._step(); steps++; if(Number(gv('running'))===0&&steps>3) break; }
  res.push({name:c.name, code:c.code, out:gl('Output').map(String), err:String(gv('error')||''), status:String(gv('status'))});
  setG('stopreq',1); setG('running',0);
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'HALT'});
  for(let i=0;i<8;i++) runtime._step();
  setG('busy',0); setG('stopreq',0); setG('error','');
}
console.log(JSON.stringify(res));
process.exit(0);
