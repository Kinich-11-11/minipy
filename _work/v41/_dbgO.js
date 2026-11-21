// ---- DBGO: log every eval entry ----
patch('DBGO eval entries', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const ev = defIdOf('eval %s %s');
  const first = BL()[ev].next;
  insertBeforeStmt(first, [dlog([t('EVAL lo='), argOf('lo'), t(' hi='), argOf('hi'), t(' Tlo='), item('Tok', argOf('lo')), t(' Thi='), item('Tok', argOf('hi'))])]);
});
