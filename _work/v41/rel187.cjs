const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p187\s*=/.test(t)) { console.log('already has $p187'); }
else {
  // 1) 新增 $p187 定义（放在 $p186 之前，保持"新在上"）
  t = t.replace(/^(\$p186\s*=\s*'P396')/m, "$p187 = 'P419'\n$1");
  // 2) 所有版本条目前置 $p187（累积跳过清单）
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p187,' + b; });
  // 3) 新增 'v4.186' 条目（= 只跳过 P419）
  t = t.replace(/^(\s*'v4\.185'\s*=\s*")/m, "  'v4.186' = \"$p187\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
// 4) head.txt 版本提升
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.186\.sb3/g, 'MiniPy_v4.187.sb3').replace(/MiniPy v4\.186 - built [^']*/, "MiniPy v4.187 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log('p187 def: ' + (t2.match(/\$p187\s*=\s*'P419'/) ? 'ok' : 'MISSING'));
console.log("v4.186 entry: " + (t2.match(/'v4\.186'\s*=\s*"\$p187"/) ? 'ok' : 'MISSING'));
console.log("v4.185 entry: " + (t2.match(/'v4\.185'\s*=\s*"\$p187,\$p186"/) ? 'ok' : 'MISSING'));
console.log('head OUT: ' + (h.match(/MiniPy_v4\.187\.sb3/) ? 'ok' : 'MISSING'));
