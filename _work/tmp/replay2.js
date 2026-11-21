const fs=require('fs'), path=require('path'), cp=require('child_process');
const ROOT='D:/编程/scratch/ai/minipython';
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
let w=0,e=0,patchRuns=0;
const efail=[], pfail=[];
const PATCH_RE=/(?:^|[;&|]\s*|\s)node(?:\.exe)?\s+([^;&|\s]*patch[0-9]*\.cjs)/g;
const LOG=fs.createWriteStream('_work/tmp/replay.log',{flags:'w'});
let done=0;
for(const o of ops){
  if(++done % 100 === 0) process.stdout.write('op '+done+'/'+ops.length+' seq '+o.seq+' writes='+w+' edits='+e+' patches='+patchRuns+'\n');
  const a=o.args||{};
  if(o.name==='write'){
    if(!a.file_path) continue;
    fs.mkdirSync(path.dirname(a.file_path),{recursive:true});
    fs.writeFileSync(a.file_path, a.content||'', 'utf8'); w++;
  } else if(o.name==='edit'){
    const p=a.file_path; if(!p) continue;
    let s; try{ s=fs.readFileSync(p,'utf8'); }catch(err){ efail.push({seq:o.seq,p,why:'missing'}); continue; }
    const old=a.old_string, nw=a.new_string;
    if(!s.includes(old)){ efail.push({seq:o.seq,p,why:'old not found', old:old.slice(0,50)}); continue; }
    if(a.replace_all) s=s.split(old).join(nw); else { const i=s.indexOf(old); s=s.slice(0,i)+nw+s.slice(i+old.length); }
    fs.writeFileSync(p, s, 'utf8'); e++;
  } else if(o.name==='pwsh'){
    const cmd=a.command||''; let m;
    PATCH_RE.lastIndex=0;
    while((m=PATCH_RE.exec(cmd))!==null){
      const rel=m[1].replace(/\\/g,'/');
      if(!fs.existsSync(path.join(ROOT,rel))) continue;
      patchRuns++;
      let out='', code=0;
      try{ out=cp.execSync('node "'+rel+'"',{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:20000,maxBuffer:8*1024*1024}); }
      catch(err){ code=err.status||1; out=String(err.stdout||'')+String(err.stderr||'')+(err.killed?' TIMEOUT':''); }
      if(code!==0 || /MISS|ERROR|Error|fail/i.test(out)) pfail.push({seq:o.seq, rel, code, out:out.trim().slice(0,120)});
      if(!fs.existsSync(path.join(ROOT,rel))) fs.writeFileSync(path.join(ROOT,rel),'','utf8');
    }
  }
}
console.log('replayed writes',w,'edits',e,'editFailures',efail.length,'patchRuns',patchRuns,'patchProblems',pfail.length);
for(const f of efail.slice(0,30)) console.log('  EDITFAIL seq',f.seq,f.p.replace(/.*minipython./,''),f.why,JSON.stringify((f.old||'').slice(0,60)));
for(const f of pfail.slice(0,30)) console.log('  PATCHFAIL seq',f.seq,f.rel,'code',f.code,JSON.stringify(f.out.slice(0,100)));
