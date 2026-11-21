
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function lit(t, inp){
  if(!inp) return '?';
  const v = inp[1];
  if(typeof v === 'string'){ // block id
    const b=t.blocks[v]; if(!b) return '#'+v;
    return render(t,v);
  }
  if(inp[0]===12){ // variable reporter
    const varName = inp[1]; const t2=inp[2];
    const all = {}; for(const tg of [byName(A).Stage]) {}
    return 'var(' + varName + ')';
  }
  if(inp[0]===13) return 'list(' + inp[1] + ')';
  return JSON.stringify(inp[1]);
}
function render(t, id, indent){
  let s=''; let cur=id; let guard=0;
  while(cur && guard++<500){
    const b=t.blocks[cur]; if(!b) break;
    const fields = Object.fromEntries(Object.entries(b.fields||{}).map(([k,v])=>[k,v[0]]));
    let line = b.opcode;
    const args=[];
    for (const [k,v] of Object.entries(b.inputs||{})){
      if (k==='SUBSTACK'||k==='SUBSTACK2') continue;
      args.push(k+'=' + lit(t, v));
    }
    if (Object.keys(fields).length) args.push(JSON.stringify(fields));
    line += '(' + args.join(', ') + ')';
    s += ' '.repeat(indent) + line + '\n';
    if (b.inputs && b.inputs.SUBSTACK) { s += ' '.repeat(indent+2) + '{\n' + render(t, b.inputs.SUBSTACK[1], indent+4) + ' '.repeat(indent+2) + '}\n'; }
    if (b.inputs && b.inputs.SUBSTACK2) { s += ' '.repeat(indent+2) + 'else {\n' + render(t, b.inputs.SUBSTACK2[1], indent+4) + ' '.repeat(indent+2) + '}\n'; }
    cur = b.next;
  }
  return s;
}
function rootOf(t, id){ let cur=id,g=0; while(cur&&g++<200){ const b=t.blocks[cur]; if(!b) return null; if(b.topLevel) return cur; cur=b.parent; } return null; }
const ROOT = rootOf(byName(A).Controller, 'gC*AK8!(qJ?vBtfbuEAc');
p('ROOT id ' + ROOT + ' opcode ' + byName(A).Controller.blocks[ROOT].opcode + ' fields=' + JSON.stringify(byName(A).Controller.blocks[ROOT].fields));
function defName(t, rootId){
  const b=t.blocks[rootId];
  if(b.opcode!=='procedures_definition') return '(not a definition)';
  const protoId = b.inputs.custom_block && b.inputs.custom_block[1];
  const proto = t.blocks[protoId];
  return proto && proto.mutation ? proto.mutation.proccode : '(?)';
}
p('v4 definition proccode: ' + defName(byName(A).Controller, ROOT));
p('v7 definition proccode: ' + defName(byName(B).Controller, ROOT));
p('===== v4 script ====='); p(render(byName(A).Controller, ROOT, 0));
p('===== v7 script ====='); p(render(byName(B).Controller, ROOT, 0));
fs.writeFileSync(base+'surface13.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,8000));
