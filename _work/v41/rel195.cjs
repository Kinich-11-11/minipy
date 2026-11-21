const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p195\s*=/.test(t)) console.log('already');
else {
  t = t.replace(/^(\$p194\s*=\s*'P461')/m, "$p195 = 'P462'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p195,' + b; });
  t = t.replace(/^(\s*'v4\.193'\s*=\s*")/m, "  'v4.194' = \"$p195\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.194\.sb3/g, 'MiniPy_v4.195.sb3').replace(/MiniPy v4\.194 - built [^']*/, "MiniPy v4.195 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log('p195:' + (t2.match(/\$p195\s*=\s*'P462'/) ? 'ok' : 'MISS') + ' v4.194entry:' + (t2.match(/'v4\.194'\s*=\s*"\$p195"/) ? 'ok' : 'MISS') + ' head:' + (h.match(/MiniPy_v4\.195\.sb3/) ? 'ok' : 'MISS'));