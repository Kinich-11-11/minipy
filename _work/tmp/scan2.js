const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const ops=[];
for(const ln of lines){
  let ev; try{ ev=JSON.parse(ln);}catch(e){continue;}
  if(ev.type!=='tool/code-dispatch-start') continue;
  const d=ev.data||{};
  if(d.name!=='write' && d.name!=='edit') continue;
  const a=d.arguments||{};
  ops.push({seq:ev.seq, time:ev.time, name:d.name, path:a.file_path, size:(a.content||a.new_string||'').length});
}
console.log('total write/edit ops', ops.length);
const m=new Map();
for(const o of ops){ const k=o.name+' '+o.path; if(!m.has(k)) m.set(k,[]); m.get(k).push(o); }
const keys=[...m.keys()].sort();
console.log('distinct paths', keys.length);
for(const k of keys){
  const v=m.get(k); const tot=v.reduce((s,x)=>s+x.size,0);
  console.log(`  ${k}  ops=${v.length} bytes=${tot} lastSeq=${v[v.length-1].seq}`);
}
