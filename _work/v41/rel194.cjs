const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p194\s*=/.test(t)) console.log('already');
else {
  t = t.replace(/^(\$p193\s*=\s*'P449')/m, "$p194 = 'P461'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p194,' + b; });
  t = t.replace(/^(\s*'v4\.192'\s*=\s*")/m, "  'v4.193' = \"$p194\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.193\.sb3/g, 'MiniPy_v4.194.sb3').replace(/MiniPy v4\.193 - built [^']*/, "MiniPy v4.194 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log('p194:' + (t2.match(/\$p194\s*=\s*'P461'/) ? 'ok' : 'MISS') + ' v4.193entry:' + (t2.match(/'v4\.193'\s*=\s*"\$p194"/) ? 'ok' : 'MISS') + ' head:' + (h.match(/MiniPy_v4\.194\.sb3/) ? 'ok' : 'MISS'));