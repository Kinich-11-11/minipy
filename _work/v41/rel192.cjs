const fs = require('fs');
const P = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(P, 'utf8');
if (/\$p192\s*=/.test(t)) console.log('already has $p192');
else {
  t = t.replace(/^(\$p191\s*=\s*'P427')/m, "$p192 = 'P437'\n$1");
  let n = 0;
  t = t.replace(/^(\s*'v[\d.]+'\s*=\s*")(\$)/gm, (m, a, b) => { n++; return a + '$p192,' + b; });
  t = t.replace(/^(\s*'v4\.190'\s*=\s*")/m, "  'v4.191' = \"$p192\"\n\n$1");
  fs.writeFileSync(P, t);
  console.log('entries updated=' + n);
}
const H = '_work/v41/head.txt';
let h = fs.readFileSync(H, 'utf8');
h = h.replace(/MiniPy_v4\.191\.sb3/g, 'MiniPy_v4.192.sb3').replace(/MiniPy v4\.191 - built [^']*/, "MiniPy v4.192 - built 2026-10-11");
fs.writeFileSync(H, h);
console.log("p192: " + (fs.readFileSync(P,'utf8').match(/\$p192\s*=\s*'P437'/) ? 'ok' : 'MISSING') + " v4.191entry: " + (fs.readFileSync(P,'utf8').match(/'v4\.191'\s*=\s*"\$p192"/) ? 'ok' : 'MISSING') + " head: " + (h.match(/MiniPy_v4\.192\.sb3/) ? 'ok' : 'MISSING'));