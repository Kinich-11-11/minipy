
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f+'.json','utf8'));}
const feats={
 'not in':['not in'], 'in':[' in '], '**':'**', 'str repeat':'*', 'type()':'type', 'max':'max', 'min':'min', 'pow':'pow', 'ord':'ord', 'chr':'chr',
 'round2':'round', 'list literal':'[', 'def':'def', 'try':'try', 'lambda':'lambda', 'import':'import', 'fstring':'f"', 'class':'class',
 '+= ':'+=', '-=':'-=', '//':'//', '%':'%', 'insert':']', 'method call':'.upper', 'and':'and', 'or':'or', 'not':'not', 'while':'while',
 'elif':'elif', 'break':'break', 'continue':'continue', 'pass':'pass', 'global':'global', 'del':'del', 'assert':'assert', 'return':'return'
};
for(const f of ['MiniPy_v4.1','MiniPy_v4','MiniPy_v3']){
  const p=load(f);
  const strs=new Set();
  const walk=(o)=>{ if(!o) return; if(Array.isArray(o)){ if(o.length===2&&typeof o[1]==='string'&&typeof o[0]==='number') strs.add(o[1]); o.forEach(walk);} else if(typeof o==='object'){ if(o.fields) for(const k in o.fields) strs.add(String(o.fields[k][0])); Object.values(o).forEach(walk);} };
  for(const t of p.targets){ for(const id in t.blocks) walk(t.blocks[id]); }
  const arr=[...strs];
  const res={};
  for(const k in feats){ const v=Array.isArray(feats[k])?feats[k]:[feats[k]]; res[k]=v.some(x=>arr.some(s=>s===x)); }
  console.log('##### '+f+'  meta='+JSON.stringify(p.meta&&p.meta.agent||''));
  console.log('  exact-match present: '+Object.entries(res).filter(([k,v])=>v).map(([k])=>k).join(', '));
  const kw=arr.filter(s=>/^(def|class|try|except|finally|lambda|import|from|global|nonlocal|return|yield|with|assert|del|raise|pass|break|continue|elif|else|while|for|in|is|not|and|or|True|False|None)$/.test(s));
  console.log('  keyword-literals found: '+JSON.stringify(kw));
  console.log('  identifiers('+arr.length+'): '+arr.filter(s=>s.length<=14&&!s.includes(' ')).join(' '));
  console.log('');
}