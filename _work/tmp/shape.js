const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const want=new Set(['tool/call','tool/code-dispatch','tool/result','tool/code-dispatch-start']);
const seen={};
for(const ln of lines){
  let ev; try{ ev=JSON.parse(ln);}catch(e){continue;}
  if(!want.has(ev.type)) continue;
  if(seen[ev.type]>=2) continue;
  seen[ev.type]=(seen[ev.type]||0)+1;
  const s=JSON.stringify(ev);
  console.log('=== '+ev.type+' ('+s.length+' bytes) ===');
  console.log(s.slice(0,1400));
  console.log();
}
