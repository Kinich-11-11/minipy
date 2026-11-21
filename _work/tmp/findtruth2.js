const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const found=new Map();
for(const o of ops){
  if(o.name!=='pwsh') continue;
  const cmd=(o.args||{}).command||'';
  const re=/(?:python\.exe'|python)\s+(_work[^\s;|]*\.py)\s+([^\s;|]+)\s+([^\s;|]+)/g;
  let m;
  while((m=re.exec(cmd))!==null){ const key=m[1]+' '+m[2]+' '+m[3]; if(!found.has(key)) found.set(key,o.seq); }
}
for(const [k,v] of [...found.entries()].sort()) console.log(k+'   (seq '+v+')');
console.log('total distinct generator invocations:', found.size);
