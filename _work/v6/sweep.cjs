const fs=require('fs');
const VM=require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
let total=0;
(async()=>{
 const sb3=process.argv[2];
 const vm=new VM(); await vm.loadProject(fs.readFileSync(sb3));
 const rt=vm.runtime, stage=rt.getTargetForStage();
 const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
 const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
 const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
 const set=(n,a)=>{const l=sl(n);l.value.length=0;for(const x of a)l.value.push(x);};
 for (const [op,fn] of Object.entries(rt._primitives)) { if(typeof fn!=='function') continue; rt._primitives[op]=function(...a){ total++; return fn.apply(this,a); }; }
 vm.start(); vm.greenFlag(); for(let i=0;i<10;i++) rt._step();
 const progs=JSON.parse(fs.readFileSync('_work/v6/prog.json','utf8'));
 const out=[];
 for (const p of progs) {
   total=0;
   set('Code',String(p.code).split('\n')); set('Output',[]);
   for(const n of ['mode','ticket','stopreq','running']) sv(n).value=0;
   sv('ticket').value=1; sv('running').value=1; sv('speed').value=1;
   const t0=Date.now();
   rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
   let st=0; for(;st<200000;st++){ rt._step(); if(st>4 && String(sv('running').value)==='0') break; }
   out.push({name:p.name, ms:Date.now()-t0, calls:total});
 }
 realLog(sb3.padEnd(28)+' '+out.map(o=>o.name+'='+o.ms+'ms/'+(o.calls/1000).toFixed(0)+'k').join('  '));
 process.exit(0);
})();