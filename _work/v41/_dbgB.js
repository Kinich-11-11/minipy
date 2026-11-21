// ---- DBGB: trace fail sites + P520 chain handler for compose/dispatch ----
patch('DBGB fail trace', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const fl = defIdOf('fail %s');
  const first = BL()[fl].next;
  insertBeforeStmt(first, [dlog([t('FAIL '), argOf('message')])]);
  console.log('[DBGB] fail traced');
});
patch('DBGB2 p520 handler trace', () => {
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  // find the P520 handler IF: control_if inside eval whose condition references cq2 AND Tok[hi]==')'
  const evd = inDef('eval %s %s');
  let handler = null;
  for (const id of evd) {
    const b = BL()[id];
    if (b.opcode !== 'control_if' || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') continue;
    const sub = reach(b.inputs.CONDITION[1]);
    let hasCq2 = false, hasTokHi = false;
    for (const x of sub) {
      const s = JSON.stringify(BL()[x].inputs || {}) + JSON.stringify(BL()[x].fields || {});
      if (s.includes('[12,"cq2"') || s.includes('"cq2"')) hasCq2 = true;
      if (s.includes('"hi"') && s.includes('operator_item_of_list') ) hasTokHi = true;
    }
    if (hasCq2) { handler = id; break; }
  }
  if (!handler) throw new Error('[DBGB2] P520 handler not found');
  const firstIn = BL()[handler].inputs.SUBSTACK[1];
  insertBeforeStmt(firstIn, [dlog([t('P520 enter lo='), argOf('lo'), t(' hi='), argOf('hi')])]);
  console.log('[DBGB2] P520 handler traced at ' + handler);
});
