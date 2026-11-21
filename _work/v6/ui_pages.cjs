const fs=require('fs');
const VM=require(process.env.MINIPY_VM||'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const realLog=console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k]=()=>{};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const vm=new VM();
 if (process.env.MINIPY_NOCOMPILE && typeof vm.setCompilerOptions === 'function') vm.setCompilerOptions({enabled:false});
 if (process.env.MINIPY_COMPILE && typeof vm.setCompilerOptions === 'function') vm.setCompilerOptions({enabled:true});
 await vm.loadProject(fs.readFileSync(process.argv[2]));
 const runtime=vm.runtime, stage=runtime.getTargetForStage();
 const vals=(m)=>(m&&typeof m.values==='function')?[...m.values()]:Object.values(m||{});
 const sv=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type!=='list');
 const sl=(n)=>vals(stage.variables).find(v=>v.name===n&&v.type==='list');
 const gv=(n)=>{const v=sv(n);return v?v.value:undefined;};
 const gl=(n)=>{const l=sl(n);return l?(Array.isArray(l.value)?l.value.slice():[...l.value]):[];};
 const step=(n)=>{for(let i=0;i<n;i++) runtime._step();};
 const mouseTo=(x,y,down)=>vm.postIOData('mouse',{x:x+240,y:180-y,canvasWidth:480,canvasHeight:360,isDown:!!down});
 async function click(x,y){ mouseTo(x,y,false); await sleep(35); step(3); mouseTo(x,y,true); await sleep(35); step(5); mouseTo(x,y,false); await sleep(35); step(6); }
 let questionPending=false;
 runtime.on('QUESTION', (q)=>{ realLog('    [ask] '+JSON.stringify(q)); questionPending=true;
   // an empty question is the shell's own stray ask at startup: answer it but keep the queue
   runtime.emit('ANSWER', (q ? (answers.shift()||'') : '')); });
 const answers=['Scratch','7','5'];
 vm.start(); vm.greenFlag(); step(25);
 const pages=Number(process.argv[3]||8);
 const results=[];
 for (let p=0;p<pages;p++){
   if (p>0){ await click(-113,-134); step(4); }   // DEMO button cycles
   const code=gl('Code');
   await click(80,150);                            // RUN
   for(let i=0;i<6000;i++){ runtime._step(); if(questionPending){questionPending=false; await new Promise(r=>setImmediate(r));} if(i>4 && String(gv('running'))==='0') break; }
   results.push({page:p, first:code[0], lines:code.length, out:gl('Output'), status:String(gv('status')), err:String(gv('error'))});
 }
 for (const r of results) realLog('page '+r.page+'  "'+r.first+'"  lines='+r.lines+'\n    out='+JSON.stringify(r.out)+'\n    status='+r.status+' err='+r.err);
 process.exit(0);
})();