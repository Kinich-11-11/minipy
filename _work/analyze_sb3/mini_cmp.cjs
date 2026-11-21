
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f+'.json','utf8'));}
const files=['MiniPy_v4.1','MiniPy_v4','MiniPy_v3'];
const out={};
for(const f of files){
  const p=load(f);
  const rec={targets:[],procs:[],keywords:new Set(),fails:new Set(),builtins:new Set(),ops:new Set(),limits:new Set(),strings:new Set()};
  for(const t of p.targets){
    rec.targets.push(t.name+'('+Object.keys(t.blocks||{}).length+')');
    for(const id in t.blocks){
      const b=t.blocks[id];
      if(b.opcode==='procedures_prototype') rec.procs.push(t.name+':'+b.mutation.proccode);
      // collect string literals in inputs
      const walk=(o)=>{ if(!o) return; if(Array.isArray(o)){ if(o.length===2&&typeof o[1]==='string'&&typeof o[0]==='number') rec.strings.add(o[1]); o.forEach(walk);} else if(typeof o==='object'){Object.values(o).forEach(walk);} };
      walk(b.inputs||{});
      if(b.opcode==='procedures_call') { rec.ops.add(b.mutation.proccode); }
    }
  }
  out[f]={targets:rec.targets,procs:rec.procs,strings:[...rec.strings]};
}
for(const f of files){
  console.log('##### '+f);
  console.log(' targets: '+out[f].targets.join(', '));
  console.log(' procs('+out[f].procs.length+'): '+out[f].procs.join(' | '));
  const errs=out[f].strings.filter(s=>/Error|error|Syntax|ValueError|TypeError|IndexError|NameError|Limit/.test(s));
  console.log(' error-string candidates('+errs.length+'): '+JSON.stringify(errs));
  console.log('');
}
