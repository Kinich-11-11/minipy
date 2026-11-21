// p351 = p350 去掉探针 + 把第二段的函数值改成直接用 ev（而不是 FnName[ev]）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p350.txt', 'utf8');
// 1) 去探针与辅助
s = s.split('\n').filter((l) => {
  if (/LOGX\(JX\(txt\('(CHAIN-IN|SITE seen)/.test(l)) return false;
  if (l.trim().startsWith('const LOGX')) return false;
  if (l.trim().startsWith('const JX')) return false;
  return true;
}).join('\n');
// 2) 第二段的函数值用 ev
const from = "          setV('p345fn', item('FnName', VAR('ev'))),";
const to = "          setV('p345fn', VAR('ev')),";
if (!s.includes(from)) { console.log('MISS fn line'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P350').join('P351');
fs.writeFileSync('_work/v41/p351.txt', s);
console.log('wrote p351.txt (no (D), probes removed, uses ev)');
