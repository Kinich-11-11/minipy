// ---- DBG522c: trace via dedicated DbgLog list (log %s buffers lines, unusable) ----
patch('DBG522c', () => {
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  B.addList(IT, 'DbgLog', []);
  global.insertAtProcStart = (defId, ids) => {
    const first = chain(ids.slice());
    const old = BL()[defId].next;
    BL()[defId].next = first; BL()[first].parent = defId;
    let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
    BL()[tail].next = old; if (old) BL()[old].parent = tail;
  };
  const insertAfterStmt2 = (targetId, ids) => {
    const first = chain(ids.slice());
    const nx = BL()[targetId].next;
    BL()[targetId].next = first; BL()[first].parent = targetId;
    let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
    BL()[tail].next = nx; if (nx) BL()[nx].parent = tail;
    return first;
  };
  // binerr entry
  insertAtProcStart(defIdOf('binerr'), [dlog([t('BINERR op='), VAR('beop'), t(' LT='), VAR('binLT'), t(' RT='), VAR('binRT')])]);
  // rightside entry
  insertAtProcStart(defIdOf('rightside %s %s %s %s %s'), [dlog([t('RS op='), argOf('op'), t(' lt='), argOf('lefttype'), t(' lv='), argOf('leftval'), t(' gself='), VAR('self'), t(' iid='), VAR('iid')])]);
  // callmeth: after the self assign, log global self
  const cmDef = defIdOf('callmeth %s %s %s %s');
  const assigns = [...reach(cmDef)].filter((id) => BL()[id].opcode === 'procedures_call' && BL()[id].mutation && String(BL()[id].mutation.proccode) === 'assign %s %s %s');
  if (assigns.length < 2) throw new Error('[DBG522c] callmeth assigns = ' + assigns.length);
  insertAfterStmt2(assigns[0], [dlog([t('CM inst='), argOf('inst'), t(' gself='), VAR('self')])]);
  // attribute read: iid = ev site in eval
  const attrIfs = find(inDef('eval %s %s'), (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'iid'
    && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][0] === 12 && b.inputs.VALUE[1][1] === 'ev');
  console.log('[DBG522c] iid=ev sites in eval: ' + attrIfs.length);
  for (const id of attrIfs) insertAfterStmt2(id, [dlog([t('ATTR iid='), VAR('iid'), t(' recvT='), VAR('evtype')])]);
  // scan match probe: inside the 3-token attr read's scan IF
  {
    const sets2 = find(inDef('eval %s %s'), (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'iid'
      && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][0] === 12 && b.inputs.VALUE[1][1] === 'ev');
    const q2 = BL()[sets2[0]];
    let c2 = q2.next, rep2 = null;
    while (c2) { if (BL()[c2].opcode === 'control_repeat_until') { rep2 = c2; break; } c2 = BL()[c2].next; }
    const bodyFirst2 = BL()[rep2].inputs.SUBSTACK[1];
    let c3 = bodyFirst2, matchIf = null;
    while (c3) { if (BL()[c3].opcode === 'control_if') { matchIf = c3; break; } c3 = BL()[c3].next; }
    const setCX = BL()[BL()[matchIf].inputs.SUBSTACK[1]].next ? BL()[BL()[matchIf].inputs.SUBSTACK[1]] : BL()[BL()[matchIf].inputs.SUBSTACK[1]];
    // find the 'set cX' inside matchIf body
    let c4 = BL()[matchIf].inputs.SUBSTACK[1], setcX = null;
    while (c4) { const q4 = BL()[c4]; if (q4.opcode === 'data_setvariableto' && q4.fields.VARIABLE[0] === 'cX') { setcX = c4; break; } c4 = q4.next; }
    insertAfterStmt2(setcX, [dlog([t('SCAN iid='), VAR('iid'), t(' name='), I('data_itemoflist', { fields: B.LISTF('IAttrName'), inputs: { INDEX: B.REP(VAR('cX'), [4, '0']) } }), t(' val='), I('data_itemoflist', { fields: B.LISTF('IAttrVal'), inputs: { INDEX: B.REP(VAR('cX'), [4, '0']) } })])]);
    console.log('[DBG522c] scan probe installed at ' + setcX);
  }
  // WRITE probe: log iid at the addtolist IAttrId site in execute
  {
    const ex = inDef('execute');
    const w = find(ex, (b) => b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'IAttrId'
      && b.inputs.ITEM && Array.isArray(b.inputs.ITEM[1]) && b.inputs.ITEM[1][0] === 12 && b.inputs.ITEM[1][1] === 'iid');
    console.log('[DBG522c] write sites: ' + w.length);
    for (const id of w) insertAfterStmt2(id, [dlog([t('WRITE row iid='), VAR('iid'), t(' llen=') , llen('IAttrId')])]);
    // CTOR probe: after setV(iid, llen(InstCls)+1) in callfn
    for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
      const cf = inDef(pc);
      const s2 = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'iid'
        && b.inputs.VALUE && typeof b.inputs.VALUE[1] === 'string' && BL()[b.inputs.VALUE[1]]
        && BL()[b.inputs.VALUE[1]].opcode === 'operator_add'
        && JSON.stringify(BL()[b.inputs.VALUE[1]]).includes('InstCls'));
      console.log('[DBG522c] ' + pc + ' ctor iid sets: ' + s2.length);
      for (const id of s2) insertAfterStmt2(id, [dlog([t('CTORIID='), VAR('iid'), t(' llenInstCls='), llen('InstCls'), t(' pcFrame='), VAR('fn')])]);
    }
  }
  // calluser entry + ctor branch probes
  {
    insertAtProcStart(defIdOf('calluser %s %s %s'), [dlog([t('CU fn='), argOf('fn'), t(' vmOn='), VAR('vmOn'), t(' vmA='), VAR('vmA'), t(' nUArg='), llen('UArgV')])]);
    for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
      const cf = inDef(pc);
      const s2 = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'iid'
        && b.inputs.VALUE && typeof b.inputs.VALUE[1] === 'string' && BL()[b.inputs.VALUE[1]]
        && BL()[b.inputs.VALUE[1]].opcode === 'operator_add');
      for (const id of s2) {
        // confirm the ADD references llen(InstCls) via its subtree
        const sub = [...reach(BL()[id].inputs.VALUE[1])].map((x) => JSON.stringify(BL()[x])).join('');
        if (!sub.includes('InstCls')) continue;
        insertAfterStmt2(id, [dlog([t('CTORIID='), VAR('iid'), t(' in='), argOf('fn')])]);
        console.log('[DBG522c] ctor probe at ' + pc);
      }
    }
  }
  // round trace
  {
    const b2 = inDef('builtin2b %s %s %s %s %s');
    // find 'set mrt' sites
    const mrt = find(b2, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'mrt');
    console.log('[DBG522c] set mrt sites: ' + mrt.length);
    for (const id of mrt) insertAfterStmt2(id, [dlog([t('MRT='), VAR('mrt'), t(' qpow='), VAR('qpow')])]);
    const rp = find(b2, (b) => b.opcode === 'procedures_call' && b.mutation && String(b.mutation.proccode).startsWith('roundpy'));
    for (const id of rp) insertAfterStmt2(id, [dlog([t('ROUNDPY->'), VAR('ev'), t(' evtype='), VAR('evtype')])]);
  }
  // narg trace at callfn entry region
  {
    for (const pc of ['callfn %s %s %s']) {
      const cf = inDef(pc);
      const ns = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'narg');
      console.log('[DBG522c] ' + pc + ' set narg sites: ' + ns.length);
      for (const id of ns) insertAfterStmt2(id, [dlog([t('NARG='), VAR('narg'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi'), t(' fn='), argOf('fn')])]);
    }
  }
  // ctor epilogue trace
  {
    for (const pc of ['callfn %s %s %s']) {
      const cf = inDef(pc);
      const evSets = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'ev'
        && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][1] === 'p31nid');
      console.log('[DBG522c] epilogue sites: ' + evSets.length);
      for (const id of evSets) insertBeforeStmt(id, [dlog([t('EPI p31nid='), VAR('p31nid'), t(' iid='), VAR('iid'), t(' InstClsLen='), llen('InstCls')])]);
      const nidSets = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'p31nid');
      for (const id of nidSets) insertAfterStmt2(id, [dlog([t('SAVENID='), VAR('p31nid')])]);
    }
  }
  console.log('[DBG522c] ok');
});
