const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const f='bproced_dgad0lhlf';
console.log(JSON.stringify(BL[f].inputs));
function dump(id,d){const b=BL[id];if(!b||d>6)return;console.log(' '.repeat(d*2)+id,b.opcode,JSON.stringify(b.inputs).slice(0,300));for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')dump(v[1],d+1);}
dump(f,0);
