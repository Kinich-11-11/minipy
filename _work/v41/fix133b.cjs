const fs = require('fs');
const f = '_work/v41/p133.txt';
let t = fs.readFileSync(f, 'utf8');
const old = `  const tnmIf = find(ex, (b) => b.opcode === 'control_if' && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string'
    && [...reach(b.inputs.SUBSTACK[1])].some((x) => {
      const q = BL()[x];
      return !!q && q.opcode === 'data_setvariableto' && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'tnm';
    })
    && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && [...reach(b.inputs.CONDITION[1])].some((x) => {
      const q = BL()[x];
      return !!q && q.opcode === 'operator_gt';
    }));`;
const neu = `  const isTok2 = (d) => {
    const q = (d && typeof d[1] === 'string') ? BL()[d[1]] : null;
    return !!q && q.opcode === 'data_itemoflist' && q.fields.LIST && q.fields.LIST[0] === 'Tok'
      && litOf(q.inputs.INDEX) === '2';
  };
  const tnmIf = find(ex, (b) => b.opcode === 'control_if' && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string'
    && [...reach(b.inputs.SUBSTACK[1])].some((x) => {
      const q = BL()[x];
      return !!q && q.opcode === 'data_setvariableto' && q.fields.VARIABLE && q.fields.VARIABLE[0] === 'tnm'
        && isTok2(q.inputs.VALUE);
    })
    && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && [...reach(b.inputs.CONDITION[1])].some((x) => {
      const q = BL()[x];
      return !!q && q.opcode === 'operator_gt';
    }));`;
if (!t.includes(old)) throw new Error('anchor');
t = t.replace(old, neu);
fs.writeFileSync(f, t);
console.log('written ' + t.length);
