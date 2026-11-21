const fs=require('fs'), path=require('path'), cp=require('child_process');
const ROOT='D:/编程/scratch/ai/minipython';
const V=ROOT+'/_work/v5/kernel/vm.js', B5=ROOT+'/_work/v5/build5.js';
function repFile(p, a, b){
  let s=fs.readFileSync(p,'utf8');
  const i=s.indexOf(a);
  if(i<0) return 'MISS';
  s=s.slice(0,i)+b+s.slice(i+a.length);
  fs.writeFileSync(p,s,'utf8'); return 'ok';
}
const OOB={
  515012: () => { const t=fs.readFileSync(ROOT+'/_work/v5/_tail.txt','utf8'); fs.appendFileSync(V,t,'utf8'); return 'append '+t.length; },
  516936: () => repFile(V, "    const drop = () => S.chg('sp', E.mul(E.num(-1), E.var('nargs')));", "    const drop = () => [S.chg('sp', E.mul(E.num(-1), E.var('nargs')))];"),
  522992: () => repFile(B5, "const OUT = ROOT + '/MiniPy_v5.sb3';", "const OUT = process.env.V5_OUT || (ROOT + '/MiniPy_v5.sb3');"),
  524880: () => repFile(V, "        ...tostr(arg(0), 'argt'),", "        ...tostr(E.item('Stk', E.add(E.var('ubase'), E.var('i'))), 'argt'),")
           + '|' + repFile(V, "          ...L.payInto(arg(0), 'av2'),", "          ...L.payInto(E.item('Stk', E.add(E.var('ubase'), E.var('i'))), 'av2'),"),
  526501: () => 'skipped(MISS originally)',
  1305775: () => 'skipped(errored originally)',
};
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
let w=0,e=0,patchRuns=0; const efail=[]; const oobLog=[];
const PATCH_RE=/(?:^|[;&|]\s*|\s)node(?:\.exe)?\s+([^;&|\s]*patch[0-9]*\.cjs)/g;
for(const o of ops){
  const a=o.args||{};
  if(OOB[o.seq]){ const r=OOB[o.seq](); oobLog.push(o.seq+' -> '+r); }
  if(o.name==='write'){
    if(!a.file_path) continue;
    fs.mkdirSync(path.dirname(a.file_path),{recursive:true});
    fs.writeFileSync(a.file_path, a.content||'', 'utf8'); w++;
  } else if(o.name==='edit'){
    const p=a.file_path; if(!p) continue;
    let s; try{ s=fs.readFileSync(p,'utf8'); }catch(err){ efail.push({seq:o.seq,p,why:'missing'}); continue; }
    const old=a.old_string, nw=a.new_string;
    if(!s.includes(old)){ efail.push({seq:o.seq,p,why:'old not found'}); continue; }
    if(a.replace_all) s=s.split(old).join(nw); else { const i=s.indexOf(old); s=s.slice(0,i)+nw+s.slice(i+old.length); }
    fs.writeFileSync(p, s, 'utf8'); e++;
  } else if(o.name==='pwsh'){
    const cmd=a.command||''; let m; PATCH_RE.lastIndex=0;
    while((m=PATCH_RE.exec(cmd))!==null){
      const rel=m[1].replace(/\\/g,'/');
      if(!fs.existsSync(path.join(ROOT,rel))) continue;
      patchRuns++;
      try{ cp.execSync('node "'+rel+'"',{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:20000,maxBuffer:8*1024*1024}); }catch(err){}
    }
  }
}
console.log('writes',w,'edits',e,'patches',patchRuns,'editFailures',efail.length);
for(const f of efail) console.log('  EDITFAIL seq',f.seq,f.p.replace(/.*v5./,''),f.why);
console.log('out-of-band:'); for(const l of oobLog) console.log('  '+l);
