const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const seen=new Map();
for(const o of ops){
  if(o.name!=='pwsh') continue;
  const cmd=(o.args||{}).command||'';
  if(!/truth/i.test(cmd)) continue;
  if(!/python/i.test(cmd)) continue;
  console.log('--- seq '+o.seq+' ---');
  console.log(cmd.trim().slice(0,600));
}
