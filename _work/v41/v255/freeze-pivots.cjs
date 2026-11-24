// Scratch's relational operators compare strings after JS toLowerCase(). Freeze the
// exceptions used by our monotone UTF-16 search so release builds need no ICU lookup.
const fs = require('node:fs'), path = require('node:path');
if (process.versions.unicode !== '16.0') throw Error('Use the Unicode 16.0 JS case database');
const codes = [];
for (let i = 0; i < 65536; i++) {
  const ch = String.fromCharCode(i);
  if (ch !== ch.toLowerCase()) codes.push(i);
}
const ranges = [];
for (let i = 0; i < codes.length;) {
  const first = codes[i++]; let last = first;
  const step = codes[i] - first;
  if (step <= 2) while (codes[i] === last + step) last = codes[i++];
  ranges.push([first, last, last === first ? 1 : step].join(' '));
}
fs.writeFileSync(path.join(__dirname, 'pivot-exceptions.txt'), ranges.join('\n') + '\n');
