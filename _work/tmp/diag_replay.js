const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
function mentions(o, name){
  const a=o.args||{};
  const parts=[a.file_path,a.command,a.path,a.content,a.old_string,a.new_string].filter(x=>typeof x==='string');
  return parts.some(x=>x.includes(name));
}
for(const target of ['regalloc.js','compiler.js']){
  console.log('\n########## '+target+' ##########');
  for(const o of ops){
    if(o.name==='pwsh' && mentions(o,target)) console.log('  seq '+o.seq+' pwsh: '+((o.args.command||'').slice(0,180).replace(/\n/g,' ')));
    else if((o.name==='write'||o.name==='edit') && ((o.args.file_path||'').endsWith(target))) console.log('  seq '+o.seq+' '+o.name+' len='+((o.args.content||o.args.old_string||'').length));
  }
}
const e=ops.find(o=>o.seq===1442141);
console.log('\n=== full old_string of seq 1442141 ===');
console.log(JSON.stringify(e.args.old_string));
console.log('=== new_string ===');
console.log(JSON.stringify(e.args.new_string).slice(0,400));
