// ---- DBGQ: ctor branch state ----
patch('DBGQ ctor', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const cf = inDef(pc);
    // set vmOn = 2 / set vmOn = 1 的两个预求值站点后各打一条
    const sites = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'vmOn'
      && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][0] === 4);
    for (const s of sites) {
      spliceAfter(s, chain([dlog([t('PREVAL fn='), argOf('fn'), t(' vmOn='), VAR('vmOn'), t(' vmA='), VAR('vmA'), t(' narg='), VAR('narg'), t(' p6bd='), VAR('p6bd'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi')])]));
    }
  }
});
