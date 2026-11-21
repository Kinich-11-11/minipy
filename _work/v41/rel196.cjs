const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p196\s*=/.test(t)) console.log('already');
else {
  t = t.replace(/^(\$p195\s*=\s*'P462')/m, "$p196 = 'P465'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p196,' + b; });
  t = t.replace(/^(\s*'v4\.194'\s*=\s*")/m, "  'v4.195' = \"$p196\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.195\.sb3/g, 'MiniPy_v4.196.sb3').replace(/MiniPy v4\.195 - built [^']*/, "MiniPy v4.196 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log('p196:' + (t2.match(/\$p196\s*=\s*'P465'/) ? 'ok' : 'MISS') + ' v4.195entry:' + (t2.match(/'v4\.195'\s*=\s*"\$p196"/) ? 'ok' : 'MISS') + ' head:' + (h.match(/MiniPy_v4\.196\.sb3/) ? 'ok' : 'MISS'));