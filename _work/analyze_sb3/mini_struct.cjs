
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f+'.json','utf8'));}
for (const f of ['MiniPy_v4','MiniPy_v4.1']) {
  const p=load(f);
  console.log('##### '+f+'  meta='+JSON.stringify(p.meta.agent));
  let tot=0;
  for(const t of p.targets){
    const nb=Object.keys(t.blocks||{}).length; tot+=nb;
    const v=Object.values(t.variables||{}); 
    const vars=v.filter(x=>!Array.isArray(x[1])||typeof x[1]!=='object');
    const L=Object.values(t.lists||{}).map(x=>x[0]+'['+(Array.isArray(x[1])?x[1].length:'?')+']');
    const V=v.filter(x=>!(t.lists&&Object.values(t.lists).some(l=>l[0]===x[0]))).map(x=>x[0]);
    console.log('  '+t.name+': blocks='+nb+' vars='+(v.length-(t.lists?Object.keys(t.lists).length:0))+' lists='+(t.lists?Object.keys(t.lists).length:0));
    if(t.lists&&Object.keys(t.lists).length) console.log('    LISTS: '+L.join(' | '));
    const procs=[]; for(const id in t.blocks) if(t.blocks[id].opcode==='procedures_prototype') procs.push(t.blocks[id].mutation.proccode);
    if(procs.length) console.log('    PROCS('+procs.length+'): '+procs.join(' | '));
  }
  console.log('  TOTAL blocks='+tot);
}
