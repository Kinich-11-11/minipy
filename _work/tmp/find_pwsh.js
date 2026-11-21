const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const core=['build5.js','dsl.js','regalloc.js','kernel/lex.js','kernel/parse.js','kernel/compiler.js','kernel/vm.js','kernel/ast.js','kernel/astutil.js','kernel/index.js','kernel/lib.js','kernel/pexpr.js','kernel/comp.js','run5.cjs','verify.ps1','check.js'];
let n=0;
for(const o of ops){
  if(o.name!=='pwsh') continue;
  const cmd=(o.args||{}).command||'';
  const mut = /writeFileSync|Set-Content|Out-File|Add-Content|WriteAllText|writeAllText/.test(cmd);
  if(!mut) continue;
  const hits=core.filter(c=>{ const base=c.split('/').pop(); return new RegExp('kernel[/\\\\]'+base.replace('.','\\.')+'|[^a-z0-9]'+base.replace('.','\\.')).test(cmd); });
  // exclude sb3lib / regalloc references that are read-only
  const reallyMutatesCore = hits.some(c=>{
    const base=c.split('/').pop();
    return new RegExp('const p\\s*=\\s*[\'"]_work/v5/'+c.replace(/\//g,'/').replace('.','\\.')+'|_work[/\\\\]v5[/\\\\]'+c.replace(/\//g,'[/\\\\]').replace('.','\\.')).test(cmd);
  });
  if(hits.length){ n++; console.log('seq '+o.seq+'  hits='+hits.join(',')+'  reallyMutates='+reallyMutatesCore); }
}
console.log('total pwsh mutating ops referencing core names:', n);
