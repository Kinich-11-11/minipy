// ---- DBGE: log context at eval's "SyntaxError: expression" raise sites ----
patch('DBGE expr-fail context', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const evd = inDef('eval %s %s');
  const sites = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...reach(Object.values(b.inputs)[0][1])].some((x) => {
      const w = BL()[x];
      return w.fields && w.fields.STRING1 && w.fields.STRING1[0] === 'SyntaxError: expression';
    }));
  console.log('[DBGE] expression-fail sites in eval = ' + sites.length);
  for (const f of sites) {
    insertBeforeStmt(f, [dlog([t('EXPRFAIL lo='), argOf('lo'), t(' hi='), argOf('hi'),
      t(' Tlo='), item('Tok', argOf('lo')), t(' Klo='), item('Kind', argOf('lo')),
      t(' Thi='), item('Tok', argOf('hi')), t(' Khi='), item('Kind', argOf('hi')),
      t(' mdot='), VAR('mdot'), t(' count='), VAR('count')])]);
  }
});
