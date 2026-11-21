const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
(async()=>{
 const vm=new VM();
 if (process.env.MINIPY_NOCOMPILE && typeof vm.setCompilerOptions==='function') vm.setCompilerOptions({enabled:false});
 await vm.loadProject(fs.readFileSync('_work/v6/prim.sb3'));
 const rt=vm.runtime; vm.start(); vm.greenFlag(); for(let i=0;i<10;i++) rt._step();
 for (const n of ['list_del','list_add','set_var']) {
   const th=rt.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'b_'+n});
   const tid=th[0]; const t0=Date.now(); let st=0;
   while (!tid.isKilled && tid.status!==4 && st<2000000) { rt._step(); st++; }
   realLog(n+': steps='+st+' ms='+(Date.now()-t0)+' finished='+(!tid.isKilled && tid.status===4)+' status='+tid.status);
   const L=rt.targets.find(t=>t.getName()==='Bench').lookupOrCreateList('l1','M');
   realLog('   M length now '+L.value.length);
 }
 process.exit(0);
})();