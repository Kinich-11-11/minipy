const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p189\s*=/.test(t)) console.log('already has $p189');
else {
  t = t.replace(/^(\$p188\s*=\s*'P422')/m, "$p189 = 'P424'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p189,' + b; });
  t = t.replace(/^(\s*'v4\.187'\s*=\s*")/m, "  'v4.188' = \"$p189\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.188\.sb3/g, 'MiniPy_v4.189.sb3').replace(/MiniPy v4\.188 - built [^']*/, "MiniPy v4.189 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log("p189 def: " + (t2.match(/\$p189\s*=\s*'P424'/) ? 'ok' : 'MISSING'));
console.log("v4.188 entry: " + (t2.match(/'v4\.188'\s*=\s*"\$p189"/) ? 'ok' : 'MISSING'));
console.log("v4.187 entry: " + (t2.match(/'v4\.187'\s*=\s*"\$p189,\$p188"/) ? 'ok' : 'MISSING'));
console.log('head OUT: ' + (h.match(/MiniPy_v4\.189\.sb3/) ? 'ok' : 'MISSING'));
