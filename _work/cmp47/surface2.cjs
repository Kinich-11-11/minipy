
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));

function collect(P){
  const keys = new Set(), strings = new Map(), opcodes = new Map(), procs = new Map(), colors = new Map();
  const penOps = new Map();
  for (const t of P.targets){
    for (const id of Object.keys(t.blocks)){
      const b = t.blocks[id];
      if (!b || typeof b !== 'object') continue;
      opcodes.set(b.opcode, (opcodes.get(b.opcode)||0)+1);
      if (b.opcode === 'event_whenkeypressed') keys.add(b.fields.KEY_OPTION[0]);
      if (b.opcode === 'procedures_prototype' || b.opcode === 'procedures_call'){
        const pc = b.mutation && b.mutation.proccode; if (pc) procs.set(pc, (procs.get(pc)||0)+1);
      }
      if (b.opcode.startsWith('pen_')) penOps.set(b.opcode, (penOps.get(b.opcode)||0)+1);
      for (const fk of Object.keys(b.fields||{})){
        const v = b.fields[fk][0];
        if (typeof v === 'string' && v.length>0 && !/^-?\d+(\.\d+)?$/.test(v)) strings.set(v, (strings.get(v)||0)+1);
      }
      for (const ik of Object.keys(b.inputs||{})){
        const inp = b.inputs[ik];
        if (!Array.isArray(inp)) continue;
        const val = inp[1];
        if (Array.isArray(val) && typeof val[1] === 'string') {
          const s = val[1];
          if (s.length>0 && !/^-?\d+(\.\d+)?$/.test(s)) strings.set(s, (strings.get(s)||0)+1);
        }
        if (b.opcode === 'pen_setPenColorToColor' && ik === 'COLOR' && Array.isArray(val) && typeof val[1]==='string') colors.set(val[1], (colors.get(val[1])||0)+1);
      }
    }
  }
  return {keys, strings, opcodes, procs, colors, penOps};
}
const a = collect(A), b = collect(B);
const out = [];
const p = (...x)=>out.push(x.join(' '));
function diffSet(name, sa, sb){
  const onlyA = [...sa].filter(x=>!sb.has(x));
  const onlyB = [...sb].filter(x=>!sa.has(x));
  p('### ' + name + ': v4-only=' + onlyA.length + ' v7-only=' + onlyB.length + ' common=' + [...sa].filter(x=>sb.has(x)).length);
  p('  v4-only: ' + JSON.stringify(onlyA));
  p('  v7-only: ' + JSON.stringify(onlyB));
}
p('== KEY HATS =='); diffSet('keys', a.keys, b.keys);
p('== STRING LITERALS (unique) == v4=' + a.strings.size + ' v7=' + b.strings.size);
diffSet('strings', new Set(a.strings.keys()), new Set(b.strings.keys()));
p('== PEN OPS == v4=' + JSON.stringify([...a.penOps]) + ' v7=' + JSON.stringify([...b.penOps]));
p('== PEN COLORS v4 == ' + JSON.stringify([...a.colors.entries()].slice(0,70)));
p('== PEN COLORS v7 == ' + JSON.stringify([...b.colors.entries()].slice(0,70)));
p('== OPCODES v4=' + a.opcodes.size + ' v7=' + b.opcodes.size);
diffSet('opcodes', new Set(a.opcodes.keys()), new Set(b.opcodes.keys()));
p('== PROCS v4=' + a.procs.size + ' v7=' + b.procs.size);
const pcA = new Set(a.procs.keys()), pcB = new Set(b.procs.keys());
const onlyA = [...pcA].filter(x=>!pcB.has(x)), onlyB=[...pcB].filter(x=>!pcA.has(x));
p('  procs v4-only(' + onlyA.length + '): ' + JSON.stringify(onlyA));
p('  procs v7-only(' + onlyB.length + '): ' + JSON.stringify(onlyB));
fs.writeFileSync(base+'surface2.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
