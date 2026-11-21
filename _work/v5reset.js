
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(x=>x.name==='Interpreter'); const B=it.blocks;
const names={}; for(const [id,v] of Object.entries(it.lists)) names[id]=v[0];
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const i=b.inputs[k];if(!i)continue;for(let x=1;x<i.length;x++){const v=i[x];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
function reach(root){const s=new Set();const st=[root];while(st.length){const x=st.pop();if(s.has(x))continue;s.add(x);for(const c of kids(x))st.push(c);}return s;}
const rst=reach('v5def4t');
const cleared=new Set();
for(const id of rst){ const b=B[id]; if(b.opcode==='data_deletealloflist'||b.opcode==='data_deleteoflist'){ const f=b.fields.LIST; if(f) cleared.add(names[f[1]]||f[0]); } }
const all=Object.values(it.lists).map(v=>v[0]);
const notCleared=all.filter(n=>!cleared.has(n));
console.log('reset_vm clears '+cleared.size+' lists');
console.log('reset_vm block count:', rst.size);
console.log('NOT cleared by reset_vm ('+notCleared.length+'): '+notCleared.join(' '));
// also: stage lists cleared?
console.log('cleared list names: '+[...cleared].join(' '));
