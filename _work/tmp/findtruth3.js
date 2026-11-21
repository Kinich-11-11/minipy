const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const found=new Map();
for(const o of ops){
  if(o.name!=='pwsh') continue;
  const cmd=(o.args||{}).command||'';
  const re=/([A-Za-z0-9_\\\/.]*\.py)\s+([^\s;|&]+)\s+([^\s;|&]+)/g;
  let m;
  while((m=re.exec(cmd))!==null){
    const gen=m[1].split(/[\\\/]/).pop(), a=m[2], b=m[3];
    if(!/json/.test(a)||!/json/.test(b)) continue;
    const key=gen+'  '+a.replace(/_work.v5./,'')+' -> '+b.replace(/_work.v5./,'');
    if(!found.has(key)) found.set(key,o.seq);
  }
}
for(const [k,v] of [...found.entries()].sort()) console.log(k+'   (seq '+v+')');
console.log('total:', found.size);
