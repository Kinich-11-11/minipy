
const fs=require('fs');
function check(file, label){
  const p=JSON.parse(fs.readFileSync(process.argv[2]+'\\'+file,'utf8'));
  let noParent=0, topWithParent=0, danglingNext=0, danglingInputs=0, danglingParent=0, orphans=0, unusedVars=0;
  const perTarget=[];
  for(const t of p.targets){
    const B=t.blocks||{};
    const referenced=new Set();
    for(const id in B){
      const b=B[id];
      if(typeof b.next==='string'){ referenced.add(b.next); if(!B[b.next]) danglingNext++; }
      for(const k in (b.inputs||{})){
        const inp=b.inputs[k]; if(!Array.isArray(inp)) continue;
        for(let i=1;i<inp.length;i++){ const v=inp[i]; if(typeof v==='string'){ referenced.add(v); if(!B[v]) danglingInputs++; } }
      }
      if(b.parent!=null && !B[b.parent]) danglingParent++;
      if(b.topLevel && b.parent!=null) topWithParent++;
      if(!b.topLevel && b.parent==null && !referenced.has(id)) noParent++;   // rough
    }
    // proper missing-parent count: non-top blocks with parent==null
    let mp=0;
    for(const id in B){ const b=B[id]; if(!b.topLevel && b.parent==null) mp++; }
    for(const id in B){ const b=B[id]; if(!b.topLevel && !referenced.has(id) && b.parent==null) orphans++; }
    perTarget.push(t.name+': missingParent='+mp);
    noParent+=mp;
    // unused variables
    const allText=JSON.stringify(B);
    for(const v of Object.values(t.variables||{})){
      if(!allText.includes('"'+v[0].replace(/"/g,'\\"')+'"')) unusedVars++;
    }
  }
  console.log('### '+label);
  console.log('  '+perTarget.join(' | '));
  console.log('  danglingNext='+danglingNext+' danglingInputs='+danglingInputs+' danglingParent='+danglingParent);
  console.log('  topLevelWithParent='+topWithParent+'  unusedVariables='+unusedVars);
}
check('MiniPy_v4_now.json','MiniPy_v4.sb3 (04:34 latest)');
check('MiniPy_v4.1.json','MiniPy_v4.1.sb3 (09-12 23:00)');
check('MiniPy_v3.json','MiniPy_v3.sb3');
