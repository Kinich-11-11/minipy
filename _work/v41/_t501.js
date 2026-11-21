function _t(h0,h1,h2,h3,h4,h5,h6,h7,h8,h9,h10,h11,h12,h13,h14,h15,h16,h17,h18,h19,h20,h21,h22,h23,h24,h25,h26,h27,h28,h29,h30,h31,h32,h33,h34,h35,h36,h37,h38,h39,h40,h41,h42,h43,h44,h45,h46,h47,h48,h49,h50,h51,h52,h53,h54,h55,h56,h57,h58,h59){// ---- P501: UnboundLocalError 产生侧（静态本地名集合） ----
//
// v4.202 实测 2 例：
//   * cov5 closure counter attempt without nonlocal：
//       def make_counter():
//           n = 0
//           def inc():
//               n = n + 1        # CPython: UnboundLocalError（赋值让 n 成为 inc 的本地）
//           return inc
//     MiniPy 把 n 从闭包快照读出来，输出 1 1。
//   * 补充 UnboundLocalError name exists：
//       def f(): print(x); x = 1  → MiniPy 报基类 NameError，CPython 报 UnboundLocalError。
//
// CPython 的规则是**静态**的：函数体内被赋值过的名字就是本地名，读它时若尚未绑定
// 则抛 UnboundLocalError: cannot access local variable 'x' where it is not associated
// with a value（消息逐字对齐）。补三块：
//   (1) regdef 末尾：对函数体逐行做一次文本级扫描（tokenize 期间保存/恢复 Tok/Kind/error，
//       不干扰 def 行的现场），收集"被赋值的名字"到 FnLocN（扁平表 + FnLocB/FnLocL 区间，
//       与 FnName 一一对应）；`global`/`nonlocal` 声明的名字进 FnXcN（排除集，P104/P499
//       的语义优先）。缩进状态机跳过嵌套 def/class 的函数体（那是内层作用域的名字）。
//       识别的绑定形态：`x =`、`x +=` 等增强赋值（含 **//<<>>&|^ 拆 token 形态）、
//       行首 `a, b =` 元组目标、嵌套 `def g`/`class C` 的名字。for/import/with-as/
//       except-as 由运行期 machinery 经 assign 落进 Names，无需静态登记。
//   (2) lookup：P383 闭包回退**之前**，若名字是当前函数（FnStack 顶）的严格本地名
//       （∈FnLoc 且 ∉FnXc，结果记 ubF），跳过闭包搜索——这是 cov5 那例的关键：
//       n 在外层快照里，不跳过就会把旧值读出来。
//   (3) atom：NameError 兜底 FAIL 处，ubF==1 时改抛 UnboundLocalError（消息逐字对齐
//       CPython 3.14）。UnboundLocalError ⊂ NameError（P491 已注册），两个用例的
//       except 都接得住。
//
// 已知近似（套件未覆盖）：`x: int = 5` 注解会误标 int（读内建不受影响）；`del x`、
// `import`、`with ... as f`、`except ... as e` 不产生静态本地（与运行期行为一致）；
// 单行 `def f(): x = 1` 的体扫不到（FnStart > FnEnd）。
patch('P501 unbound local', () => {
  for (const l of ['FnLocN', 'FnLocB', 'FnLocL', 'FnXcN', 'FnXcB', 'FnXcL', 'SavT', 'SavK']) B.addList(IT, l, []);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  const NV = ['ubF', 'ubJ', 'ubK', 'ubX', 'lcF', 'lcL', 'lcK', 'lcD', 'lcT', 'lcK2', 'lcM', 'lcR', 'lcS', 'lcN', 'lcP', 'lcDI'];
  for (const n of NV) if (taken.has(n)) throw new Error('[P501] variable name taken: ' + n);
  for (const v of NV) newVar(v, 0);
  const tokAt = (x) => item('Tok', x);
  const kindAt = (x) => item('Kind', x);
  const orAll = (xs) => xs.reduce((a, b) => (a === null ? b : OR(a, b)), null);
  const isBrOpen = (t) => orAll([txt('('), txt('['), txt('{')].map((s) => EQ(t, s)));
  const isBrClose = (t) => orAll([txt(')'), txt(']'), txt('}')].map((s) => EQ(t, s)));
  const augSingle = (t) => orAll([txt('+='), txt('-='), txt('*='), txt('/='), txt('%=')].map((s) => EQ(t, s)));
  const augSplit = (t) => orAll([txt('//'), txt('**'), txt('<<'), txt('>>'), txt('|'), txt('&'), txt('^')].map((s) => EQ(t, s)));
  const setAt = (list, idx, val) => I('data_replaceitemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(idx, [4, '0']), ITEM: B.REP(val, [4, '0']) } });

  // ---------- (1) regdef 末尾：静态扫描函数体 ----------
  const saveTok = [
    clearL('SavT'), clearL('SavK'),
    setV('lcR', num(1)),
    REPEATU(GT(VAR('lcR'), llen('Tok')), [addTo('SavT', item('Tok', VAR('lcR'))), chgV('lcR', num(1))]),
    setV('lcR', num(1)),
    REPEATU(GT(VAR('lcR'), llen('Kind')), [addTo('SavK', item('Kind', VAR('lcR'))), chgV('lcR', num(1))])
  ];
  const restoreTok = [
    clearL('Tok'), clearL('Kind'),
    setV('lcR', num(1)),
    REPEATU(GT(VAR('lcR'), llen('SavT')), [addTo('Tok', item('SavT', VAR('lcR'))), chgV('lcR', num(1))]),
    setV('lcR', num(1)),
    REPEATU(GT(VAR('lcR'), llen('SavK')), [addTo('Kind', item('SavK', VAR('lcR'))), chgV('lcR', num(1))]),
    setV('error', VAR('lcS'))
  ];
  // 一行里的 token 规则（Tok/Kind 已是新行）：global/nonlocal 进排除集，其余绑定形态进本地集
  const identRules = [
    IFELSE(AND(EQ(VAR('lcK2'), txt('I')), OR(EQ(VAR('lcT'), txt('global')), EQ(VAR('lcT'), txt('nonlocal')))), [
      setV('lcM', ADD(VAR('lcK'), num(1))),
      REPEATU(OR(GT(VAR('lcM'), llen('Tok')), EQ(tokAt(VAR('lcM')), txt(':'))), [
        IF(AND(EQ(kindAt(VAR('lcM')), txt('I')), AND(NOT(EQ(tokAt(VAR('lcM')), txt('global'))), NOT(EQ(tokAt(VAR('lcM')), txt('nonlocal'))))), [
          addTo('FnXcN', tokAt(VAR('lcM')))
        ]),
        chgV('lcM', num(1))
      ])
    ], [
      IF(EQ(VAR('lcK2'), txt('I')), [
        IFELSE(EQ(tokAt(ADD(VAR('lcK'), num(1))), txt('=')), [
          addTo('FnLocN', VAR('lcT'))
        ], [
          IFELSE(augSingle(tokAt(ADD(VAR('lcK'), num(1)))), [
            addTo('FnLocN', VAR('lcT'))
          ], [
            IF(AND(augSplit(tokAt(ADD(VAR('lcK'), num(1)))), EQ(tokAt(ADD(VAR('lcK'), num(2))), txt('='))), [
              addTo('FnLocN', VAR('lcT'))
            ])
          ])
        ]),
        IF(AND(EQ(VAR('lcK'), num(1)), EQ(tokAt(num(2)), txt(','))), [
          setV('lcM', num(1)),
          REPEATU(OR(GT(VAR('lcM'), llen('Tok')), NOT(OR(EQ(kindAt(VAR('lcM')), txt('I')), EQ(tokAt(VAR('lcM')), txt(','))))), [
            IF(EQ(kindAt(VAR('lcM')), txt('I')), [addTo('FnLocN', tokAt(VAR('lcM')))]),
            chgV('lcM', num(1))
          ])
        ])
      ])
    ])
  ];
  const scanLine = [
    callProc('tokenize %s', [item('Code', VAR('lcL'))]),
    IF(AND(EQ(VAR('error'), txt('')), GT(llen('Tok'), num(0))), [
      IFELSE(OR(EQ(tokAt(num(1)), txt('def')), EQ(tokAt(num(1)), txt('class'))), [
        setV('lcDI', VAR('lcN')),
        IF(EQ(kindAt(num(2)), txt('I')), [addTo('FnLocN', tokAt(num(2)))])
      ], [
        setV('lcD', num(0)),
        setV('lcK', num(1)),
        REPEATU(GT(VAR('lcK'), llen('Tok')), [
          setV('lcT', tokAt(VAR('lcK'))),
          setV('lcK2', kindAt(VAR('lcK'))),
          IFELSE(EQ(VAR('lcK2'), txt('S')), [], [
            IF(isBrOpen(VAR('lcT')), [chgV('lcD', num(1))]),
            IF(isBrClose(VAR('lcT')), [chgV('lcD', num(-1))]),
            IF(EQ(VAR('lcD'), num(0)), identRules)
          ]),
          chgV('lcK', num(1))
        ])
      ])
    ])
  ];
  const rd = defIdOf('regdef %s');
  let lastRd = BL()[rd].next;
  if (!lastRd) throw new Error('[P501] regdef body not found');
  while (BL()[lastRd].next) lastRd = BL()[lastRd].next;
  spliceAfter(lastRd, chain([
    setV('lcS', VAR('error')),
    ...saveTok,
    setV('lcF', llen('FnName')),
    addTo('FnLocB', ADD(llen('FnLocN'), num(1))),
    addTo('FnLocL', num(0)),
    addTo('FnXcB', ADD(llen('FnXcN'), num(1))),
    addTo('FnXcL', num(0)),
    setV('lcL', item('FnStart', VAR('lcF'))),
    setV('lcDI', num(999)),
    REPEATU(GT(VAR('lcL'), item('FnEnd', VAR('lcF'))), [
      // 原始行文本的前导空格数 -> lcN
      setV('lcN', num(0)),
      REPEATU(EQ(letterOf(ADD(VAR('lcN'), num(1)), item('Code', VAR('lcL'))), txt(' ')), [chgV('lcN', num(1))]),
      setV('lcP', num(0)),
      IF(NOT(EQ(VAR('lcDI'), num(999))), [
        IFELSE(GT(VAR('lcN'), VAR('lcDI')), [setV('lcP', num(1))], [setV('lcDI', num(999))])
      ]),
      IF(EQ(VAR('lcP'), num(0)), scanLine),
      chgV('lcL', num(1))
    ]),
    setAt('FnLocL', VAR('lcF'), ADD(SUB(llen('FnLocN'), item('FnLocB', VAR('lcF'))), num(1))),
    setAt('FnXcL', VAR('lcF'), ADD(SUB(llen('FnXcN'), item('FnXcB', VAR('lcF'))), num(1))),
    ...restoreTok
  ]));
  console.log('[P501] (1) regdef collects static local names');

  // ---------- (2) lookup：严格本地名跳过闭包回退（ubF 供 atom 使用） ----------
  const lk = defIdOf('lookup %s');
  const fnstkIf = find(reach(lk), (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && [...reach(b.inputs.CONDITION[1])].some((x) => BL()[x].opcode === 'data_lengthoflist' && BL()[x].fields.LIST && BL()[x].fields.LIST[0] === 'FnStack'));
  if (fnstkIf.length !== 1) throw new Error('[P501] lookup FnStack guard = ' + fnstkIf.length);
  const cloFiSet = BL()[fnstkIf[0]].inputs.SUBSTACK && BL()[fnstkIf[0]].inputs.SUBSTACK[1];
  if (!cloFiSet || BL()[cloFiSet].opcode !== 'data_setvariableto' || BL()[cloFiSet].fields.VARIABLE[0] !== 'cloFi') throw new Error('[P501] lookup cloFi set not found');
  const ubScan = [
    setV('ubF', num(0)),
    setV('ubJ', num(0)),
    IF(NOT(GT(VAR('cloFi'), llen('FnLocL'))), [
      setV('ubK', item('FnLocB', VAR('cloFi'))),
      REPEATU(OR(EQ(VAR('ubJ'), num(1)), GT(VAR('ubK'), ADD(item('FnLocB', VAR('cloFi')), SUB(item('FnLocL', VAR('cloFi')), num(1))))), [
        IF(EQ(item('FnLocN', VAR('ubK')), argOf('vn')), [setV('ubJ', num(1))]),
        chgV('ubK', num(1))
      ]),
      IF(EQ(VAR('ubJ'), num(1)), [
        setV('ubX', num(0)),
        setV('ubK', item('FnXcB', VAR('cloFi'))),
        REPEATU(OR(EQ(VAR('ubX'), num(1)), GT(VAR('ubK'), ADD(item('FnXcB', VAR('cloFi')), SUB(item('FnXcL', VAR('cloFi')), num(1))))), [
          IF(EQ(item('FnXcN', VAR('ubK')), argOf('vn')), [setV('ubX', num(1))]),
          chgV('ubK', num(1))
        ]),
        IF(EQ(VAR('ubX'), num(0)), [setV('ubF', num(1))])
      ])
    ])
  ];
  // 原本的闭包搜索守卫 `IF (!(cloFi > lenL(CloL)))` —— 严格本地名时不进
  const cloGuard = BL()[cloFiSet].next;
  if (!cloGuard || BL()[cloGuard].opcode !== 'control_if' || !BL()[cloGuard].inputs.CONDITION
    || typeof BL()[cloGuard].inputs.CONDITION[1] !== 'string'
    || BL()[BL()[cloGuard].inputs.CONDITION[1]].opcode !== 'operator_not') throw new Error('[P501] closure guard not found');
  spliceAfter(cloFiSet, chain(ubScan));
  const oldCond = BL()[cloGuard].inputs.CONDITION[1];
  replaceExpr(oldCond, () => AND(oldCond, EQ(VAR('ubF'), num(0))));
  console.log('[P501] (2) lookup skips the closure table for strict locals');

  // ---------- (3) atom：NameError 兜底处改抛 UnboundLocalError ----------
  const exprReach = (root) => {
    const seen = new Set();
    const st = [root];
    while (st.length) {
      const id = st.pop();
      if (!id || seen.has(id)) continue;
      const b = BL()[id];
      if (!b) continue;
      seen.add(id);
      for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    }
    return seen;
  };
  const atomSet = reach(defIdOf('atom %s'));
  const nmFail = find(atomSet, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...exprReach(Object.values(b.inputs)[0][1])].some((x) => {
      const s = JSON.stringify(BL()[x].inputs || {});
      return s.includes("' is not defined");
    }));
  if (nmFail.length !== 1) throw new Error('[P501] atom NameError fail = ' + nmFail.length);
  const failNext = BL()[nmFail[0]].next;
  BL()[nmFail[0]].next = null;
  const uleGuard = IFELSE(EQ(VAR('ubF'), num(1)), [
    FAILB(JOIN(JOIN(txt("UnboundLocalError: cannot access local variable '"), VAR('ev')), txt("' where it is not associated with a value")));
  ], [nmFail[0]]);
  replaceStmt(nmFail[0], uleGuard);
  BL()[uleGuard].next = failNext;
  if (failNext) BL()[failNext].parent = uleGuard;
  console.log('[P501] (3) atom raises UnboundLocalError for strict locals');

  // ---------- (4) 运行起点清表 ----------
  const runInit = find(allIds(), (b) => b.opcode === 'data_deletealloflist' && b.fields.LIST && b.fields.LIST[0] === 'LoopText');
  if (runInit.length !== 1) throw new Error('[P501] run init anchor = ' + runInit.length);
  insertBeforeStmt(runInit[0], [clearL('FnLocN'), clearL('FnLocB'), clearL('FnLocL'), clearL('FnXcN'), clearL('FnXcB'), clearL('FnXcL')]);
  console.log('[P501] unbound-local ready');
});

}
_t;
