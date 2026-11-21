const fs=require('fs'), path=require('path'), cp=require('child_process');
const ROOT='D:/编程/scratch/ai/minipython';
const WATCH=['_work/v5/kernel/vm.js','_work/v5/kernel/compiler.js','_work/v5/kernel/parse.js'];
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const size=(p)=>{ try{ return fs.statSync(p).size; }catch(e){ return -1; } };
const before={}; for(const w of WATCH) before[w]=size(w);
const events=[];
function note(seq, what){ for(const w of WATCH){ const cur=size(w); if(cur!==before[w]){ events.push({seq, file:w.split('/').pop(), what, from:before[w], to:cur}); before[w]=cur; } } }
let w=0,e=0,patchRuns=0;
const efail=[];
const PATCH_RE=/(?:^|[;&|]\s*|\s)node(?:\.exe)?\s+([^;&|\s]*patch[0-9]*\.cjs)/g;
for(const o of ops){
  const a=o.args||{};
  if(o.name==='write'){
    if(!a.file_path) continue;
    fs.mkdirSync(path.dirname(a.file_path),{recursive:true});
    fs.writeFileSync(a.file_path, a.content||'', 'utf8'); w++; note(o.seq,'write '+path.basename(a.file_path));
  } else if(o.name==='edit'){
    const p=a.file_path; if(!p) continue;
    let s; try{ s=fs.readFileSync(p,'utf8'); }catch(err){ efail.push({seq:o.seq,p,why:'missing'}); continue; }
    const old=a.old_string, nw=a.new_string;
    if(!s.includes(old)){ efail.push({seq:o.seq,p,why:'old not found'}); continue; }
    if(a.replace_all) s=s.split(old).join(nw); else { const i=s.indexOf(old); s=s.slice(0,i)+nw+s.slice(i+old.length); }
    fs.writeFileSync(p, s, 'utf8'); e++; note(o.seq,'edit '+path.basename(p));
  } else if(o.name==='pwsh'){
    const cmd=a.command||''; let m;
    PATCH_RE.lastIndex=0;
    while((m=PATCH_RE.exec(cmd))!==null){
      const rel=m[1].replace(/\\/g,'/');
      if(!fs.existsSync(path.join(ROOT,rel))) continue;
      patchRuns++;
      try{ cp.execSync('node "'+rel+'"',{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:20000,maxBuffer:8*1024*1024}); }
      catch(err){}
      note(o.seq,'patch '+path.basename(rel));
    }
  }
}
fs.writeFileSync('_work/tmp/sizeevents.json', JSON.stringify({events,efail},null,1));
// report shrink events
console.log('size-changing events:', events.length);
for(const ev of events){ if(ev.to < ev.from - 200 || ev.to < 2000) console.log('  SHRINK seq',ev.seq,ev.file,ev.what,ev.from,'->',ev.to); }
console.log('edit failures', efail.length);
