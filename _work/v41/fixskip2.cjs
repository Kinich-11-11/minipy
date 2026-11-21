// 一次性修补：把 $p172..$p175 补进"v4.165 及更老"那些跳过表条目里。
const fs = require('fs');
const p = '_work/v41/rebuild-old.ps1';
let s = fs.readFileSync(p, 'utf8');
const MISSING = ['$p172', '$p173', '$p174', '$p175'];
let n = 0;
s = s.replace(/^(\s*'v4\.(\d+)'\s*=\s*")([^"]*)(")/gm, (m, head, minor, body, tail) => {
  if (Number(minor) > 165) return m;            // v4.166 及更新的已经是对的
  const have = body.split(',').map((x) => x.trim());
  const add = MISSING.filter((v) => !have.includes(v));
  if (!add.length) return m;
  n++;
  return head + add.join(',') + ',' + body + tail;
});
fs.writeFileSync(p, s);
console.log('patched ' + n + ' entries (v4.165 and older)');
