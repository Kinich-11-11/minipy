patch('DBGT9b', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  global.insertAtProcStart = (defId, ids) => {
    const first = chain(ids.slice());
    const old = BL()[defId].next;
    BL()[defId].next = first; BL()[first].parent = defId;
    let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
    BL()[tail].next = old; if (old) BL()[old].parent = tail;
  };
  const fDef = defIdOf('fail %s');
  insertAtProcStart(fDef, [log([t('FAIL pc='), VAR('pc'), t(' msg=['), argOf('message'), t('] head='), VAR('head'), t(' t2='), item('Tok', num(2)), t(' cev=['), VAR('ev'), t(']'), t(' ctok1='), item('Tok', num(1)), t(' ctok3='), item('Tok', num(3))])]);
  console.log('[DBGT9b] ok');
});
