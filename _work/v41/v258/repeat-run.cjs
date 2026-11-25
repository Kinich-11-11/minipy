// Verify that each independent RUN initializes a fresh Python __main__ namespace.
const fs=require('node:fs'),assert=require('node:assert/strict');
const VM=require('../../vm5300/node_modules/scratch-vm');
(async()=>{
  const vm=new VM();
  try{
    await vm.loadProject(fs.readFileSync(process.argv[2]));vm.start();vm.greenFlag();
    const r=vm.runtime;for(let i=0;i<30;i++)r._step();
    const targets=[r.getTargetForStage(),r.targets.find(t=>t.getName()==='Interpreter')];
    const vars=Object.fromEntries(targets.flatMap(t=>Object.values(t.variables).map(v=>[v.name,v])));
    async function run(code){
      vm.stopAll();vars.Code.value=code.split('\n');
      for(const [k,v] of Object.entries({mode:0,ticket:+vars.ticket.value+1,stopreq:0,running:1,speed:1,error:''}))vars[k].value=v;
      r.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
      const start=Date.now();for(let i=0;i<30000&&Date.now()-start<15000;i++){r._step();if(!+vars.running.value)break;}
      assert.equal(+vars.running.value,0,'RUN did not complete');assert.equal(String(vars.error.value||''),'');
      return vars.Output.value.map(String);
    }
    const first=await run('print(__name__)\n__name__ = "changed"\nprint(__name__)');
    const second=await run('print(__name__)\nif __name__ == "__main__":\n    print("guard")');
    assert.deepEqual(first,['__main__','changed']);assert.deepEqual(second,['__main__','guard']);
    console.log(JSON.stringify({sameVmRuns:2,first,second,pass:true}));
  }finally{vm.quit();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});