// ---- DBGD: trace tokenize entry/exit + P536 loop iterations ----
patch('DBGD tokenize trace', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const tk = defIdOf('tokenize %s');
  const first = BL()[tk].next;
  insertBeforeStmt(first, [dlog([t('TOK-IN n='), llen('Tok'), t(' p36a='), VAR('p36a')])]);
  let last = first; let g = 0;
  while (BL()[last].next && g++ < 6000) last = BL()[last].next;
  spliceAfter(last, chain([dlog([t('TOK-OUT n='), llen('Tok'), t(' e='), VAR('error')])]));
  console.log('[DBGD] tokenize entry/exit traced');
});
