import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url); const VM=require(process.env.MINIPY_VM||'scratch-vm');
const project=process.argv[2]; const code=fs.readFileSync(process.argv[3],'utf8');
const vm=new VM(); await vm.loadProject(fs.readFileSync(project)); const r=vm.runtime, stage=r.getTargetForStage(), interp=r.targets.find(t=>t.getName()==='Interpreter');
const vals=m=>m&&typeof m.values==='function'?[...m.values()]:Object.values(m||{}); const all=[stage,interp];
const v=n=>all.flatMap(t=>vals(t.variables)).find(x=>x.name===n); const l=n=>all.flatMap(t=>vals(t.variables)).find(x=>x.name===n&&x.type==='list'); const gv=n=>v(n)?.value; const gl=n=>l(n)?.value;
vm.start();vm.greenFlag();for(let i=0;i<30;i++)r._step(); l('Code').value=code.replace(/\r/g,'').trimEnd().split('\n'); for(const [n,x] of Object.entries({mode:0,ticket:1,stopreq:0,running:1,speed:1,error:''}))v(n).value=x; r.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'}); let steps=0; const t=Date.now(); while(steps++<20000&&Date.now()-t<20000){r._step();if(Number(gv('running'))===0&&steps>3)break;}
console.log('steps',steps,'running',gv('running'),'err',gv('error'));console.log('Output',JSON.stringify(gl('Output')));
for(const n of ['ev','evtype','count','head','pc','cdepth','gcur','gmy','gyld','GYval','GYtype','error','found','Types','Names','Values','GHyfOn','GHyfL','GHyfG','GHdead','FnKind','FnLine','FnStart','Ends']){const x=v(n)||l(n); if(x) console.log(n,JSON.stringify(x.value));}
