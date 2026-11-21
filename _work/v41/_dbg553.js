// ---- DBG553: 探针 P553 的捕获/存储/物化 ----
patch('DBG553', () => {
  const F = (v) => VAR(v);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const t = (s) => txt(s);
  B.addList(IT, 'Dbg553', []);
  const dlog = (parts) => addTo('Dbg553', parts.reduce((a, b) => JOIN(a, b)));

  // (1) return 端捕获之后：rrK/rrI/rrN/evtype/found/FrBase顶
  {
    const ex = inDef('execute');
    const cap = find(ex, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'rrK'
      && b.next && BL()[b.next].opcode === 'control_if');
    if (cap.length !== 1) throw new Error('[DBG553] capture head not found: ' + cap.length);
    spliceAfter(BL()[cap[0]].next ? BL()[cap[0]].next : cap[0], chain([
      IF(EQ(F('head'), t('return')), [
        dlog([t('CAP head=ret count='), F('count'), t(' k2='), item('Kind', num(2)), t(' rrK='), F('rrK'), t(' rrI='), F('rrI'), t(' rrN='), F('rrN'), t(' evt='), F('evtype'), t(' fnd='), F('found'), t(' fb='), item('FrBase', llen('FrBase')), t(' dwrc='), item('DefWrC', llen('DefWrC'))])
      ])
    ]));
  }
  // (2) printargs 存储之后：每段
  {
    const pa = inDef('printargs');
    const rep = find(pa, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && JSON.stringify(BL()[b.inputs.CONDITION[1]].inputs || {}).includes('prpass'));
    if (rep.length !== 1) throw new Error('[DBG553] two-pass loop not found: ' + rep.length);
    // 在 pi++ 后面插日志（链尾是 passSwitch，之前是 pi++）——直接挂在 REPEATU 体的 segIf 后面的 store 之后：
    // 简化：在 plo-set 之前不行（store 在 segIf 后）——挂在循环体链尾 passSwitch 之前
    let cur = BL()[rep[0]].inputs.SUBSTACK[1];
    let prev = null;
    while (BL()[cur].next) { prev = cur; cur = BL()[cur].next; }
    insertBeforeStmt(cur, [
      dlog([t('SEG pi='), F('pi'), t(' pass='), F('prpass'), t(' ev=['), F('ev'), t('] evt='), F('evtype'), t(' rrK='), F('rrK'), t(' segK='), item('SegK', llen('SegK')), t(' segR='), item('SegR', llen('SegR')), t(' segN=['), item('SegN', llen('SegN')), t('] nseg='), llen('SegV')])
    ]);
  }
  // (3) 物化分支：pass 2 读取时
  {
    const pa = inDef('printargs');
    const matIf = find(pa, (b) => b.opcode === 'control_if_else' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && (() => { const c = BL()[b.inputs.CONDITION[1]]; return c.opcode === 'operator_equals' && JSON.stringify(c.inputs).includes('prpass') && JSON.stringify(c.inputs).includes('2'); })());
    for (const m of matIf) {
      const first = BL()[m].inputs.SUBSTACK[1];
      insertBeforeStmt(first, [
        dlog([t('MAT pi='), F('pi'), t(' segK='), item('SegK', F('pi')), t(' segR='), item('SegR', F('pi')), t(' segN=['), item('SegN', F('pi')), t('] segT='), item('SegT', F('pi')), t(' namesN='), item('Names', item('SegR', F('pi'))), t(' typesN='), item('Types', item('SegR', F('pi')))])
      ]);
    }
    console.log('[DBG553] mat probes at ' + matIf.length + ' sites');
  }
  console.log('[DBG553] probes installed');
});
