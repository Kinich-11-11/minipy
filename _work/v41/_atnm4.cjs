const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
function walk(id,out){const b=BL[id];if(!b)return;const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');out.push(b.opcode+(f?'['+f+']':''));for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')walk(v[1],out);}
for(const f of ['bproced_dg20kbyn5','bproced_dgiz5e6j7','bproced_dgad0lhlf']){
 let par=BL[f].parent,g=0;console.log('==',f);
 while(par&&g++<40){const b=BL[par];if((b.opcode==='control_if'||b.opcode==='control_if_else')&&b.inputs.CONDITION){const o=[];walk(b.inputs.CONDITION[1],o);console.log('  anc',g,b.opcode,o.slice(0,10).join(' ').slice(0,180));}
  par=b.parent;}
}
