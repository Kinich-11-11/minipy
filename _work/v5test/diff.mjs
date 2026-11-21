
import fs from 'fs';
import { execFileSync } from 'child_process';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const outPath = process.argv[4];
const cases = JSON.parse(fs.readFileSync(casesPath,'utf8'));

function cpython(code, inputs){
  const f = 'D:/编程/scratch/ai/minipython/_work/v5test/_tmp.py';
  fs.writeFileSync(f, code + '\n');
  try {
    const out = execFileSync(process.env.PYEXE || 'py', [f], { input: (inputs||[]).join('\n') + (inputs&&inputs.length?'\n':''), encoding:'utf8', timeout: 20000, stdio:['pipe','pipe','pipe'] });
    return { ok:true, out: out.replace(/\r/g,'').split('\n').filter((_,i,a)=>!(i===a.length-1&&a[i]==='')) };
  } catch(e){
    return { ok:false, out: ((e.stdout||'')+'').replace(/\r/g,'').split('\n').filter(x=>x!==''), err: String(e.stderr||e.message).split('\n').pop() };
  }
}

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
const setG=(n,val)=>{const v=sv(n);if(v)v.value=val;};
vm.start(); vm.greenFlag();
for(let i=0;i<30;i++) runtime._step();

const rows=[];
for(const c of cases){
  const code=sl('Code'); code.value.length=0; for(const l of c.code.replace(/\r/g,'').split('\n')) code.value.push(l);
  setG('mode',0); setG('ticket',1); setG('stopreq',0); setG('running',1); setG('speed',1);
  const answers=(c.inputs||[]).slice();
  const t0=Date.now();
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  let steps=0;
  while(steps<4000){
    if(answers.length && String(gv('status'))==='Waiting for input') runtime.emit('ANSWER',answers.shift());
    runtime._step(); steps++;
    if(Number(gv('running'))===0 && steps>3) break;
    if(Date.now()-t0>20000) break;
  }
  const mp={ out: gl('Output').map(String), err: String(gv('error')||''), status: String(gv('status')), ms: Date.now()-t0, steps };
  setG('stopreq',1); setG('running',0);
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'HALT'});
  for(let i=0;i<8;i++) runtime._step();
  setG('busy',0); setG('stopreq',0); setG('error','');
  const py=cpython(c.code, c.inputs);
  const same = JSON.stringify(mp.out)===JSON.stringify(py.out);
  rows.push({ name:c.name, code:c.code, same, mini:mp, py });
}
const fail = rows.filter(r=>!r.same);
console.log('cases='+rows.length+'  match='+(rows.length-fail.length)+'  differ='+fail.length);
for(const r of fail){
  console.log('--- '+r.name);
  console.log('  code: '+JSON.stringify(r.code));
  console.log('  mini: '+JSON.stringify(r.mini.out)+(r.mini.err?(' err='+JSON.stringify(r.mini.err)):'')+' status='+r.mini.status);
  console.log('  cpy : '+JSON.stringify(r.py.out)+(r.py.err?(' err='+r.py.err):''));
}
fs.writeFileSync(outPath, JSON.stringify(rows,null,1));
process.exit(0);
