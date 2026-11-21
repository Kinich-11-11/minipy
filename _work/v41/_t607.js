// ---- P607: input() 无参形式（覆盖报告 P2-12）----
//
// input('n? ') 已有实现（callfn/callfnW 的 input 分支：status→Waiting、ask、
// ev=answer），但 callfn 开头的通用实参求值对空实参报 SyntaxError: missing
// expression，x = input() 直接炸。修法：callfn/callfnW 开头加零参特判——
// ask 空串、ev=answer、evtype=S、pending=1、stop。
// 配套：run_iso.mjs 的 ANSWER 发射在 ask 入队前可能丢失（sensing 的 ANSWER
// 监听是构造期常驻，先发的 ANSWER 只设 _answer 不 resolve 队列），harness
// 侧在仍 Waiting 时补发同值。
patch('P607 input zero arg', () => {
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  let fixed = 0;
  for (const proc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const defId = defIdOf(proc);
    const bodyHead = BL()[defId].next;
    if (!bodyHead) throw new Error('[P607] ' + proc + ' empty body');
    const zeroAsk = I('operator_and', { inputs: {
      OPERAND1: [2, I('operator_equals', { inputs: { OPERAND1: B.REP(argOf('fn'), [10, '']), OPERAND2: txt('input') } })],
      OPERAND2: [2, I('operator_gt', { inputs: { NUM1: B.REP(argOf('lo'), [4, '0']), NUM2: B.REP(argOf('hi'), [4, '0']) } })] } } });
    const askBlk = I('sensing_askandwait', { inputs: { QUESTION: txt('') } });
    const body = [
      setV('status', txt('Waiting for input')),
      setV('dirty', num(1)),
      askBlk,
      setV('ev', I('sensing_answer', {})),
      setV('evK', txt('')),
      callProc('checkASCII %s', [VAR('ev')]),
      setV('evtype', txt('S')),
      setV('status', txt('Running')),
      setV('pending', num(1)),
      STOP()
    ];
    const ifBlk = IF(zeroAsk, body);
    insertBeforeStmt(bodyHead, [ifBlk]);
    fixed++;
  }
  if (fixed !== 2) throw new Error('[P607] fixed = ' + fixed);
  console.log('[P607] input() zero-arg installed');
});
