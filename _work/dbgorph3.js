'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
for(const T of P.targets){
  for(const [id,b] of Object.entries(T.blocks)){
    if((b.parent===undefined||b.parent===null) && !b.topLevel) console.log('ORPHAN', T.name, id, b.opcode, JSON.stringify(Object.entries(b.inputs||{}).map(([k,v])=>[k,Array.isArray(v[1])?v[1]:v[1]])));
  }
}
