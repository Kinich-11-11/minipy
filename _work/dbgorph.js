'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
for(const T of P.targets){
  const orphans=[];
  for(const [id,b] of Object.entries(T.blocks)){
    if(b.parent===undefined||b.parent===null){ if(!b.topLevel) orphans.push([id,b.opcode]); }
  }
  if(orphans.length) {
    console.log(T.name, 'orphans', orphans.length);
    const byOp={};
    for(const [id,op] of orphans) byOp[op]=(byOp[op]||0)+1;
    console.log('   ', JSON.stringify(byOp));
    console.log('    sample', JSON.stringify(orphans.slice(0,6)));
  }
}
