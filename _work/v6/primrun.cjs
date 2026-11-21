const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const sb3=process.argv[2], LOOP=Number(process.argv[3]||200000), REPS=Number(process.argv[4]||3);
 const vm=new VM();
 if (process.env.MINIPY_NOCOMPILE && typeof vm.setCompilerOptions==='function') vm.setCompilerOptions({enabled:false});
 await vm.loadProject(fs.readFileSync(sb3));
 const rt=vm.runtime;
 vm.start(); vm.greenFlag(); for(let i=0;i<10;i++) rt._step();
 const names=['set_const','set_var','var_read_x3','list_item_c','list_item_v','list_replace','list_len','list_add','list_del','eq_num','eq_str','gt_num','join_str','letter_of','len_str','if_block','if_else','nested_if','change_var','math_floor'];
 const rows=[];
 for (const n of names) {
   const times=[];
   for (let r=0;r<REPS;r++) {
     const th=rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'b_'+n});
     if (!th || !th.length) { realLog('NO THREAD for '+n); break; }
     const tid=th[0];
     const t0=Date.now();
     let guard=0;
     while (!tid.isKilled && tid.status!==4 && guard++<500000) rt._step();
     times.push(Date.now()-t0);
   }
   times.sort((a,b)=>a-b);
   rows.push([n, times[0]]);
 }
 const base=rows[0][1];
 realLog('# primitive cost, loop='+LOOP+', best of '+REPS+' (official scratch-vm)');
 realLog('case'.padEnd(14)+'ms'.padStart(7)+'   ns/call'.padStart(10)+'   vs set_const');
 for (const [n,ms] of rows) realLog(n.padEnd(14)+String(ms).padStart(7)+String(Math.round(ms*1e6/LOOP)).padStart(12)+(ms/base).toFixed(2).padStart(10));
 process.exit(0);
})();