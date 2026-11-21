const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.176.sb3 (newest)', 'MiniPy_v4.177.sb3 (newest)')
     .replace(/MiniPy_v4\.176\.sb3'/g, "MiniPy_v4.177.sb3'")
     .replace('MiniPy v4.176 - built', 'MiniPy v4.177 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p176 = 'P314'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.177 = +P315 (Tier-3 item 10 COMPLETE: mutable class attributes are shared).',
  '#           `class A: xs = []` then `a1.xs.append(1)` left `A.xs` and `a2.xs` EMPTY, because',
  '#           the in-place-mutation WRITE-BACK created a row under the instance, shadowing the',
  '#           class.  Two probes pinned it down: _cls2 showed reads DO fall back to the class',
  '#           (y3 fine) while mutations do not reach it (y1/y2), and PZ78 printed the exact',
  '#           state right before the write-back in `pathset`: `ev=[1] cls=[A] nm=[xs] t=[L]`',
  '#           -- i.e. ev IS the instance id and InstCls[ev] IS the class name, so writing the',
  '#           row under InstCls[ev] is the right thing to do.',
  '#           There are exactly TWO `aset` write-back sites (both found with the new',
  '#           _work/v41/dumpaset.cjs): one in `pathset %s %s %s %s` (args ev/w7nm/w7t/w7v) and',
  '#           one in `palwrite %s` (args Values[found], PtT[p10s], p10t, p10v).  Sites are',
  '#           identified by OWNER PROCEDURE -- matching on inner variable names fails because',
  '#           they sit inside nested data_itemoflist blocks.',
  '#           P315 adds an `attrfind ow nm` helper (row index or 0) and, before each write-back,',
  '#           saves the receiver into `a5rcv` FIRST -- this is essential, because `attrfind`',
  '#           returns through `ev` and would otherwise clobber the receiver (that was exactly',
  '#           why the previous attempt wrote rows nobody could read).  Then: if the instance has',
  '#           no row of its own but its class does, the write goes to the class row.',
  '#           Verified: _cls2 1/3 -> 3/3, _ca 4/6 -> 6/6, func 31/31, _oo 22/30 unchanged.)',
  "$p177 = 'P315'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
