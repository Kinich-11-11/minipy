// ---- DBGF: log at EVERY UnboundLocalError raise site (whole interpreter) ----
patch('DBGF ule raise sites global', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const sites = find(allIds(), (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...reach(Object.values(b.inputs)[0][1])].some((x) => JSON.stringify(BL()[x].inputs || {}).includes('UnboundLocalError')));
  console.log('[DBGF] ULE fail sites = ' + sites.length);
  for (const f of sites) {
    insertBeforeStmt(f, [dlog([t('ULE-RAISE ev='), VAR('ev'), t(' name='), VAR('name'), t(' ubR='), VAR('ubR'), t(' found='), VAR('found'), t(' ubO='), VAR('ubO'), t(' dep='), llen('FnStack'), t(' fntop='), item('FnStack', llen('FnStack'))])]);
  }
});
