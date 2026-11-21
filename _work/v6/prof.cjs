const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
(async()=>{
 const vm=new VM();
 if (process.env.MINIPY_NOCOMPILE && typeof vm.setCompilerOptions==='function') vm.setCompilerOptions({enabled:false});
 await vm.loadProject(fs.readFileSync(process.argv[2]));
 const rt=vm.runtime, stage=rt.getTargetForStage();
 const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
 const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
 const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
 const set=(n,a)=>{const l=sl(n);l.value.length=0;for(const x of a)l.value.push(x);};
 // count every primitive invocation
 const counts=Object.create(null);
 let total=0;
 for (const [op,fn] of Object.entries(rt._primitives)) {
   if (typeof fn!=='function') continue;
   rt._primitives[op]=function(...a){ counts[op]=(counts[op]||0)+1; total++; return fn.apply(this,a); };
 }
 vm.start(); vm.greenFlag(); for(let i=0;i<10;i++) rt._step();
 const progs=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 for (const p of progs) {
   for (const k in counts) delete counts[k]; total=0;
   set('Code',String(p.code).split('\n')); set('Output',[]);
   for(const n of ['mode','ticket','stopreq','running']) sv(n).value=0;
   sv('ticket').value=1; sv('running').value=1; sv('speed').value=1;
   const t0=Date.now();
   rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
   let steps=0;
   for(;steps<200000;steps++){ rt._step(); if(steps>4 && String(sv('running').value)==='0') break; }
   const ms=Date.now()-t0;
   const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,14);
   realLog('==== '+p.name+'   wall='+ms+'ms  frames='+steps+'  primitive calls='+total);
   realLog('   top: '+top.map(([o,c])=>o+'='+c+'('+(100*c/total).toFixed(1)+'%)').join('  '));
   const pen=['pen_clear','pen_stamp','looks_switchcostumeto','pen_penDown','pen_setPenColorToColor','motion_gotoxy'];
   realLog('   pen/render: '+pen.map(o=>o.replace(/^(pen_|looks_|motion_)/,'')+'='+(counts[o]||0)).join('  '));
 }
 process.exit(0);
})();