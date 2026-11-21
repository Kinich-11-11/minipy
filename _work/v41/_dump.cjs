// dump.cjs <id> — textual dump of a block subtree (iterative)
const p=JSON.parse(require('fs').readFileSync('project215.json','utf8'));
const t=p.targets.find(t=>t.blocks&&Object.keys(t.blocks).length>5000);
const B=t.blocks;
function desc(d){ // input descriptor
  if(!Array.isArray(d)) return String(d);
  if(d[0]===1||d[0]===2){ // shadow / shadow-obsured: [1, shadow, obsured?]
    if(typeof d[1]==='string') return 'BLOCK('+d[1]+')';
    if(Array.isArray(d[1])) return prim(d[1]);
    if(d[2]!==undefined) return 'OBSCURE['+prim(d[1])+' | '+prim(d[2])+']';
  }
  return JSON.stringify(d).slice(0,80);
}
function prim(a){
  // [type, ...]
  const map={4:'num',5:'pos',6:'int',7:'angle',8:'color',9:'str',10:'str',11:'bcast',12:'var',13:'list'};
  if(a[0]>=4&&a[0]<=10) return JSON.stringify(a[1]);
  if(a[0]===11) return 'BCAST('+a[1]+')';
  if(a[0]===12) return 'VAR('+a[1]+')';
  if(a[0]===13) return 'LIST('+a[1]+')';
  if(typeof a[1]==='string'&&B[a[1]]) return a[1]+'('+B[a[1]].opcode+')';
  return JSON.stringify(a).slice(0,60);
}
function fld(b){ const o={}; for(const k in (b.fields||{})) o[k]=b.fields[k][0]; return JSON.stringify(o); }
const start=process.argv[2], maxd=parseInt(process.argv[3]||'99');
function walk(id, depth, prefix){
  if(!id||depth>maxd) return;
  const b=B[id]; if(!b){ console.log(prefix+'??'+id); return; }
  let line=prefix+b.opcode;
  if(b.mutation&&b.mutation.proccode!==undefined) line+=' PROC['+b.mutation.proccode+']';
  const ins=[];
  for(const k in (b.inputs||{})) ins.push(k+'='+desc(b.inputs[k]));
  if(ins.length) line+=' {'+ins.join(', ')+'}';
  if(Object.keys(b.fields||{}).length) line+=' '+fld(b);
  console.log(line.slice(0,300));
  for(const k of ['SUBSTACK','SUBSTACK2']) if(b.inputs&&b.inputs[k]&&typeof b.inputs[k][1]==='string') walk(b.inputs[k][1], depth+1, prefix+'  ');
  if(b.next) walk(b.next, depth, prefix);
}
walk(start, 0, '');
