const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
const dumpIdx = (desc, d) => {
  if (d > 6) return '…';
  if (Array.isArray(desc)) return 'prim:' + JSON.stringify(desc).slice(0, 26);
  const b = BL[desc];
  if (!b) return 'dead';
  if (b.opcode === 'argument_reporter_string_number') return 'arg:' + b.fields.VALUE[0];
  if (b.opcode === 'operator_add') return '(' + dumpIdx(b.inputs.NUM1[1], d+1) + '+' + dumpIdx(b.inputs.NUM2[1], d+1) + ')';
  if (b.opcode === 'data_itemoflist') return 'item(' + b.fields.LIST[0] + ',' + dumpIdx(b.inputs.INDEX[1], d+1) + ')';
  return b.opcode;
};
for (const gid of ['bcontro_b7inre6af', 'bcontro_dfb2snjri', 'tJy:^jGB4+#6n`,VS,[)', 'bcontro_d8oid1w22', 'bcontro_bcwd9w50v']) {
  const blk = BL[gid];
  if (!blk) { console.log(gid + ' MISSING'); continue; }
  const c = BL[blk.inputs.CONDITION[1]];
  const parts = [];
  const walk = (id, d) => {
    const b = BL[id];
    if (!b || d > 5) return;
    if (b.opcode === 'operator_equals') {
      parts.push(dumpIdx(b.inputs.OPERAND1[1], 0) + '==' + JSON.stringify(b.inputs.OPERAND2).slice(0, 20));
    } else if (b.opcode === 'operator_and' || b.opcode === 'operator_or') {
      walk(b.inputs.OPERAND1[1], d+1); walk(b.inputs.OPERAND2[1], d+1);
    }
  };
  walk(blk.inputs.CONDITION[1], 0);
  console.log(gid + ' (' + blk.opcode + '): ' + parts.join(' AND '));
}
