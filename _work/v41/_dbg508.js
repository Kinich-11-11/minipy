// ---- DBG508: log every eval entry ----
patch('DBG508', () => {
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
  const evDef = defIdOf('eval %s %s');
  insertAtProcStart(evDef, [log([t('EV lo='), argOf('lo'), t(' hi='), argOf('hi'), t(' t='), item('Tok', argOf('lo'))])]);
  console.log('[DBG508] ok');
});
