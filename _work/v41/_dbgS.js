// ---- DBGS: probe error state right after objiter in P548 work ----
patch('DBGS objiter error', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  for (const pc of ['callfnW %s %s %s']) {
    const cf = inDef(pc);
    const calls = find(cf, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'objiter');
    console.log('[DBGS] objiter calls in callfnW = ' + calls.length);
    for (const c of calls) {
      spliceAfter(c, chain([dlog([t('OBJIT-DONE error='), VAR('error'), t(' evtype='), VAR('evtype'), t(' ev='), VAR('ev')])]));
    }
  }
});
