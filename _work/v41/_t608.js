// ---- P608: 切片副本不再参与别名传播（覆盖报告 P1-7）----
//
// `x = a[:]` / `x = a.copy()` 由 cpyrec 记 CpyN/CpyT 之外还建 AliasN/AliasT
// 对（copy-on-write 绑定，写经副本时 cpybreak 解绑）。但 assign 的容器传播
// 沿别名对整值复制——经第三个别名（b = a; b.append）或直接对源的传播都会
// 把副本一起改掉（s2/s4/s9 失败）。
// 修法：新过程 iscpy(x,y) 查 CpyN/CpyT 双向；assign 传播循环里，目标是副本
// 对时跳过递归 assign（副本保持自己的值）。写经副本仍由 cpybreak 解绑，
// 语义不变；对 P552 的 tuple 副本同理更符合 Python（副本独立）。
patch('P608 slice copy alias', () => {
  newVar('icv', 0);
  newVar('ci', 0);
  // ---- iscpy 过程 ----
  const d = newProc('iscpy %s %s', ['x', 'y']);
  attachBody(d.defId, [
    setV('icv', num(0)),
    setV('ci', num(1)),
    REPEATU(GT(VAR('ci'), llen('CpyN')), [
      IF(I('operator_or', { inputs: {
        OPERAND1: [2, I('operator_and', { inputs: { OPERAND1: [2, I('operator_equals', { inputs: { OPERAND1: item('CpyN', VAR('ci')), OPERAND2: B.REP(argOf('x'), [10, '']) } })], OPERAND2: [2, I('operator_equals', { inputs: { OPERAND1: item('CpyT', VAR('ci')), OPERAND2: B.REP(argOf('y'), [10, '']) } })] } })],
        OPERAND2: [2, I('operator_and', { inputs: { OPERAND1: [2, I('operator_equals', { inputs: { OPERAND1: item('CpyN', VAR('ci')), OPERAND2: B.REP(argOf('y'), [10, '']) } })], OPERAND2: [2, I('operator_equals', { inputs: { OPERAND1: item('CpyT', VAR('ci')), OPERAND2: B.REP(argOf('x'), [10, '']) } })] } })] } })), [
        setV('icv', num(1))
      ]),
      chgV('ci', num(1))
    ])
  ]);
  // ---- assign 传播循环包 iscpy 守卫 ----
  const as = inDef('assign %s %s %s');
  const recCalls = find(as, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'assign %s %s %s');
  if (recCalls.length !== 1) throw new Error('[P608] recursive assign = ' + recCalls.length);
  const rec = recCalls[0];
  // 前驱：append(VStack, aln)；再前驱：append(VStack, ali)
  const predOf = (id) => { for (const pid of allIds()) if (BL()[pid].next === id) return pid; return null; };
  const appAln = predOf(rec);
  const appAli = appAln ? predOf(appAln) : null;
  if (!appAln || !appAli) throw new Error('[P608] VStack appends not found');
  if (!(BL()[appAli].opcode === 'data_addtolist' && BL()[appAli].fields.LIST[0] === 'VStack')) throw new Error('[P608] appAli is ' + BL()[appAli].opcode);
  // 尾部：rec 之后到 VStack 清空为止（set aln, del, set ali, del）
  const seg = [appAli, appAln, rec];
  let cur = rec;
  for (let i = 0; i < 6; i++) {
    cur = BL()[cur].next;
    if (!cur) break;
    seg.push(cur);
    if (BL()[cur].opcode === 'data_deleteoflist') {
      // 两个 del：第二个 del 后结束
      const nxt = BL()[cur].next;
      if (nxt && BL()[nxt].opcode === 'data_deleteoflist') { seg.push(nxt); cur = nxt; break; }
    }
  }
  if (seg.length < 6) throw new Error('[P608] propagation segment = ' + seg.length);
  // 断开段尾
  const segTailNext = BL()[seg[seg.length - 1]].next;
  BL()[seg[0]].next = seg[1]; // 已然
  BL()[seg[seg.length - 1]].next = null;
  // 守卫 IF 包住整段，接回链
  const guard = IF(NOT(callProc('iscpy %s %s', [VAR('vn'), VAR('alT')])), seg);
  BL()[guard].next = segTailNext || null;
  if (segTailNext) BL()[segTailNext].parent = guard;
  BL()[appAli].parent = guard;
  // appAli 的前驱接到 guard
  const appAliPred = predOf(appAli);
  if (!appAliPred) throw new Error('[P608] appAli pred not found');
  BL()[appAliPred].next = guard;
  BL()[guard].parent = appAliPred;
  console.log('[P608] slice-copy alias skip installed');
});
