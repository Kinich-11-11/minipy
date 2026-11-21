// shift the rebuild-old map so that v4.54 = +P127
const fs = require('fs');
const f = '_work/v41/rebuild-old.ps1';
let t = fs.readFileSync(f, 'utf8');
if (t.includes("$p54 = 'P127'")) throw new Error('already shifted');
if (!t.includes("$p53 = 'P126'")) throw new Error('p53 anchor missing');
t = t.replace("$p53 = 'P126'", "$p54 = 'P127'\n$p53 = 'P126'");
if (!t.includes("  'v4.53' = ''")) throw new Error('v4.53 entry missing');
t = t.replace("  'v4.53' = ''", "  'v4.54' = ''\n  'v4.53' = \"$p54\"");
t = t.replace(/^(  'v4\.(\d+)' = ")("?)/gm, (m, pre, n, q) => (Number(n) >= 54 ? m : pre + '$p54,' + q));
// comment line
t = t.replace("$p53 = 'P126'", "$p53 = 'P126'");
t = t.replace("//   v4.53 = +P126 (generator expressions; unpacking a generator)",
  "//   v4.54 = +P127 (super(), class attributes, multiple inheritance; helpers take their input\n//           through globals because a repeated custom-block call kept the previous argument;\n//           self.m() reaches the instance dispatch)\n//   v4.53 = +P126 (generator expressions; unpacking a generator)");
fs.writeFileSync(f, t);
const map = t.slice(t.indexOf("$map = [ordered]@"));
console.log(map.split('\n').slice(0, 8).join('\n'));
console.log('...');
console.log('written ' + t.length);
