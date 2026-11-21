// ---- DBGG: assign trace + ULE raise with FrBnd tail ----
patch('DBGG assign + ule', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const asDef = defIdOf('assign %s %s %s');
  const first = BL()[asDef].next;
  insertBeforeStmt(first, [dlog([t('AS vn='), argOf('vn'), t(' vt='), argOf('vt'), t(' v='), argOf('vv'), t(' dep='), llen('FnStack'), t(' bc='), item('FrBndC', llen('FrBndC'))])]);
  const sites = find(allIds(), (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...reach(Object.values(b.inputs)[0][1])].some((x) => JSON.stringify(BL()[x].inputs || {}).includes('UnboundLocalError')));
  console.log('[DBGG] ULE sites = ' + sites.length);
  for (const f of sites) {
    insertBeforeStmt(f, [dlog([t('ULE ev='), VAR('ev'), t(' ubR='), VAR('ubR'), t(' found='), VAR('found'), t(' ubO='), VAR('ubO'), t(' ubF='), VAR('ubF'), t(' ubB='), VAR('ubB'), t(' dep='), llen('FnStack'), t(' blast='), item('FrBnd', llen('FrBnd')), t(' bc='), item('FrBndC', llen('FrBndC'))])]);
  }
});
