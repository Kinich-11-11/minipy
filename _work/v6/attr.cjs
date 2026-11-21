const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
process.on('uncaughtException', e=>{ realLog('ERR '+String(e.stack).slice(0,500)); process.exit(1); });
(async()=>{
 const vm=new VM();
 await vm.loadProject(fs.readFileSync(process.argv[2]));
 const rt=vm.runtime, stage=rt.getTargetForStage();
 const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
 const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
 const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
 const set=(n,a)=>{const l=sl(n);l.value.length=0;for(const x of a)l.value.push(x);};
 const blockMap=new Map();
 for (const t of rt.targets) for (const [id,b] of Object.entries(t.blocks._blocks||{})) blockMap.set(id,{t:t.getName(),b});
 const byBlock=new Map();
 const wrap=(op,fn)=>{ rt._primitives[op]=function(args,util){ const id=util.thread.peekStack(); const k=id+'|'+op; byBlock.set(k,(byBlock.get(k)||0)+1); return fn.call(this,args,util); }; };
 wrap('operator_equals', rt._primitives.operator_equals);
 wrap('data_variable', rt._primitives.data_variable);
 vm.start(); vm.greenFlag(); for(let i=0;i<10;i++) rt._step();
 const p=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))[0];
 set('Code',String(p.code).split('\n')); set('Output',[]);
 for(const n of ['mode','ticket','stopreq','running']) sv(n).value=0;
 sv('ticket').value=1; sv('running').value=1; sv('speed').value=1;
 rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
 for(let i=0;i<200000;i++){ rt._step(); if(i>4 && String(sv('running').value)==='0') break; }
 const lit=(id)=>{ const e=blockMap.get(id); if(!e) return '?';
   for (const v of Object.values(e.b.inputs||{})) { if(Array.isArray(v) && Array.isArray(v[1]) && typeof v[1][1]==='string') return JSON.stringify(v[1][1]); }
   return '(block)'; };
 const top=[...byBlock.entries()].sort((a,b)=>b[1]-a[1]).slice(0,22);
 realLog('program: '+p.name);
 for (const [k,c] of top) { const [bid,op]=k.split('|'); const e=blockMap.get(bid);
   realLog('  '+String(c).padStart(8)+'  '+op.padEnd(16)+' in '+e.t.padEnd(12)+'  literal='+lit(bid)+(e.b.fields.VARIABLE?' var='+e.b.fields.VARIABLE[0]:'')+(e.b.fields.LIST?' list='+e.b.fields.LIST[0]:'')); }
 process.exit(0);
})();