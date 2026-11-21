// ---- DBG553b v2: STR/MAT 探针 ----
patch('DBG553b', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  // 存储处
  {
    const pa = inDef('printargs');
    const stores = find(pa, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && (() => { const c = BL()[b.inputs.CONDITION[1]]; return c.opcode === 'operator_equals' && JSON.stringify(c.inputs).includes('prpass'); })());
    for (const s of stores) {
      spliceAfter(s, chain([
        dlog([t('STR pass='), F('prpass'), t(' pi='), F('pi'), t(' evt='), F('evtype'), t(' rrK='), F('rrK'), t(' rrI='), F('rrI'), t(' rrN='), F('rrN'), t(' nseg='), llen('SegV'), t(' segK='), item('SegK', llen('SegK')), t(' segR='), item('SegR', llen('SegR'))])
      ]));
    }
    console.log('[DBG553b] store probes: ' + stores.length);
  }
  // 物化处
  {
    const pa = inDef('printargs');
    const mats = find(pa, (b) => b.opcode === 'control_if_else' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && (() => { const c = BL()[b.inputs.CONDITION[1]]; return c.opcode === 'operator_equals' && JSON.stringify(c.inputs.OPERAND2).includes('"2"') && JSON.stringify(c.inputs).includes('prpass'); })());
    for (const m of mats) {
      const first = BL()[m].inputs.SUBSTACK[1];
      spliceAfter(first, chain([
        dlog([t('MAT pi='), F('pi'), t(' segK='), item('SegK', F('pi')), t(' segR='), item('SegR', F('pi')), t(' segN='), item('SegN', F('pi')), t(' nm='), item('Names', item('SegR', F('pi'))), t(' tp='), item('Types', item('SegR', F('pi'))), t(' st='), item('SegT', F('pi'))])
      ]));
    }
    console.log('[DBG553b] mat probes: ' + mats.length);
  }
  // kind-1 校验内部探针
  {
    const pa = inDef('printargs');
    const k1 = find(pa, (b) => b.opcode === 'control_if' && JSON.stringify(b.inputs).includes('prrv') && JSON.stringify(b.inputs).includes('rrI') && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1]==='string' && JSON.stringify(reach(b.inputs.SUBSTACK[1])).includes('SegK'));
    for (const k of k1) {
      spliceAfter(k, chain([
        dlog([t('K1 rrI='), F('rrI'), t(' val=['), item('Values', F('rrI')), t('] prrv=['), F('prrv'), t('] segK='), item('SegK', llen('SegK'))])
      ]));
    }
    console.log('[DBG553b] k1 probes: ' + k1.length);
  }
  // store 内部探针（prstore=1 之后）
  {
    const pa = inDef('printargs');
    const marks = find(pa, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'prstore' && b.inputs.VALUE && Array.isArray(b.inputs.VALUE[1]) && b.inputs.VALUE[1][1] === '1');
    for (const m of marks) {
      spliceAfter(m, chain([
        dlog([t('IN rrI='), F('rrI'), t(' V='), item('Values', F('rrI')), t(' P='), F('prrv'), t(' K='), F('rrK')])
      ]));
    }
    console.log('[DBG553b] in probes: ' + marks.length);
  }
  console.log('[DBG553b] ok');
});
