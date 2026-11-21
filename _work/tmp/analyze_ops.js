const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const core=['build5.js','dsl.js','regalloc.js','regalloc2.js','kernel/lex.js','kernel/parse.js','kernel/compiler.js','kernel/vm.js','kernel/ast.js','kernel/astutil.js','kernel/index.js','kernel/lib.js','kernel/pexpr.js','kernel/comp.js','run5.cjs','verify.ps1','check.js'];
const report={};
for(const c of core) report[c]={writes:[],edits:[],pwsh:[]};
for(const o of ops){
  const a=o.args||{};
  if(o.name==='write'||o.name==='edit'){
    const p=(a.file_path||'').replace(/\\/g,'/');
    for(const c of core) if(p.endsWith('v5/'+c)) { report[c][o.name==='write'?'writes':'edits'].push(o.seq); }
  } else if(o.name==='pwsh'){
    const cmd=a.command||'';
    for(const c of core) {
      const base=c.split('/').pop();
      if(cmd.includes(base) && /writeFileSync|Set-Content|Out-File|>\s*\S*\.js/.test(cmd)) report[c].pwsh.push({seq:o.seq, head:cmd.slice(0,150)});
    }
  }
}
for(const c of core){
  const r=report[c];
  const lastDirect=Math.max(0,...r.writes,...r.edits);
  const afterPwsh=r.pwsh.filter(p=>p.seq>lastDirect);
  console.log(`\n=== ${c}: writes=${r.writes.length} edits=${r.edits.length} lastDirect=${lastDirect} pwshTouching=${r.pwsh.length} pwshAfterLastDirect=${afterPwsh.length}`);
  for(const p of afterPwsh.slice(0,6)) console.log('    seq '+p.seq+': '+p.head.replace(/\n/g,' '));
}
