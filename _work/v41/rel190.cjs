const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p190\s*=/.test(t)) console.log('already has $p190');
else {
  t = t.replace(/^(\$p189\s*=\s*'P424')/m, "$p190 = 'P426'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p190,' + b; });
  t = t.replace(/^(\s*'v4\.188'\s*=\s*")/m, "  'v4.189' = \"$p190\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.189\.sb3/g, 'MiniPy_v4.190.sb3').replace(/MiniPy v4\.189 - built [^']*/, "MiniPy v4.190 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log("p190 def: " + (t2.match(/\$p190\s*=\s*'P426'/) ? 'ok' : 'MISSING'));
console.log("v4.189 entry: " + (t2.match(/'v4\.189'\s*=\s*"\$p190"/) ? 'ok' : 'MISSING'));
console.log("v4.188 entry: " + (t2.match(/'v4\.188'\s*=\s*"\$p190,\$p189"/) ? 'ok' : 'MISSING'));
console.log('head OUT: ' + (h.match(/MiniPy_v4\.190\.sb3/) ? 'ok' : 'MISSING'));
