// ---- DBG-M2c: trace inside augrp-if ----
patch('DBGM2c', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  const alDef = defIdOf('assignlist %s');
  // find the augrp-if (#10) in the def chain
  let cur = BL()[alDef].next, augrpIf = null, g = 0;
  while (cur && g++ < 60) {
    const b = BL()[cur];
    if (b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && JSON.stringify(BL()[b.inputs.CONDITION[1]]).includes('augrp')) { augrpIf = cur; break; }
    cur = b.next;
  }
  console.log('[DBGM2c] augrpIf=' + augrpIf);
  // walk ITS body chain
  let c2 = BL()[augrpIf].inputs.SUBSTACK[1];
  const stmts = [];
  while (c2) { stmts.push(BL()[c2].opcode); c2 = BL()[c2].next; }
  console.log('[DBGM2c] augrp body: ' + stmts.join(','));
  // instrument: after each control_if/control_if_else at this level, log a marker with AVal length
  let c3 = BL()[augrpIf].inputs.SUBSTACK[1];
  let idx = 0;
  while (c3) {
    const b = BL()[c3];
    const nx = b.next;
    if (b.opcode === 'control_if' || b.opcode === 'control_if_else') {
      insertBeforeStmt(nx || c3, [log([t('AFTER#' + idx + ' AComma='), llen('AComma'), t(' AVal='), llen('AVal'), t(' a1='), item('AVal', num(1)), t(' a2='), item('AVal', num(2))])]);
    }
    idx++;
    c3 = nx;
  }
  console.log('[DBGM2c] ok');
});
