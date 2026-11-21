const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p193\s*=/.test(t)) console.log('already');
else {
  t = t.replace(/^(\$p192\s*=\s*'P437')/m, "$p193 = 'P449'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p193,' + b; });
  t = t.replace(/^(\s*'v4\.191'\s*=\s*")/m, "  'v4.192' = \"$p193\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.192\.sb3/g, 'MiniPy_v4.193.sb3').replace(/MiniPy v4\.192 - built [^']*/, "MiniPy v4.193 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log('p193:' + (t2.match(/\$p193\s*=\s*'P449'/) ? 'ok' : 'MISS') + ' v4.192entry:' + (t2.match(/'v4\.192'\s*=\s*"\$p193"/) ? 'ok' : 'MISS') + ' head:' + (h.match(/MiniPy_v4\.193\.sb3/) ? 'ok' : 'MISS'));