// bumpskip.cjs <rebuild-old.ps1> [varName] : prepend the new patch variable to every entry
// of the $map table (adding a patch means every earlier version must skip it as well)
const fs = require('fs');
const path = process.argv[2];
const pv = process.argv[3] || '$p132';
const lines = fs.readFileSync(path, 'utf8').replace(/\r/g, '').split('\n');
const start = lines.findIndex((l) => l.includes('$map = [ordered]@{'));
if (start < 0) throw new Error('map start not found');
let end = -1;
for (let i = start + 1; i < lines.length; i++) if (lines[i].trim() === '}') { end = i; break; }
if (end < 0) throw new Error('map end not found');
let n = 0;
for (let i = start + 1; i < end; i++) {
  const m = lines[i].match(/^(\s*'(v[\d.]+)' = )(.*)$/);
  if (!m) continue;
  const [, head, ver, val] = m;
  if (val === "''") lines[i] = head + '"' + pv + '"';
  else if (/^".*"$/.test(val)) lines[i] = head + '"' + pv + ',' + val.slice(1);
  else throw new Error('unexpected value for ' + ver + ': ' + val);
  n++;
}
fs.writeFileSync(path, lines.join('\n'));
console.log('rewrote ' + n + ' map entries (added ' + pv + ')');
