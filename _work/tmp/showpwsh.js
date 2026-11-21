const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const want=process.argv.slice(2).map(Number);
for(const o of ops){
  if(!want.includes(o.seq)) continue;
  console.log('\n########## seq '+o.seq+' ##########');
  console.log((o.args||{}).command);
}
