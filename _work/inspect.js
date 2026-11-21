'use strict';
// MiniPy 工程体检： node _work/inspect.js [project.json]
// 默认检查 _work/build/project.json（= MiniPy_v4.sb3 内的 project.json）
// 检查项：孤立积木 / parent 链 / 冗余变量列表 / 常量死分支 / 自制积木调用图 / 造型引用
const fs = require('fs');
const PATH = process.argv[2] || '_work/build/project.json';
const P = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const out = [];
const say = (s) => out.push(s);

// 遍历一个积木的所有输入里的字符串引用（= 子积木 id）
function eachInputRef(b, fn) {
  const w = (x) => {
    if (Array.isArray(x)) { for (const y of x) w(y); }
    else if (typeof x === 'string') fn(x);
    else if (x && typeof x === 'object') for (const k in x) w(x[k]);
  };
  w(b.inputs || {});
}
// 输入数组里的变量/列表引用：[12,name,id] / [13,name,id]
function eachVarRef(b, fn) {
  const w = (x) => {
    if (Array.isArray(x)) {
      if ((x[0] === 12 || x[0] === 13) && typeof x[2] === 'string') fn(x[0], x[1], x[2]);
      for (const y of x) w(y);
    } else if (x && typeof x === 'object') for (const k in x) w(x[k]);
  };
  w(b.inputs || {});
}
// 输入里的"原始字面量"：输入描述形如 [1,[4,"0"]] / [3,<block>,[10,"x"]] / [1,[10,"text"]]
// 变量/列表/广播（[12,..]/[13,..]/[11,..]）与积木引用一律返回 null
function primOf(x) {
  if (!Array.isArray(x)) return null;
  if (x[0] >= 4 && x[0] <= 8) return String(x[1]);
  if (x[0] === 10) return String(x[1]);
  if (Array.isArray(x[1])) return primOf(x[1]);
  return null;
}
// 只要字符串字面量（用于造型名之类的文本字段）
function strOf(x) {
  const v = primOf(x);
  if (v === null) return null;
  const inner = Array.isArray(x[1]) ? x[1] : x;
  return inner[0] === 10 ? v : null;
}

// ---- 全工程引用集合（全局变量声明在 Stage，但被别的角色引用）----
const usedVarIds = new Set(), usedListIds = new Set();
for (const t of P.targets) {
  for (const id in t.blocks) {
    const b = t.blocks[id];
    if (b.fields) {
      if (b.fields.VARIABLE) usedVarIds.add(b.fields.VARIABLE[1]);
      if (b.fields.LIST) usedListIds.add(b.fields.LIST[1]);
    }
    eachVarRef(b, (kind, name, id2) => (kind === 12 ? usedVarIds : usedListIds).add(id2));
  }
}

let totalBlocks = 0;
for (const t of P.targets) {
  const B = t.blocks;
  totalBlocks += Object.keys(B).length;

  // ---- 1) 可达性：从顶层积木出发 ----
  const seen = new Set(); const stack = [];
  for (const id in B) if (B[id].topLevel) stack.push(id);
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id) || !B[id]) continue;
    seen.add(id);
    if (typeof B[id].next === 'string') stack.push(B[id].next);
    eachInputRef(B[id], (r) => { if (B[r]) stack.push(r); });
  }
  const unreach = Object.keys(B).filter((id) => !seen.has(id));

  // ---- 2) parent 链 ----
  const referenced = new Set();
  for (const id in B) {
    const b = B[id];
    if (typeof b.next === 'string') referenced.add(b.next);
    eachInputRef(b, (r) => { if (B[r]) referenced.add(r); });
  }
  const badParent = Object.keys(B).filter((id) => {
    const b = B[id];
    if (b.topLevel) return false;
    if (b.parent === null || b.parent === undefined) return true;
    return !B[b.parent] || !referenced.has(id);
  });

  // ---- 3) 常量死分支（两侧都是字面量且不等）----
  const constConds = [];
  for (const id in B) {
    const b = B[id];
    if (!['control_if', 'control_if_else', 'control_repeat_until', 'control_wait_until'].includes(b.opcode)) continue;
    const c = b.inputs && b.inputs.CONDITION;
    const cb = c && typeof c[1] === 'string' ? B[c[1]] : null;
    if (!cb || cb.opcode !== 'operator_equals') continue;
    const a = primOf(cb.inputs.OPERAND1), d = primOf(cb.inputs.OPERAND2);
    if (a !== null && d !== null) {
      let n = 0, cur = b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null; const g = new Set();
      while (cur && B[cur] && !g.has(cur)) { g.add(cur); n++; cur = B[cur].next; }
      constConds.push(a + ' == ' + d + '  (守卫 ' + n + ' 块)');
      if (a === d) say('   [警告] 恒真分支 ' + id);
    }
  }

  // ---- 4) 自制积木调用图 ----
  const defs = {}, calls = {};
  for (const id in B) {
    const b = B[id];
    if (b.opcode === 'procedures_definition') {
      const pid = b.inputs.custom_block[1];
      const proto = B[typeof pid === 'string' ? pid : pid.id];
      (defs[proto.mutation.proccode] = defs[proto.mutation.proccode] || []).push(id);
    }
    if (b.opcode === 'procedures_call') calls[b.mutation.proccode] = (calls[b.mutation.proccode] || 0) + 1;
  }
  const dupDef = Object.keys(defs).filter((k) => defs[k].length > 1);
  const undef = Object.keys(calls).filter((k) => !defs[k]);
  const uncalled = Object.keys(defs).filter((k) => !calls[k]);
  const nonWarp = [];
  for (const id in B) {
    const b = B[id];
    if (b.opcode === 'procedures_definition') {
      const pid = b.inputs.custom_block[1];
      const proto = B[typeof pid === 'string' ? pid : pid.id];
      if (proto.mutation.warp !== 'true') nonWarp.push(proto.mutation.proccode);
    }
  }

  say('== ' + t.name + (t.isStage ? ' (stage)' : '') +
      '  blocks=' + Object.keys(B).length + '  costumes=' + t.costumes.length);
  if (unreach.length) say('   [可达性] 孤立积木 ' + unreach.length + ' 个（应删）');
  if (badParent.length) say('   [格式] parent 缺失/错误 ' + badParent.length + ' 个（编辑器/工具链隐患）');
  if (constConds.length) say('   [死分支] 常量条件 ' + constConds.length + ' 处: ' + constConds.join(' | '));
  if (dupDef.length) say('   [自制积木] 重复定义: ' + dupDef.join(', '));
  if (undef.length) say('   [自制积木] 调用未定义: ' + undef.join(', '));
  if (uncalled.length) say('   [死代码] 定义但从未调用: ' + uncalled.join(', '));
  if (nonWarp.length) say('   [性能] 未勾选"运行时不刷新屏幕"的积木: ' + nonWarp.join(', '));
  const unusedV = Object.keys(t.variables).filter((k) => !usedVarIds.has(k)).map((k) => t.variables[k][0]);
  const unusedL = Object.keys(t.lists).filter((k) => !usedListIds.has(k)).map((k) => t.lists[k][0]);
  if (unusedV.length) say('   [冗余变量] 全工程未被引用 (' + unusedV.length + '): ' + unusedV.join(', '));
  if (unusedL.length) say('   [冗余列表] 全工程未被引用 (' + unusedL.length + '): ' + unusedL.join(', '));
  // 造型引用只检查"写死的造型名字面量"
  const badC = [];
  for (const id in B) {
    const b = B[id];
    if (!['looks_switchcostumeto', 'looks_costume'].includes(b.opcode)) continue;
    const inp = b.inputs.COSTUME;
    const nm = inp ? strOf(inp) : null;
    if (nm && !t.costumes.some((x) => x.name === nm)) badC.push(nm);
  }
  if (badC.length) say('   [造型] 引用了不存在的造型: ' + badC.join(', '));
}
say('== 合计 blocks=' + totalBlocks + '，targets=' + P.targets.length);
console.log(out.join('\n'));
