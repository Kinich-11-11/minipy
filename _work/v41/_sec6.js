  // ---------- (6) 增强赋值 x += …：严格本地名未绑定时抛 UnboundLocalError ----------
  // 三个同构分支（//** 、&|^<<>> 、+= 家族）都是 lookup 后 found==0 才报 NameError；
  // 继承槽命中（found>0 但 < 帧基）时照样取旧值——CPython 里 n += 1 让 n 成为本地，
  // 读未绑定的本地名是 UnboundLocalError。把每个门包一层 ubR 检查。
  const augGates = find(inDef('execute'), (b) => b.opcode === 'control_if_else'
    && (() => {
      const c = b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string' ? BL()[b.inputs.CONDITION[1]] : null;
      if (!c || c.opcode !== 'operator_equals') return false;
      const gv = (d) => (Array.isArray(d) && d[0] === 12) ? d[1] : ((d && Array.isArray(d[1]) && d[1][0] === 12) ? d[1][1] : null);
      const isF = gv(c.inputs.OPERAND1) === 'found' || gv(c.inputs.OPERAND2) === 'found';
      const lit = gv(c.inputs.OPERAND1) === 'found' ? c.inputs.OPERAND2 : c.inputs.OPERAND1;
      const l0 = Array.isArray(lit) && Array.isArray(lit[1]) && lit[1][1] === '0';
      if (!isF || !l0) return false;
      const s1 = b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string' ? reach(b.inputs.SUBSTACK[1]) : new Set();
      const s2 = b.inputs.SUBSTACK2 && typeof b.inputs.SUBSTACK2[1] === 'string' ? reach(b.inputs.SUBSTACK2[1]) : new Set();
      const f1 = [...s1].some((x) => BL()[x].opcode === 'procedures_call' && BL()[x].mutation && BL()[x].mutation.proccode === 'fail %s');
      const r2 = [...s2].some((x) => BL()[x].opcode === 'procedures_call' && BL()[x].mutation && BL()[x].mutation.proccode === 'rightside %s %s %s %s %s');
      return f1 && r2;
    })());
  if (augGates.length !== 3) throw new Error('[P501] aug gates = ' + augGates.length);
  for (const gid of augGates) {
    const nx = BL()[gid].next;
    BL()[gid].next = null;
    const wrap = IFELSE(EQ(VAR('ubR'), num(1)), [
      FAILB(JOIN(JOIN(txt("UnboundLocalError: cannot access local variable '"), VAR('name')), txt("' where it is not associated with a value")))
    ], [gid]);
    replaceStmt(gid, wrap);
    BL()[wrap].next = nx;
    if (nx) BL()[nx].parent = wrap;
  }
  console.log('[P501] (6) augmented assignment raises UnboundLocalError for unbound strict locals');

