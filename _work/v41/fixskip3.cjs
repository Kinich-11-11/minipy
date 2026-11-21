// 修 skip 表：把 $p176/$p177/$p178 补进 v4.175 及更老的条目里（缺哪个补哪个）
const fs = require('fs');
const p = '_work/v41/rebuild-old.ps1';
let s = fs.readFileSync(p, 'utf8');
const MISSING = ['$p176', '$p177', '$p178'];
let n = 0;
s = s.replace(/^(\s*'v4\.(\d+)'\s*=\s*")([^"]*)(")/gm, (m, head, minor, body, tail) => {
  if (Number(minor) > 175) return m;
  const have = body.split(',').map((x) => x.trim());
  const add = MISSING.filter((v) => !have.includes(v));
  if (!add.length) return m;
  n++;
  return head + add.join(',') + ',' + body + tail;
});
fs.writeFileSync(p, s);
console.log('patched ' + n + ' entries');
