const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const out=[];
for (const [id,b] of Object.entries(BL)) {
  if (b.opcode!=='data_replaceitemoflist') continue;
  if (!b.fields || !b.fields.LIST || b.fields.LIST[0]!=='Tok') continue;
  const d=(v)=>v&&typeof v[1]==='string'&&BL[v[1]]?BL[v[1]].opcode+' '+(BL[v[1]].fields&&Object.values(BL[v[1]].fields).map(x=>JSON.stringify(x[0])).join('|')):JSON.stringify(v);
  out.push(id+' idx='+d(b.inputs.INDEX)+' item='+d(b.inputs.ITEM)+' parent='+(BL[b.parent]?BL[b.parent].opcode:'-'));
}
console.log(out.length); console.log(out.slice(0,40).join('\n'));
