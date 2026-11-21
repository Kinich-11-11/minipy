
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log('meta:', JSON.stringify(p.meta.agent));
let tot=0;
for(const t of p.targets){
  const nb=Object.keys(t.blocks||{}).length; tot+=nb;
  const L=t.lists?Object.keys(t.lists).length:0;
  const V=t.variables?Object.keys(t.variables).length:0;
  console.log('  '+t.name+': blocks='+nb+' varsTotal='+V+' lists='+L);
  if(L) console.log('    LISTS: '+Object.values(t.lists).map(x=>x[0]).join(' | '));
  const procs=[]; for(const id in t.blocks) if(t.blocks[id].opcode==='procedures_prototype') procs.push(t.blocks[id].mutation.proccode);
  if(procs.length) console.log('    PROCS('+procs.length+'): '+procs.join(' | '));
}
console.log('  TOTAL blocks='+tot);
const strs=new Set();
const walk=(o)=>{ if(!o) return; if(Array.isArray(o)){ if(o.length===2&&typeof o[1]==='string'&&typeof o[0]==='number') strs.add(o[1]); o.forEach(walk);} else if(typeof o==='object'){ if(o.fields) for(const k in o.fields) strs.add(String(o.fields[k][0])); Object.values(o).forEach(walk);} };
for(const t of p.targets) for(const id in t.blocks) walk(t.blocks[id]);
const arr=[...strs];
console.log('\nkeywords:', JSON.stringify(arr.filter(s=>/^(def|class|try|except|finally|lambda|import|from|global|nonlocal|return|yield|with|assert|del|raise|pass|break|continue|elif|else|while|for|in|is|not|and|or|True|False|None|as)$/.test(s))));
console.log('errors:', JSON.stringify(arr.filter(s=>/Error/.test(s))));
