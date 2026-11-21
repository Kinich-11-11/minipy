// ---- DBGL: dump FN/FV at tail start (before restore) ----
patch('DBGL fn dump', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const joinList = (list, n) => {
    let acc = txt('');
    for (let i = 1; i <= n; i++) acc = JOIN(acc, JOIN(item(list, num(i)), txt('~')));
    return acc;
  };
  const cu = defIdOf('calluser %s %s %s');
  const clearNames = find(reach(cu), (b) => b.opcode === 'data_deletealloflist' && b.fields.LIST && b.fields.LIST[0] === 'Names');
  for (const cn of clearNames) {
    insertBeforeStmt(cn, [dlog([t('TAIL fn='), argOf('fn'), t(' epB='), VAR('epB'), t(' FN='), joinList('FN', 8), t(' FV='), joinList('FV', 10), t(' N='), joinList('Names', 8), t(' V='), joinList('Values', 10)])]);
  }
});
