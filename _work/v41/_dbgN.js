// ---- DBGN: probe the two SyntaxError: parentheses fail sites ----
patch('DBGN paren sites', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const evd = inDef('eval %s %s');
  const sites = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && JSON.stringify(Object.values(b.inputs)).includes('parentheses'));
  console.log('[DBGN] paren sites = ' + sites.length);
  for (const f of sites) {
    insertBeforeStmt(f, [dlog([t('PAREN lo='), argOf('lo'), t(' hi='), t(' Tlo='), item('Tok', argOf('lo')), t(' Thi='), item('Tok', argOf('hi'))])]);
  }
});
