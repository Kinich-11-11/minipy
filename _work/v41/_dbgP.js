// ---- DBGP: probe the P542 spliced sites ----
patch('DBGP p542 sites', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  for (const pc of ['callfn %s %s %s']) {
    const cf = inDef(pc);
    // 我的 push：add(VStack) 其 ITEM 是 llen(InstCls)
    const pushes = find(cf, (b) => b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'VStack'
      && b.inputs.ITEM && typeof b.inputs.ITEM[1] === 'string'
      && (() => {
        const v = BL()[b.inputs.ITEM[1]];
        return v && v.opcode === 'data_lengthoflist' && v.fields.LIST && v.fields.LIST[0] === 'InstCls';
      })());
    console.log('[DBGP] push sites in ' + pc + ' = ' + pushes.length);
    for (const p of pushes) {
      insertAfterStmt2(p, [dlog([t('PUSH done nVStack='), llen('VStack'), t(' nid='), llen('InstCls')])]);
    }
    // 我的 pop：set iid = item(VStack, len) 且 next 是 delete VStack last —— clf 之后的那个
    const pops = find(cf, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'iid'
      && b.inputs.VALUE && typeof b.inputs.VALUE[1] === 'string'
      && (() => {
        const v = BL()[b.inputs.VALUE[1]];
        if (!v || v.opcode !== 'data_itemoflist' || !v.fields.LIST || v.fields.LIST[0] !== 'VStack') return false;
        const nx = b.next;
        return nx && BL()[nx].opcode === 'data_deleteoflist' && BL()[nx].fields.LIST[0] === 'VStack';
      })());
    console.log('[DBGP] pop sites in ' + pc + ' = ' + pops.length);
    for (const p of pops) {
      insertBeforeStmt(p, [dlog([t('POP pre nVStack='), llen('VStack')])]);
    }
  }
});
function insertAfterStmt2(targetId, ids) {
  const first = chain(ids.slice());
  const nx = BL()[targetId].next;
  BL()[targetId].next = first; BL()[first].parent = targetId;
  let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
  BL()[tail].next = nx; if (nx) BL()[nx].parent = tail;
  return first;
}
