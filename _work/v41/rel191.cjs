const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p191\s*=/.test(t)) console.log('already has $p191');
else {
  t = t.replace(/^(\$p190\s*=\s*'P426')/m, "$p191 = 'P427'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p191,' + b; });
  t = t.replace(/^(\s*'v4\.189'\s*=\s*")/m, "  'v4.190' = \"$p191\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.190\.sb3/g, 'MiniPy_v4.191.sb3').replace(/MiniPy v4\.190 - built [^']*/, "MiniPy v4.191 - built 2026-10-11");
fs.writeFileSync(H, h);
const t2 = fs.readFileSync(P, 'utf8');
console.log("p191 def: " + (t2.match(/\$p191\s*=\s*'P427'/) ? 'ok' : 'MISSING'));
console.log("v4.190 entry: " + (t2.match(/'v4\.190'\s*=\s*"\$p191"/) ? 'ok' : 'MISSING'));
console.log("v4.189 entry: " + (t2.match(/'v4\.189'\s*=\s*"\$p191,\$p190"/) ? 'ok' : 'MISSING'));
console.log('head OUT: ' + (h.match(/MiniPy_v4\.191\.sb3/) ? 'ok' : 'MISSING'));
