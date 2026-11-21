const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=P.targets.find(t=>/Interp/i.test(t.name));
const B=t.blocks;
const walk=(id,ind,seen)=>{
  if(!id||seen.has(id)||ind>8)return;
  seen.add(id);
  const x=B[id];
  if(!x){console.log(' '.repeat(ind),'MISSING',id);return;}
  console.log(' '.repeat(ind), id, x.opcode, JSON.stringify(x.fields), JSON.stringify(x.inputs).slice(0,240));
  for(const v of Object.values(x.inputs||{})){ if(typeof v[1]==='string') walk(v[1],ind+2,seen); else if(Array.isArray(v[1])&&typeof v[1][1]==='string') walk(v[1][1],ind+2,seen); }
};
walk('%NSrXDH6)+)k1U%J/.7W',0,new Set());
