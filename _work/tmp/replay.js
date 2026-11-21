const fs=require('fs'), path=require('path');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
let w=0,e=0,efail=[];
const touched=new Set();
for(const o of ops){
  const a=o.args||{};
  const p=a.file_path;
  if(!p) continue;
  const norm=p.replace(/\\\\/g,'/');
  if(o.name==='write'){
    fs.mkdirSync(path.dirname(p),{recursive:true});
    fs.writeFileSync(p, a.content||'', 'utf8'); w++; touched.add(norm);
  } else if(o.name==='edit'){
    let s;
    try{ s=fs.readFileSync(p,'utf8'); }catch(err){ efail.push({seq:o.seq,p,why:'missing'}); continue; }
    const old=a.old_string, nw=a.new_string;
    if(!s.includes(old)){ efail.push({seq:o.seq,p,why:'old not found', old:old.slice(0,60)}); continue; }
    if(a.replace_all){ s=s.split(old).join(nw); }
    else { const i=s.indexOf(old); s=s.slice(0,i)+nw+s.slice(i+old.length); }
    fs.writeFileSync(p, s, 'utf8'); e++; touched.add(norm);
  }
}
console.log('replayed writes',w,'edits',e,'editFailures',efail.length);
for(const f of efail.slice(0,40)) console.log('  FAIL seq',f.seq,f.p,f.why, JSON.stringify((f.old||'').slice(0,70)));
console.log('--- v5 files touched:');
for(const t of [...touched].filter(x=>x.includes('/v5/')).sort()) {
  let sz=0; try{sz=fs.statSync(t.replace(/\//g,'\\')).size;}catch(e){}
  console.log('   '+t+'  '+sz);
}
