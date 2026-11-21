patch('P509DBG', () => {
  const evd = inDef('eval %s %s');
  const varNameOf = (v) => {
    if (!Array.isArray(v)) return 'notarray:' + JSON.stringify(v).slice(0, 40);
    if (v[0] === 12) return v[1];
    if (typeof v[1] === 'string' && BL()[v[1]] && BL()[v[1]].opcode === 'data_variable') return BL()[v[1]].fields.VARIABLE[0];
    if (typeof v[1] === 'string' && BL()[v[1]]) return 'block:' + BL()[v[1]].opcode;
    return 'unknown:' + JSON.stringify(v).slice(0, 60);
  };
  const truths = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'truth %s %s');
  console.log('[P509DBG] truth calls: ' + truths.length);
  for (const id of truths) {
    const ids = JSON.parse(BL()[id].mutation.argumentids);
    console.log('  truth arg0=' + varNameOf(BL()[id].inputs[ids[0]]));
  }
});
