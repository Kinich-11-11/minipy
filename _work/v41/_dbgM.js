// ---- DBGM: probe P141 not-callable sites + P85 in eval ----
patch('DBGM nc sites', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const evd = inDef('eval %s %s');
  // 所有 fail 站点里消息含 "not callable" 的
  const sites = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...reach(Object.values(b.inputs)[0][1])].some((x) => JSON.stringify(BL()[x].inputs || {}).includes('not callable')));
  console.log('[DBGM] not-callable fail sites in eval = ' + sites.length);
  for (const f of sites) {
    insertBeforeStmt(f, [dlog([t('NC lo='), argOf('lo'), t(' hi='), argOf('hi'), t(' Tlo='), item('Tok', argOf('lo')), t(' Klo='), item('Kind', argOf('lo')), t(' ev='), VAR('ev'), t(' evt='), VAR('evtype'), t(' x8nc='), VAR('x8nc'), t(' narg='), VAR('narg'), t(' callable='), VAR('callable'), t(' found='), VAR('found')])]);
  }
});
