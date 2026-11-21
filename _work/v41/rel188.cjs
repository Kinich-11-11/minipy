const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p188\s*=/.test(t)) console.log('already has $p188');
else {
  t = t.replace(/^(\$p187\s*=\s*'P419')/m, "$p188 = 'P422'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p188,' + b; });
  t = t.replace(/^(\s*'v4\.186'\s*=\s*")/m, "  'v4.187' = \"$p188\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.187\.sb3/g, 'MiniPy_v4.188.sb3').replace(/MiniPy v4\.187 - built [^']*/, "MiniPy v4.188 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log("p188 def: " + (t2.match(/\$p188\s*=\s*'P422'/) ? 'ok' : 'MISSING'));
console.log("v4.187 entry: " + (t2.match(/'v4\.187'\s*=\s*"\$p188"/) ? 'ok' : 'MISSING'));
console.log("v4.186 entry: " + (t2.match(/'v4\.186'\s*=\s*"\$p188,\$p187"/) ? 'ok' : 'MISSING'));
console.log('head OUT: ' + (h.match(/MiniPy_v4\.188\.sb3/) ? 'ok' : 'MISSING'));
