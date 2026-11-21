const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = () => it.blocks;
const gid = 'bcontro_dfb2snjri';
const b = BL()[gid];
const c = BL()[b.inputs.CONDITION[1]];
console.log('cond opcode: ' + c.opcode);
const isItemTokCmp = (cond, lit) => {
  if (!cond || cond.opcode !== 'operator_equals') return false;
  const isItem = (d) => typeof d === 'string' && BL()[d] && BL()[d].opcode === 'data_itemoflist'
    && BL()[d].fields.LIST && BL()[d].fields.LIST[0] === 'Tok';
  const isLit = (d) => Array.isArray(d) && ((d[0] === 10 && String(d[1]) === lit) || (Array.isArray(d[1]) && d[1][0] === 10 && String(d[1][1]) === lit));
  const o1 = cond.inputs.OPERAND1, o2 = cond.inputs.OPERAND2;
  return (isItem(o1 && o1[1]) && isLit(o2)) || (isItem(o2 && o2[1]) && isLit(o1));
};
console.log('a isEqTokParen: ' + isItemTokCmp(BL()[c.inputs.OPERAND1[1]], '('));
console.log('b isEqTokParen: ' + isItemTokCmp(BL()[c.inputs.OPERAND2[1]], ')'));
const a = BL()[c.inputs.OPERAND1[1]];
console.log('a opcode: ' + a.opcode);
console.log('a O1: ' + JSON.stringify(a.inputs.OPERAND1).slice(0, 80));
console.log('a O2: ' + JSON.stringify(a.inputs.OPERAND2).slice(0, 80));
