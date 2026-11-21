// ---- P605: NaN 比较语义 + inf/nan 算术（覆盖报告 P1-3）----
//
// (1) 比较：rightside 的通用比较分支里，任一侧是 "nan"/"NaN"（N 型）时
//     cmp=2——对 ==/!=/</>/<=/>= 六种算子恰好给出 CPython 语义（==False、
//     !=True、其余全 False）。
// (2) 算术：Scratch Cast.toNumber("inf")=0、"nan"=0，inf-1e308 之类全变 0。
//     新过程 fltop：N-N 算术任一侧是 inf/-inf/nan 时按 CPython 语义给结果
//     （nan 传染；inf±inf 同号/异号；inf*0=nan；inf/x、x/inf；x%inf=x；
//     inf%x=nan）。挂点：rightside bigHook 之后（J 路径已 stop，不会到达）。
// 声明边界：单目负号对 inf（0-0=0）、负 inf 与负数的大小比较（字符串序）。
patch('P605 nan semantics', () => {
  newVar('fasg', 0);
  newVar('fbth', 0);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  // ---- fltop 过程 ----
  const d = newProc('fltop %s %s %s', ['op', 'a', 'b']);
  const A = argOf('a'), Bop = argOf('b'), OP = argOf('op');
  const eqs = (x, lit) => I('operator_equals', { inputs: { OPERAND1: B.REP(x, [10, '']), OPERAND2: txt(lit) } });
  const orE = (a, b) => I('operator_or', { inputs: { OPERAND1: [2, a], OPERAND2: [2, b] } });
  const isNan = (x) => orE(eqs(x, 'nan'), eqs(x, 'NaN'));
  const isInf = (x) => orE(eqs(x, 'inf'), eqs(x, '-inf'));
  const isNeg = (x) => eqs(letterOf(num(1), x), '-');
  const isZero = (x) => eqs(x, '0');
  const negbit = (x) => I('operator_and', { inputs: { OPERAND1: B.BOOL(isNeg(x)), OPERAND2: num(1) } });
  const setNan = () => [setV('ev', txt('nan')), setV('evtype', txt('N')), setV('evK', txt('')), STOP()];
  const setInf = (negExpr) => [
    setV('ev', txt('inf')),
    IF(negExpr, [setV('ev', txt('-inf'))]),
    setV('evtype', txt('N')),
    setV('evK', txt('')),
    STOP()
  ];
  attachBody(d.defId, [
    IF(orE(isNan(A), isNan(Bop)), setNan()),
    setV('fasg', I('operator_mod', { inputs: { NUM1: B.REP(I('operator_add', { inputs: { NUM1: B.REP(negbit(A), [4, '0']), NUM2: B.REP(negbit(Bop), [4, '0']) } }), [4, '0']), NUM2: num(2) } })),
    setV('fbth', I('operator_and', { inputs: { OPERAND1: B.BOOL(I('operator_and', { inputs: { OPERAND1: B.BOOL(isInf(A)), OPERAND2: B.BOOL(isInf(Bop)) } })), OPERAND2: num(1) } })),
    IF(EQ(OP, txt('+')), [
      IFELSE(VAR('fbth'), [
        IFELSE(I('operator_equals', { inputs: { OPERAND1: VAR('fasg'), OPERAND2: num(1) } }), setNan(), setInf(isNeg(A)))
      ], [
        IFELSE(isInf(A), setInf(isNeg(A)), setInf(isNeg(Bop)))
      ]),
      STOP()
    ]),
    IF(EQ(OP, txt('-')), [
      IFELSE(VAR('fbth'), [
        IFELSE(I('operator_equals', { inputs: { OPERAND1: VAR('fasg'), OPERAND2: num(1) } }), setNan(), setInf(isNeg(A)))
      ], [
        IFELSE(isInf(A), setInf(isNeg(A)), setInf(NOT(isNeg(Bop))))
      ]),
      STOP()
    ]),
    IF(EQ(OP, txt('*')), [
      IFELSE(orE(isZero(A), isZero(Bop)), setNan(), setInf(I('operator_equals', { inputs: { OPERAND1: VAR('fasg'), OPERAND2: num(1) } }))),
      STOP()
    ]),
    IF(orE(EQ(OP, txt('/')), EQ(OP, txt('//'))), [
      IFELSE(VAR('fbth'), setNan(), [
        IFELSE(isInf(A), setInf(isNeg(A)), [
          setV('ev', txt('0')),
          setV('evtype', txt('N')),
          setV('evK', txt('')),
          callProc('mkfloat %s', [VAR('ev')]),
          STOP()
        ])
      ]),
      STOP()
    ]),
    IF(EQ(OP, txt('%')), [
      IFELSE(isInf(A), setNan(), [
        setV('ev', A),
        setV('evtype', txt('N')),
        setV('evK', txt('')),
        STOP()
      ])
    ])
  ]);
  // ---- 挂点：rightside bigHook 之后 ----
  const rs = inDef('rightside %s %s %s %s %s');
  const bgCalls = find(rs, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'bgops %s %s %s %s %s');
  if (bgCalls.length !== 1) throw new Error('[P605] bgops call = ' + bgCalls.length);
  let hookIf = null;
  for (const id of rs) {
    const b = BL()[id];
    if (b.opcode === 'control_if' && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string'
      && [...reach(b.inputs.SUBSTACK[1])].includes(bgCalls[0])) { hookIf = id; break; }
  }
  if (!hookIf) throw new Error('[P605] bigHook if not found');
  if (!BL()[hookIf].next) throw new Error('[P605] bigHook has no next');
  const opin = orE(
    orE(orE(EQ(argOf('op'), txt('+')), orE(EQ(argOf('op'), txt('-')), orE(EQ(argOf('op'), txt('*')), EQ(argOf('op'), txt('/')))))),
    orE(EQ(argOf('op'), txt('//')), EQ(argOf('op'), txt('%'))));
  const isnanv = (x) => orE(eqs(x, 'nan'), eqs(x, 'NaN'));
  const isinfv = (x) => orE(orE(eqs(x, 'inf'), eqs(x, '-inf')), isnanv(x));
  const cond = I('operator_and', { inputs: {
    OPERAND1: [2, opin],
    OPERAND2: [2, I('operator_and', { inputs: {
      OPERAND1: [2, I('operator_and', { inputs: { OPERAND1: [2, eqs(VAR('lt2'), 'N')], OPERAND2: [2, eqs(VAR('evtype'), 'N')] })],
      OPERAND2: [2, orE(isinfv(argOf('leftval')), isinfv(VAR('ev')))] } })) } } });
  const fltopIf = IF(cond, [
    callProc('fltop %s %s %s', [argOf('op'), argOf('leftval'), VAR('ev')]),
    STOP()
  ]);
  insertBeforeStmt(BL()[hookIf].next, [fltopIf]);
  // ---- (1) 比较 cmp=2 ----
  const cmpSets = find(rs, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE
    && b.fields.VARIABLE[0] === 'cmp' && b.next
    && BL()[b.next].opcode === 'control_if'
    && BL()[b.next].inputs.CONDITION && typeof BL()[b.next].inputs.CONDITION[1] === 'string'
    && BL()[BL()[b.next].inputs.CONDITION[1]].opcode === 'operator_and'
    && JSON.stringify(BL()[b.next].inputs.CONDITION[1]).includes('"S"')
    && JSON.stringify(BL()[b.next].inputs.CONDITION[1]).includes('"lt2"')
    && JSON.stringify(BL()[b.next].inputs.CONDITION[1]).includes('"evtype"'));
  if (cmpSets.length !== 1) throw new Error('[P605] cmp=0 sites = ' + cmpSets.length);
  const nanchk = IF(I('operator_and', { inputs: {
    OPERAND1: [2, eqs(VAR('lt2'), 'N')],
    OPERAND2: [2, I('operator_and', { inputs: {
      OPERAND1: [2, eqs(VAR('evtype'), 'N')],
      OPERAND2: [2, orE(isnanv(argOf('leftval')), isnanv(VAR('ev')))] } })) } }), [
    setV('cmp', num(2))
  ]);
  spliceAfter(cmpSets[0], nanchk);
  console.log('[P605] nan semantics installed');
});
