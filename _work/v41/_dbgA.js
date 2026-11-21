// ---- DBGA: trace lookup of a/b/left/right/p in frames ----
patch('DBGA lookup trace', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const lk = defIdOf('lookup %s');
  // entry: log vn + frame depth + ownStart + FrBnd tail
  const first = BL()[lk].next;
  insertBeforeStmt(first, [
    dlog([t('LK vn='), argOf('vn'), t(' dep='), llen('FnStack'), t(' fnTop='),
      item('FnStack', llen('FnStack')),
      t(' ubO='), VAR('ubO'), t(' nNames='), llen('Names')])
  ]);
  // exit: log found/ubF/ubR + FrBnd frame segment
  let last = first; let g = 0;
  while (BL()[last].next && g++ < 5000) last = BL()[last].next;
  spliceAfter(last, chain([
    dlog([t('  -> found='), VAR('found'), t(' ubF='), VAR('ubF'), t(' ubR='), VAR('ubR'), t(' bnd='), VAR('ubB')])
  ]));
  console.log('[DBGA] lookup traced');
});
