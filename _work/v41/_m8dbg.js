patch('DBGM8b', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  // the instance-attr read fail site in eval: `set p6v = atid; set p6t = "O"; tname; fail`
  const evd = inDef('eval %s %s');
  const atidSets = find(evd, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'p6v'
    && JSON.stringify(b.inputs.VALUE).includes('"atid"'));
  console.log('[DBGM8b] p6v=atid sites: ' + atidSets.length);
  for (const id of atidSets) {
    // only the one followed by tname+fail (the attribute-read miss)
    let cur = id; let sawFail = false;
    for (let g = 0; g < 4; g++) { cur = BL()[cur].next; if (!cur) break; if (BL()[cur].opcode === 'procedures_call' && BL()[cur].mutation.proccode === 'fail %s') sawFail = true; }
    if (sawFail) insertAfterStmt(id, [log([t('ATTRMISS atid='), VAR('atid'), t(' cls='), item('InstCls', VAR('atid')), t(' nm='), VAR('atnm'), t(' pc='), VAR('pc')])]);
  }
  console.log('[DBGM8b] ok');
});
function insertAfterStmt(targetId, ids) {
  const first = chain(ids.slice());
  const nx = BL()[targetId].next;
  BL()[targetId].next = first; BL()[first].parent = targetId;
  let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
  BL()[tail].next = nx; if (nx) BL()[nx].parent = tail;
  return first;
}
